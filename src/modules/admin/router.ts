import { Router } from 'express';
import {
  mockStore,
  RouteFareHistoryUnavailableError,
  TemplateVersionConflictError
} from '../../core/mock/store';
import {
  PackageTemplateUpsertRequest,
  RouteFareUpsertRequest
} from '../../types/domain';
import { logger } from '../../utils/logger';

const router = Router();

const isValidEntitlement = (entitlement: any): boolean => {
  if (!entitlement || typeof entitlement !== 'object') return false;
  if (typeof entitlement.function_code !== 'string' || entitlement.function_code.trim().length === 0) return false;
  if (typeof entitlement.label !== 'string' || entitlement.label.trim().length === 0) return false;
  if (typeof entitlement.quantity !== 'number' || entitlement.quantity <= 0) return false;
  if (!['mobile', 'operator', 'self_service'].includes(entitlement.redemption_channel)) return false;
  if (typeof entitlement.requires_id_verification !== 'boolean') return false;
  if (!['absolute', 'relative'].includes(entitlement.validity_type)) return false;
  return true;
};

const isValidPricingTier = (tier: any): boolean => {
  if (!tier || typeof tier !== 'object') return false;
  if (typeof tier.tier_id !== 'string' || tier.tier_id.trim().length === 0) return false;
  if (typeof tier.name !== 'string' || tier.name.trim().length === 0) return false;
  if (!Array.isArray(tier.customer_types) || tier.customer_types.length === 0) return false;
  if (!tier.customer_types.every((type: string) => ['adult', 'child', 'elderly'].includes(type))) return false;
  if (typeof tier.price !== 'number' || tier.price < 0) return false;
  if (typeof tier.currency !== 'string' || tier.currency.trim().length === 0) return false;
  return true;
};

const validateTemplatePayload = (payload: any): payload is PackageTemplateUpsertRequest => {
  if (!payload || typeof payload !== 'object') return false;
  if (typeof payload.name !== 'string' || payload.name.trim().length === 0) return false;
  if (!Array.isArray(payload.entitlements) || payload.entitlements.length === 0) return false;
  if (!payload.entitlements.every(isValidEntitlement)) return false;
  if (!payload.pricing || typeof payload.pricing.currency !== 'string' || payload.pricing.currency.trim().length === 0) return false;
  if (!Array.isArray(payload.pricing.tiers) || payload.pricing.tiers.length === 0) return false;
  if (!payload.pricing.tiers.every(isValidPricingTier)) return false;
  if (payload.status && !['draft', 'active', 'archived'].includes(payload.status)) return false;
  return true;
};

router.post('/packages/templates', (req, res) => {
  if (!validateTemplatePayload(req.body)) {
    return res.status(400).json({
      code: 'INVALID_TEMPLATE_PAYLOAD',
      message: 'name, entitlements and pricing tiers are required'
    });
  }

  try {
    const { record, created, idempotent } = mockStore.upsertPackageTemplate(req.body);
    const statusCode = created ? 201 : 200;
    return res.status(statusCode).json({
      templateId: record.templateId,
      version: record.version,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      idempotent
    });
  } catch (error) {
    if (error instanceof TemplateVersionConflictError) {
      logger.warn('admin.templates.version_conflict', { message: error.message });
      return res.status(409).json({
        code: 'TEMPLATE_VERSION_CONFLICT',
        message: error.message
      });
    }

    logger.error('admin.templates.upsert_failed', { error: String(error) });
    return res.status(500).json({
      code: 'TEMPLATE_UPSERT_FAILED',
      message: 'Failed to upsert package template'
    });
  }
});

const normaliseRouteFarePayload = (routeCodeParam: string | undefined, payload: any): RouteFareUpsertRequest | null => {
  const routeCode = (routeCodeParam || payload?.routeCode || '').toString().trim();
  const fares = payload?.fares;

  if (!routeCode) {
    return null;
  }
  if (!Array.isArray(fares) || fares.length === 0) {
    return null;
  }
  if (!fares.every((fare: any) => typeof fare === 'object' && ['adult', 'child', 'elderly'].includes(fare.passenger_type) && typeof fare.price === 'number' && fare.price >= 0 && typeof fare.currency === 'string')) {
    return null;
  }

  return {
    routeCode,
    fares,
    lockMinutes: payload?.lockMinutes,
    blackoutDates: payload?.blackoutDates
  };
};

router.put('/routes/fares/:routeCode', (req, res) => {
  const payload = normaliseRouteFarePayload(req.params.routeCode, req.body);

  if (!payload) {
    return res.status(400).json({
      code: 'INVALID_ROUTE_FARE_PAYLOAD',
      message: 'routeCode and fares are required'
    });
  }

  try {
    const config = mockStore.upsertRouteFare(payload);
    return res.status(200).json(config);
  } catch (error) {
    logger.error('admin.routes.fares_failed', {
      routeCode: payload.routeCode,
      error: String(error)
    });
    return res.status(500).json({
      code: 'ROUTE_FARES_UPDATE_FAILED',
      message: 'Failed to update route fares'
    });
  }
});

router.get('/packages/templates', (_req, res) => {
  const templates = mockStore.listPackageTemplates();
  res.status(200).json({
    templates
  });
});

router.get('/packages/templates/:templateId/versions', (req, res) => {
  const templateId = req.params.templateId?.toString().trim();
  if (!templateId) {
    return res.status(400).json({
      code: 'TEMPLATE_ID_REQUIRED',
      message: 'templateId path parameter is required'
    });
  }

  const history = mockStore.listPackageTemplateHistory(templateId);
  if (!history) {
    return res.status(404).json({
      code: 'TEMPLATE_NOT_FOUND',
      message: 'Template not found'
    });
  }

  return res.status(200).json(history);
});

router.get('/packages/templates/:templateId', (req, res) => {
  const templateId = req.params.templateId?.toString().trim();
  const version = req.query.version?.toString().trim();

  if (!templateId) {
    return res.status(400).json({
      code: 'TEMPLATE_ID_REQUIRED',
      message: 'templateId path parameter is required'
    });
  }

  const template = mockStore.getPackageTemplate(templateId, version);
  if (!template) {
    return res.status(404).json({
      code: 'TEMPLATE_NOT_FOUND',
      message: 'Template not found'
    });
  }

  return res.status(200).json({ template });
});

router.get('/routes/fares/:routeCode', (req, res) => {
  const routeCode = req.params.routeCode?.toString().trim();
  if (!routeCode) {
    return res.status(400).json({
      code: 'ROUTE_CODE_REQUIRED',
      message: 'routeCode path parameter is required'
    });
  }

  const config = mockStore.getRouteFare(routeCode);
  if (!config) {
    return res.status(404).json({
      code: 'ROUTE_FARES_NOT_FOUND',
      message: 'Route fares not found'
    });
  }

  res.status(200).json(config);
});

router.get('/routes/fares/:routeCode/history', (req, res) => {
  const routeCode = req.params.routeCode?.toString().trim();
  if (!routeCode) {
    return res.status(400).json({
      code: 'ROUTE_CODE_REQUIRED',
      message: 'routeCode path parameter is required'
    });
  }

  const history = mockStore.listRouteFareHistory(routeCode);
  if (!history) {
    return res.status(404).json({
      code: 'ROUTE_FARES_NOT_FOUND',
      message: 'Route fares history not found'
    });
  }

  return res.status(200).json(history);
});

router.post('/routes/fares/:routeCode/restore', (req, res) => {
  const routeCode = req.params.routeCode?.toString().trim();
  if (!routeCode) {
    return res.status(400).json({
      code: 'ROUTE_CODE_REQUIRED',
      message: 'routeCode path parameter is required'
    });
  }

  try {
    const restored = mockStore.restorePreviousRouteFare(routeCode);
    return res.status(200).json(restored);
  } catch (error) {
    if (error instanceof RouteFareHistoryUnavailableError) {
      logger.warn('admin.routes.restore_conflict', { routeCode, message: error.message });
      return res.status(409).json({
        code: 'ROUTE_FARE_NO_HISTORY',
        message: error.message
      });
    }

    logger.error('admin.routes.restore_failed', { routeCode, error: String(error) });
    return res.status(500).json({
      code: 'ROUTE_FARES_RESTORE_FAILED',
      message: 'Failed to restore previous route fares'
    });
  }
});

export default router;

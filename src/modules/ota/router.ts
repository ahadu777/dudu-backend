import { Router, Request, Response } from 'express';
import { otaAuthMiddleware, adminAuthMiddleware } from '../../middlewares/otaAuth';
import { otaService } from './service';
import { logger } from '../../utils/logger';

const router = Router();

// Apply OTA authentication to all routes
router.use(otaAuthMiddleware());

// Use the same interface as the middleware
interface AuthenticatedRequest extends Request {
  ota_partner?: {
    id: string;
    name: string;
    permissions: string[];
  };
}

/**
 * Extract partner ID with fallback logic
 * 1. Primary: Use partner ID from middleware (req.ota_partner.id)
 * 2. Fallback: Default to 'ota' if middleware didn't set partner info
 *
 * The middleware should always set req.ota_partner.id after successful authentication.
 * If it's not set, that indicates an issue with the middleware or authentication.
 */
function getPartnerIdWithFallback(req: AuthenticatedRequest): string {
  // Primary: Use partner ID from middleware
  if (req.ota_partner?.id) {
    return req.ota_partner.id;
  }

  // Log when fallback is used - this indicates a middleware issue
  logger.warn('ota.partner_id.fallback_to_ota', {
    has_ota_partner: !!req.ota_partner,
    partner_name: req.ota_partner?.name,
    api_key_present: !!(req.headers['x-api-key']),
    reason: 'req.ota_partner.id not available - middleware may have failed'
  });

  // Fallback to 'ota' channel
  return 'ota';
}

// GET /api/ota/inventory - Get real-time package availability
router.get('/inventory', otaAuthMiddleware('inventory:read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productIdsParam = req.query.product_ids as string;
    let productIds: number[] | undefined;

    if (productIdsParam) {
      productIds = productIdsParam.split(',').map(id => {
        const parsed = parseInt(id.trim(), 10);
        if (isNaN(parsed)) {
          throw new Error(`Invalid product ID: ${id}`);
        }
        return parsed;
      });
    }

    const partnerId = getPartnerIdWithFallback(req);
    const inventory = await otaService.getInventory(productIds, partnerId);

    res.json(inventory);

  } catch (error: any) {
    logger.error('OTA inventory request failed', {
      partner: req.ota_partner?.name,
      error: error.message,
      query: req.query
    });

    if (error.message?.includes('Invalid product ID')) {
      return res.status(422).json({
        error: 'INVALID_PRODUCT_IDS',
        message: error.message
      });
    }

    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve inventory information'
    });
  }
});

// GET /api/ota/orders - List confirmed orders for OTA
router.get('/orders', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partnerId = getPartnerIdWithFallback(req);
    const orders = await otaService.getOrders(partnerId);

    res.json({
      orders,
      total_count: orders.length
    });

  } catch (error: any) {
    logger.error('OTA orders list failed', {
      partner: req.ota_partner?.name,
      order_id: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve orders'
    });
  }
});

// GET /api/ota/orders/:id/tickets - Get QR codes and ticket details
router.get('/orders/:id/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const tickets = await otaService.getOrderTickets(orderId);

    res.json({
      tickets
    });

  } catch (error: any) {
    logger.error('OTA order tickets lookup failed', {
      partner: req.ota_partner?.name,
      order_id: req.params.id,
      error: error.message
    });

    const statusCode = error.code === 'ORDER_NOT_FOUND' ? 404 : 500;

    res.status(statusCode).json({
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Failed to retrieve order tickets'
    });
  }
});

// GET /api/ota/tickets - List tickets with optional filters
router.get('/tickets', otaAuthMiddleware('inventory:read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, batch_id, created_after, created_before, page, limit } = req.query;

    // Parse and validate query parameters
    const filters: any = {};

    if (status) {
      filters.status = status as string;
    }

    if (batch_id) {
      filters.batch_id = batch_id as string;
    }

    if (created_after) {
      filters.created_after = created_after as string;
    }

    if (created_before) {
      filters.created_before = created_before as string;
    }

    if (page) {
      const pageNum = parseInt(page as string, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(422).json({
          error: 'INVALID_PARAMETER',
          message: 'page must be a positive integer'
        });
      }
      filters.page = pageNum;
    }

    if (limit) {
      const limitNum = parseInt(limit as string, 10);
      if (isNaN(limitNum) || limitNum < 1) {
        return res.status(422).json({
          error: 'INVALID_PARAMETER',
          message: 'limit must be a positive integer'
        });
      }
      filters.limit = limitNum;
    }

    const partnerId = getPartnerIdWithFallback(req);
    const result = await otaService.getTickets(partnerId, filters);

    res.json(result);

  } catch (error: any) {
    logger.error('OTA tickets list failed', {
      partner: req.ota_partner?.name,
      error: error.message,
      query: req.query
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve tickets'
    });
  }
});

// POST /api/ota/tickets/bulk-generate - Generate pre-made tickets for OTA
router.post('/tickets/bulk-generate', otaAuthMiddleware('tickets:bulk-generate'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      product_id,
      quantity,
      batch_id,
      distribution_mode,
      reseller_metadata,
      batch_metadata,
      special_pricing
    } = req.body;

    // Validate required fields
    if (typeof product_id !== 'number' || typeof quantity !== 'number' || !batch_id) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'product_id (number), quantity (number), and batch_id are required'
      });
    }

    // Validate reseller metadata if reseller_batch mode
    if (distribution_mode === 'reseller_batch' && !reseller_metadata?.intended_reseller) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'reseller_metadata.intended_reseller is required for reseller_batch mode'
      });
    }

    const partnerId = getPartnerIdWithFallback(req);
    const result = await otaService.bulkGenerateTickets(partnerId, {
      product_id,
      quantity,
      batch_id,
      distribution_mode: distribution_mode || 'direct_sale',
      reseller_metadata,
      batch_metadata,
      special_pricing
    });

    res.status(201).json(result);

  } catch (error: any) {
    logger.error('OTA bulk ticket generation failed', {
      partner: req.ota_partner?.name,
      error: error.message,
      request_body: req.body
    });

    const statusCode = error.code === 'PRODUCT_NOT_FOUND' ? 404 :
                      error.code === 'SOLD_OUT' ? 409 :
                      error.code === 'VALIDATION_ERROR' ? 422 : 500;

    res.status(statusCode).json({
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Failed to generate tickets'
    });
  }
});

// POST /api/ota/tickets/:code/activate - Activate pre-made ticket with customer details
router.post('/tickets/:code/activate', otaAuthMiddleware('tickets:activate'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketCode = req.params.code;
    const { customer_details, customer_type, visit_date, payment_reference } = req.body;

    // Validate required fields
    if (!customer_details || !customer_type) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'customer_details and customer_type are required'
      });
    }

    if (!customer_details.name) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'customer_details must include name'
      });
    }

    if (!['adult', 'child', 'elderly'].includes(customer_type)) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'customer_type must be one of: adult, child, elderly'
      });
    }

    // Validate visit_date format if provided (optional)
    if (visit_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(visit_date)) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'visit_date must be in YYYY-MM-DD format (e.g., 2025-11-23)'
        });
      }

      // Check if date is valid
      const parsedDate = new Date(visit_date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'visit_date is not a valid date'
        });
      }
    }

    const partnerId = getPartnerIdWithFallback(req);
    const result = await otaService.activatePreMadeTicket(ticketCode, partnerId, {
      customer_details,
      customer_type,
      visit_date,  // Pass visit_date (optional) for weekend pricing
      payment_reference
    });

    res.status(200).json(result);

  } catch (error: any) {
    logger.error('OTA ticket activation failed', {
      partner: req.ota_partner?.name,
      ticket_code: req.params.code,
      error: error.message
    });

    const statusCode = error.code === 'TICKET_NOT_FOUND' ? 404 :
                      error.code === 'TICKET_ALREADY_ACTIVATED' ? 409 : 500;

    res.status(statusCode).json({
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Failed to activate ticket'
    });
  }
});

// GET /api/ota/batches/:id/analytics - Real-time batch performance analytics
router.get('/batches/:id/analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batchId = req.params.id;
    const analytics = await otaService.getBatchAnalytics(batchId);

    if (!analytics) {
      return res.status(404).json({
        error: 'BATCH_NOT_FOUND',
        message: 'Batch not found'
      });
    }

    res.json(analytics);

  } catch (error: any) {
    logger.error('OTA batch analytics failed', {
      partner: req.ota_partner?.name,
      batch_id: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve batch analytics'
    });
  }
});

// GET /api/ota/billing/summary - Billing summary for reseller
router.get('/billing/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period, reseller } = req.query;

    if (!period || typeof period !== 'string') {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'period parameter is required (YYYY-MM format)'
      });
    }

    const partnerId = getPartnerIdWithFallback(req);
    const summary = await otaService.getResellerBillingSummary(
      partnerId,
      reseller as string || 'all',
      period
    );

    res.json(summary);

  } catch (error: any) {
    logger.error('OTA billing summary failed', {
      partner: req.ota_partner?.name,
      query: req.query,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve billing summary'
    });
  }
});

// GET /api/ota/batches/:id/redemptions - Get redemption events for specific batch
router.get('/batches/:id/redemptions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batchId = req.params.id;
    const redemptions = await otaService.getBatchRedemptions(batchId);

    res.json({
      batch_id: batchId,
      total_redemptions: redemptions.length,
      redemption_events: redemptions
    });

  } catch (error: any) {
    logger.error('OTA batch redemptions failed', {
      partner: req.ota_partner?.name,
      batch_id: req.params.id,
      error: error.message
    });

    const statusCode = error.code === 'BATCH_NOT_FOUND' ? 404 : 500;

    res.status(statusCode).json({
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Failed to retrieve batch redemptions'
    });
  }
});

// GET /api/ota/campaigns/analytics - Campaign performance analytics
router.get('/campaigns/analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { campaign_type, date_range } = req.query;

    const partnerId = getPartnerIdWithFallback(req);
    const analytics = await otaService.getCampaignAnalytics(
      partnerId,
      campaign_type as string,
      date_range as string
    );

    res.json(analytics);

  } catch (error: any) {
    logger.error('OTA campaign analytics failed', {
      partner: req.ota_partner?.name,
      query: req.query,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve campaign analytics'
    });
  }
});

// ============= ADMIN MANAGEMENT ENDPOINTS =============
// These endpoints require admin privileges (admin:read permission)

// GET /api/ota/admin/partners - Get all OTA partners
router.get('/admin/partners', adminAuthMiddleware(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partners = await otaService.getAllPartners();

    res.json({
      partners,
      total_count: partners.length
    });

  } catch (error: any) {
    logger.error('OTA admin get partners failed', {
      admin: req.ota_partner?.name,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve partners list'
    });
  }
});

// GET /api/ota/admin/partners/:partnerId/statistics - Get partner statistics
router.get('/admin/partners/:partnerId/statistics', adminAuthMiddleware(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    const { start_date, end_date } = req.query;

    const stats = await otaService.getPartnerStatistics(
      partnerId,
      {
        start_date: start_date as string,
        end_date: end_date as string
      }
    );

    res.json(stats);

  } catch (error: any) {
    logger.error('OTA admin get partner statistics failed', {
      admin: req.ota_partner?.name,
      partner_id: req.params.partnerId,
      error: error.message
    });

    const status = error.code === 'VALIDATION_ERROR' ? 404 : 500;
    res.status(status).json({
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Failed to retrieve partner statistics'
    });
  }
});

// GET /api/ota/admin/dashboard - Get platform dashboard summary
router.get('/admin/dashboard', adminAuthMiddleware(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    const summary = await otaService.getDashboardSummary({
      start_date: start_date as string,
      end_date: end_date as string
    });

    res.json(summary);

  } catch (error: any) {
    logger.error('OTA admin get dashboard failed', {
      admin: req.ota_partner?.name,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve dashboard summary'
    });
  }
});

// ============= RESELLER MANAGEMENT CRUD (NEW - 2025-11-14) =============

// GET /api/ota/resellers/summary - Aggregate reseller info from batches (JSON-based with pagination)
router.get('/resellers/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status = 'active', date_range, page, limit, batches_per_reseller } = req.query;

    // 验证分页参数
    const filters: any = {
      status: status as string,
      date_range: date_range as string
    };

    if (page) {
      const pageNum = parseInt(page as string, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(422).json({
          error: 'INVALID_PARAMETER',
          message: 'page must be a positive integer'
        });
      }
      filters.page = pageNum;
    }

    if (limit) {
      const limitNum = parseInt(limit as string, 10);
      if (isNaN(limitNum) || limitNum < 1) {
        return res.status(422).json({
          error: 'INVALID_PARAMETER',
          message: 'limit must be a positive integer'
        });
      }
      filters.limit = limitNum;
    }

    if (batches_per_reseller) {
      const batchesNum = parseInt(batches_per_reseller as string, 10);
      if (isNaN(batchesNum) || batchesNum < 1) {
        return res.status(422).json({
          error: 'INVALID_PARAMETER',
          message: 'batches_per_reseller must be a positive integer'
        });
      }
      filters.batches_per_reseller = batchesNum;
    }

    const partnerId = getPartnerIdWithFallback(req);
    const summary = await otaService.getResellersSummary(partnerId, filters);

    res.json(summary);
  } catch (error: any) {
    logger.error('OTA reseller summary failed', {
      partner: req.ota_partner?.name,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get reseller summary'
    });
  }
});

// GET /api/ota/resellers - List all resellers for current OTA partner
router.get('/resellers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partnerId = getPartnerIdWithFallback(req);
    const result = await otaService.listResellers(partnerId);

    res.json(result);
  } catch (error: any) {
    logger.error('OTA list resellers failed', {
      partner: req.ota_partner?.name,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to list resellers'
    });
  }
});

// GET /api/ota/resellers/:id - Get single reseller details
router.get('/resellers/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const resellerId = parseInt(req.params.id);
    if (isNaN(resellerId)) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Invalid reseller ID'
      });
    }

    const partnerId = getPartnerIdWithFallback(req);
    const reseller = await otaService.getResellerById(resellerId, partnerId);

    if (!reseller) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Reseller not found'
      });
    }

    res.json(reseller);
  } catch (error: any) {
    logger.error('OTA get reseller failed', {
      partner: req.ota_partner?.name,
      reseller_id: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve reseller'
    });
  }
});

// POST /api/ota/resellers - Create new reseller
router.post('/resellers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reseller_code, reseller_name, contact_email, contact_phone, commission_rate,
            contract_start_date, contract_end_date, settlement_cycle, payment_terms,
            region, tier, notes } = req.body;

    // Only reseller_name is required; reseller_code will be auto-generated if not provided
    if (!reseller_name) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'reseller_name is required'
      });
    }

    const partnerId = getPartnerIdWithFallback(req);
    const reseller = await otaService.createReseller(partnerId, {
      reseller_code,
      reseller_name,
      contact_email,
      contact_phone,
      commission_rate,
      contract_start_date,
      contract_end_date,
      settlement_cycle,
      payment_terms,
      region,
      tier,
      notes
    });

    res.status(201).json(reseller);
  } catch (error: any) {
    logger.error('OTA create reseller failed', {
      partner: req.ota_partner?.name,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create reseller'
    });
  }
});

// PUT /api/ota/resellers/:id - Update reseller
router.put('/resellers/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const resellerId = parseInt(req.params.id);
    if (isNaN(resellerId)) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Invalid reseller ID'
      });
    }

    const partnerId = getPartnerIdWithFallback(req);
    const updated = await otaService.updateReseller(resellerId, partnerId, req.body);

    if (!updated) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Reseller not found'
      });
    }

    res.json(updated);
  } catch (error: any) {
    logger.error('OTA update reseller failed', {
      partner: req.ota_partner?.name,
      reseller_id: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update reseller'
    });
  }
});

// DELETE /api/ota/resellers/:id - Deactivate reseller (soft delete)
router.delete('/resellers/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const resellerId = parseInt(req.params.id);
    if (isNaN(resellerId)) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Invalid reseller ID'
      });
    }

    const partnerId = getPartnerIdWithFallback(req);
    const result = await otaService.deactivateReseller(resellerId, partnerId);

    if (!result) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Reseller not found'
      });
    }

    res.json({
      message: 'Reseller deactivated successfully',
      reseller_id: resellerId,
      status: 'terminated'
    });
  } catch (error: any) {
    logger.error('OTA deactivate reseller failed', {
      partner: req.ota_partner?.name,
      reseller_id: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to deactivate reseller'
    });
  }
});

// ============= PRODUCT QR CONFIG MANAGEMENT (NEW) =============

/**
 * GET /api/ota/products/qr-configs
 * Get QR configurations for all products (batch query)
 */
router.get('/products/qr-configs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configs = await otaService.getAllProductQRConfigs();

    res.json({
      products: configs,
      total_count: configs.length
    });
  } catch (error: any) {
    logger.error('OTA get all product QR configs failed', {
      partner: req.ota_partner?.name,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve product QR configurations'
    });
  }
});

/**
 * GET /api/ota/products/:id/qr-config
 * Get QR code configuration for a product
 */
router.get('/products/:id/qr-config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Invalid product ID'
      });
    }

    const qrConfig = await otaService.getProductQRConfig(productId);

    if (!qrConfig) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Product not found'
      });
    }

    res.json(qrConfig);
  } catch (error: any) {
    logger.error('OTA get product QR config failed', {
      partner: req.ota_partner?.name,
      product_id: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve product QR configuration'
    });
  }
});

/**
 * PUT /api/ota/products/:id/qr-config
 * Update QR code configuration for a product
 *
 * Request body:
 * {
 *   "dark_color": "#0066CC",    // QR foreground color (hex format)
 *   "light_color": "#FFFFFF",   // QR background color (hex format)
 *   "logo_url": "https://..."   // Optional logo URL
 * }
 */
router.put('/products/:id/qr-config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Invalid product ID'
      });
    }

    const { dark_color, light_color, logo_url } = req.body;

    // Validate hex color format
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    if (dark_color && !hexColorRegex.test(dark_color)) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'dark_color must be a valid hex color (e.g., #CC0000)'
      });
    }

    if (light_color && !hexColorRegex.test(light_color)) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'light_color must be a valid hex color (e.g., #FFFFFF)'
      });
    }

    const result = await otaService.updateProductQRConfig(productId, {
      dark_color,
      light_color,
      logo_url
    });

    if (!result) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Product not found'
      });
    }

    res.json(result);
  } catch (error: any) {
    logger.error('OTA update product QR config failed', {
      partner: req.ota_partner?.name,
      product_id: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update product QR configuration'
    });
  }
});

export default router;
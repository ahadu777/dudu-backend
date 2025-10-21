import { Router, Request, Response } from 'express';
import { mockStore } from '../../core/mock/store';
import { logger } from '../../utils/logger';
import { authenticate } from '../../middlewares/auth';
import { ActivityHistory } from '../../types/domain';

const router = Router();

// Simple metrics (until we have a proper metrics service)
const metrics = {
  increment: (metric: string) => {
    logger.info('metric.increment', { metric });
  },
  recordLatency: (metric: string, ms: number) => {
    logger.info('metric.latency', { metric, latency_ms: ms });
  }
};

// GET /profile - Get current user's profile information
router.get('/', authenticate, (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const userId = req.user!.id;

    // Get user profile from store
    const profile = mockStore.getUserProfile(userId);

    if (!profile) {
      logger.info('profile.not_found', { user_id: userId });
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'User profile not found'
      });
    }

    // Log profile access
    logger.info('profile.access.success', { user_id: userId });

    // Record metrics
    metrics.increment('profile.access.count');
    const latency = Date.now() - startTime;
    metrics.recordLatency('profile.access.latency_ms', latency);

    res.status(200).json(profile);

  } catch (error) {
    logger.error('profile.access.error', { error: String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve profile'
    });
  }
});

// PUT /profile - Update user profile information
router.put('/', authenticate, (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const userId = req.user!.id;
    const updates = req.body;

    // Validate input
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: 'Request body must be a valid object'
      });
    }

    // Validate email format if provided
    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      return res.status(422).json({
        code: 'VALIDATION_FAILED',
        message: 'Invalid email format'
      });
    }

    // Validate name if provided
    if (updates.name && (typeof updates.name !== 'string' || updates.name.trim().length === 0)) {
      return res.status(422).json({
        code: 'VALIDATION_FAILED',
        message: 'Name must be a non-empty string'
      });
    }

    // Sanitize name input
    if (updates.name) {
      updates.name = updates.name.trim();
    }

    // Update profile
    const updatedProfile = mockStore.updateUserProfile(userId, updates);

    if (!updatedProfile) {
      logger.info('profile.update.not_found', { user_id: userId });
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'User profile not found'
      });
    }

    // Log profile update
    logger.info('profile.update.success', {
      user_id: userId,
      fields_changed: Object.keys(updates)
    });

    // Record metrics
    metrics.increment('profile.updates.count');
    const latency = Date.now() - startTime;
    metrics.recordLatency('profile.update.latency_ms', latency);

    res.status(200).json(updatedProfile);

  } catch (error) {
    logger.error('profile.update.error', { error: String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update profile'
    });
  }
});

// GET /profile/settings - Get user settings and preferences
router.get('/settings', authenticate, (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const userId = req.user!.id;

    // Get user settings from store
    const settings = mockStore.getUserSettings(userId);

    if (!settings) {
      logger.info('settings.not_found', { user_id: userId });
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'User not found'
      });
    }

    // Log settings access
    logger.info('settings.access.success', { user_id: userId });

    // Record metrics
    metrics.increment('settings.access.count');
    const latency = Date.now() - startTime;
    metrics.recordLatency('settings.access.latency_ms', latency);

    res.status(200).json(settings);

  } catch (error) {
    logger.error('settings.access.error', { error: String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve settings'
    });
  }
});

// PUT /profile/settings - Update user settings and preferences
router.put('/settings', authenticate, (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const userId = req.user!.id;
    const settingsUpdate = req.body;

    // Validate input
    if (!settingsUpdate || typeof settingsUpdate !== 'object') {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: 'Request body must be a valid object'
      });
    }

    // Validate enum values if provided
    if (settingsUpdate.display_preferences?.language) {
      const validLanguages = ['en', 'es', 'fr', 'de'];
      if (!validLanguages.includes(settingsUpdate.display_preferences.language)) {
        return res.status(422).json({
          code: 'VALIDATION_FAILED',
          message: 'Invalid language. Must be one of: en, es, fr, de'
        });
      }
    }

    if (settingsUpdate.display_preferences?.date_format) {
      const validFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
      if (!validFormats.includes(settingsUpdate.display_preferences.date_format)) {
        return res.status(422).json({
          code: 'VALIDATION_FAILED',
          message: 'Invalid date format. Must be one of: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD'
        });
      }
    }

    if (settingsUpdate.display_preferences?.currency_display) {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD'];
      if (!validCurrencies.includes(settingsUpdate.display_preferences.currency_display)) {
        return res.status(422).json({
          code: 'VALIDATION_FAILED',
          message: 'Invalid currency. Must be one of: USD, EUR, GBP, CAD'
        });
      }
    }

    if (settingsUpdate.privacy_settings?.profile_visibility) {
      const validVisibility = ['public', 'private'];
      if (!validVisibility.includes(settingsUpdate.privacy_settings.profile_visibility)) {
        return res.status(422).json({
          code: 'VALIDATION_FAILED',
          message: 'Invalid profile visibility. Must be one of: public, private'
        });
      }
    }

    // Update settings
    const updatedSettings = mockStore.updateUserSettings(userId, settingsUpdate);

    if (!updatedSettings) {
      logger.info('settings.update.not_found', { user_id: userId });
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'User not found'
      });
    }

    // Log settings update
    logger.info('settings.update.success', {
      user_id: userId,
      settings_changed: Object.keys(settingsUpdate)
    });

    // Record metrics
    metrics.increment('settings.updates.count');
    const latency = Date.now() - startTime;
    metrics.recordLatency('settings.update.latency_ms', latency);

    res.status(200).json(updatedSettings);

  } catch (error) {
    logger.error('settings.update.error', { error: String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update settings'
    });
  }
});

// GET /profile/activity - Get user activity history
router.get('/activity', authenticate, (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const userId = req.user!.id;

    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const type = req.query.type as string;
    const fromDate = req.query.from_date as string;
    const toDate = req.query.to_date as string;

    // Validate date formats if provided
    if (fromDate && isNaN(Date.parse(fromDate))) {
      return res.status(422).json({
        code: 'VALIDATION_FAILED',
        message: 'Invalid from_date format. Must be a valid ISO 8601 date'
      });
    }

    if (toDate && isNaN(Date.parse(toDate))) {
      return res.status(422).json({
        code: 'VALIDATION_FAILED',
        message: 'Invalid to_date format. Must be a valid ISO 8601 date'
      });
    }

    // Validate type filter
    if (type && !['profile', 'order', 'ticket', 'login', 'settings', 'all'].includes(type)) {
      return res.status(422).json({
        code: 'VALIDATION_FAILED',
        message: 'Invalid type. Must be one of: profile, order, ticket, login, settings, all'
      });
    }

    // Get activity history
    const { activities, total } = mockStore.getUserActivity(userId, {
      limit,
      offset,
      type,
      fromDate,
      toDate
    });

    const response: ActivityHistory = {
      activities,
      total,
      pagination: {
        limit,
        offset,
        has_more: offset + limit < total
      }
    };

    // Log activity access
    logger.info('activity.history.accessed', {
      user_id: userId,
      filters_applied: { type, fromDate, toDate },
      result_count: activities.length
    });

    // Record metrics
    metrics.increment('activity.history.requests.count');
    const latency = Date.now() - startTime;
    metrics.recordLatency('activity.history.latency_ms', latency);

    res.status(200).json(response);

  } catch (error) {
    logger.error('activity.history.error', { error: String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve activity history'
    });
  }
});

export default router;
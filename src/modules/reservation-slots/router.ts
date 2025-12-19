import { Router } from 'express';
import { ReservationSlotServiceMock } from './service.mock';
import { ReservationSlotServiceDirectus } from './service.directus';
import {
  CreateSlotRequest,
  CreateSlotResponse,
  UpdateSlotRequest,
  UpdateSlotResponse,
  DeleteSlotResponse,
  GetSlotsResponse,
  SlotAvailabilityResponse
} from './types';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';

const router = Router();
const service = new ReservationSlotServiceMock();
const directusService = new ReservationSlotServiceDirectus();

/**
 * Operator Slot Management Endpoints
 */

/**
 * POST /api/operator/slots/create
 * Create new reservation slot
 */
router.post('/operator/slots/create', async (req, res) => {
  try {
    const request: CreateSlotRequest = req.body;

    // Validation
    if (!request.venue_id || !request.date || !request.start_time || !request.end_time) {
      const response: CreateSlotResponse = {
        success: false,
        error: 'Missing required fields: venue_id, date, start_time, end_time'
      };
      return res.status(400).json(response);
    }

    if (!request.total_capacity || request.total_capacity <= 0) {
      const response: CreateSlotResponse = {
        success: false,
        error: 'total_capacity must be greater than 0'
      };
      return res.status(400).json(response);
    }

    const slot = await service.createSlot(request);

    logger.info('reservation-slot.create', {
      slot_id: slot.id,
      venue_id: slot.venue_id,
      date: slot.date
    });

    const response: CreateSlotResponse = {
      success: true,
      data: slot
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('reservation-slot.create.error', { error: error.message });

    if (error.message === 'SLOT_ALREADY_EXISTS') {
      const response: CreateSlotResponse = {
        success: false,
        error: 'Slot already exists for this venue, date, and time'
      };
      return res.status(409).json(response);
    }

    if (error.message === 'CANNOT_CREATE_PAST_SLOT') {
      const response: CreateSlotResponse = {
        success: false,
        error: 'Cannot create slots for past dates'
      };
      return res.status(400).json(response);
    }

    const response: CreateSlotResponse = {
      success: false,
      error: 'Failed to create slot'
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/operator/slots/:slot_id
 * Update existing slot (capacity or status)
 */
router.put('/operator/slots/:slot_id', async (req, res) => {
  try {
    const { slot_id } = req.params;
    const request: UpdateSlotRequest = req.body;

    const slot = await service.updateSlot(slot_id, request);

    logger.info('reservation-slot.update', {
      slot_id: slot.id,
      total_capacity: slot.total_capacity,
      status: slot.status
    });

    const response: UpdateSlotResponse = {
      success: true,
      data: slot
    };

    res.json(response);
  } catch (error: any) {
    logger.error('reservation-slot.update.error', { error: error.message });

    if (error.message === 'SLOT_NOT_FOUND') {
      const response: UpdateSlotResponse = {
        success: false,
        error: 'Slot not found'
      };
      return res.status(404).json(response);
    }

    if (error.message === 'CAPACITY_BELOW_BOOKED_COUNT') {
      const response: UpdateSlotResponse = {
        success: false,
        error: 'Cannot reduce capacity below current booked count'
      };
      return res.status(400).json(response);
    }

    const response: UpdateSlotResponse = {
      success: false,
      error: 'Failed to update slot'
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/operator/slots/:slot_id
 * Delete or close slot
 */
router.delete('/operator/slots/:slot_id', async (req, res) => {
  try {
    const { slot_id } = req.params;

    const result = await service.deleteSlot(slot_id);

    logger.info('reservation-slot.delete', {
      slot_id,
      soft_delete: result.soft_delete
    });

    const response: DeleteSlotResponse = {
      success: true,
      message: result.message
    };

    res.json(response);
  } catch (error: any) {
    logger.error('reservation-slot.delete.error', { error: error.message });

    if (error.message === 'SLOT_NOT_FOUND') {
      const response: DeleteSlotResponse = {
        success: false,
        error: 'Slot not found'
      };
      return res.status(404).json(response);
    }

    const response: DeleteSlotResponse = {
      success: false,
      error: 'Failed to delete slot'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/operator/slots
 * List slots with filters
 */
router.get('/operator/slots', async (req, res) => {
  try {
    const query = {
      venue_id: req.query.venue_id ? parseInt(req.query.venue_id as string) : undefined,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      status: req.query.status as any,
      orq: parseInt((req.query.orq as string) || '1')
    };

    const slots = await service.getSlots(query);

    const response: GetSlotsResponse = {
      success: true,
      data: slots,
      meta: {
        total: slots.length,
        venue_id: query.venue_id,
        date_range: query.date_from && query.date_to
          ? { from: query.date_from, to: query.date_to }
          : undefined
      }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('reservation-slot.get-slots.error', { error: error.message });

    const response: GetSlotsResponse = {
      success: false,
      error: 'Failed to fetch slots'
    };
    res.status(500).json(response);
  }
});

/**
 * Customer Slot Availability Endpoint
 */

/**
 * GET /api/reservation-slots/available
 * Get available slots for customer reservation
 */
router.get('/reservation-slots/available', async (req, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const orq = parseInt((req.query.orq as string) || '1');
    const venueId = req.query.venue_id ? parseInt(req.query.venue_id as string) : undefined;

    logger.info('reservation-slot.available.request', {
      month,
      orq,
      venueId,
      useDirectus: env.USE_DIRECTUS
    });

    // Use Directus service if enabled, otherwise fallback to mock
    const slots = env.USE_DIRECTUS
      ? await directusService.getAvailableSlots(month, orq, venueId)
      : await service.getAvailableSlots(month, orq, venueId);

    const response: SlotAvailabilityResponse = {
      success: true,
      data: slots
    };

    res.json(response);
  } catch (error: any) {
    logger.error('reservation-slot.available.error', { error: error.message });

    const response: SlotAvailabilityResponse = {
      success: false,
      error: 'Failed to fetch available slots'
    };
    res.status(500).json(response);
  }
});

export default router;

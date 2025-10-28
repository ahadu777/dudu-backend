import { Router } from 'express';
import { reservationService } from './service';
import { CreateReservationRequest } from './types';

const router = Router();

router.post('/', (req, res) => {
  const payload: CreateReservationRequest = req.body ?? {};

  const result = reservationService.create(payload);

  if (!result.ok) {
    if (result.reason === 'INVALID_REQUEST') {
      return res.status(422).json({
        code: 'RESERVATION_INVALID',
        message: result.message
      });
    }

    if (result.reason === 'ROUTE_UNAVAILABLE') {
      return res.status(404).json({
        code: 'RESERVATION_ROUTE_NOT_FOUND',
        message: result.message
      });
    }

    if (result.reason === 'SEATS_UNAVAILABLE') {
      return res.status(409).json({
        code: 'RESERVATION_CAPACITY_EXCEEDED',
        message: result.message
      });
    }

    return res.status(500).json({
      code: 'RESERVATION_UNKNOWN_ERROR',
      message: 'Unhandled reservation failure'
    });
  }

  const statusCode = result.reused ? 200 : 201;
  const expiresInSeconds = Math.max(
    0,
    Math.floor((Date.parse(result.reservation.lock_expire_at) - Date.now()) / 1000)
  );

  return res.status(statusCode).json({
    reservation_id: result.reservation.reservation_id,
    status: result.reservation.status,
    lock_expire_at: result.reservation.lock_expire_at,
    expires_in_seconds: expiresInSeconds
  });
});

router.delete('/:reservationId', (req, res) => {
  const reservationId = req.params.reservationId;
  if (!reservationId) {
    return res.status(400).json({
      code: 'RESERVATION_ID_REQUIRED',
      message: 'reservationId is required'
    });
  }

  const result = reservationService.release(reservationId);
  if (!result.ok) {
    if (result.reason === 'NOT_FOUND') {
      return res.status(404).json({
        code: 'RESERVATION_NOT_FOUND',
        message: result.message
      });
    }

    if (result.reason === 'ALREADY_RELEASED') {
      return res.status(409).json({
        code: 'RESERVATION_ALREADY_RELEASED',
        message: result.message
      });
    }

    if (result.reason === 'EXPIRED') {
      return res.status(409).json({
        code: 'RESERVATION_ALREADY_EXPIRED',
        message: result.message
      });
    }

    return res.status(500).json({
      code: 'RESERVATION_RELEASE_ERROR',
      message: 'Failed to release reservation'
    });
  }

  return res.status(204).send();
});

export default router;

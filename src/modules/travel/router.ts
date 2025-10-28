import { Router } from 'express';
import {
  HOT_CITIES,
  BLACKOUT_CALENDAR,
  TRAVEL_ROUTES,
  BUNDLE_DEFINITIONS,
  PASSENGER_DEFAULT_PRICING
} from './data';
import { travelInventory } from './inventory';
import {
  PassengerType,
  PassengerSegment,
  TravelSearchRoute,
  TravelSearchResponse
} from './types';

const router = Router();

const isPassengerType = (value: string): value is PassengerType =>
  value === 'adult' || value === 'child' || value === 'senior';

const buildDateTime = (travelDate: string, time: string): string => {
  const isoCandidate = `${travelDate}T${time}:00+08:00`;
  const parsed = new Date(isoCandidate);
  if (Number.isNaN(parsed.valueOf())) {
    return `${travelDate}T${time}:00+08:00`;
  }
  return parsed.toISOString();
};

const normalisePassengerSegments = (raw: string | undefined, passengerCount?: number): PassengerSegment[] => {
  if (!raw) {
    return [
      { passengerType: 'adult', count: passengerCount && passengerCount > 0 ? passengerCount : 1 }
    ];
  }

  const parts = raw.split(',').map(segment => segment.trim()).filter(Boolean);
  const segments: PassengerSegment[] = [];

  for (const part of parts) {
    if (!isPassengerType(part)) {
      continue;
    }

    const existing = segments.find(seg => seg.passengerType === part);
    if (existing) {
      existing.count += 1;
    } else {
      segments.push({ passengerType: part, count: 1 });
    }
  }

  if (segments.length === 0) {
    segments.push({ passengerType: 'adult', count: passengerCount && passengerCount > 0 ? passengerCount : 1 });
  }

  if (passengerCount && passengerCount > 0) {
    const totalCurrent = segments.reduce((acc, seg) => acc + seg.count, 0);
    if (totalCurrent < passengerCount) {
      // Assign the remainder to the first passenger type
      segments[0].count += passengerCount - totalCurrent;
    }
  }

  return segments;
};

router.get('/hot-cities', (_req, res) => {
  res.status(200).json({ cities: HOT_CITIES });
});

router.get('/blackout-dates', (_req, res) => {
  res.status(200).json({
    year: BLACKOUT_CALENDAR.year,
    blackout_dates: BLACKOUT_CALENDAR.blackoutDates
  });
});

router.get('/search', (req, res) => {
  const origin = typeof req.query.origin === 'string' ? req.query.origin.trim() : '';
  const destination = typeof req.query.destination === 'string' ? req.query.destination.trim() : '';
  const travelDate = typeof req.query.travel_date === 'string' ? req.query.travel_date.trim() : '';
  const passengerTypesRaw = typeof req.query.passenger_types === 'string' ? req.query.passenger_types : undefined;

  const passengerCount = req.query.passenger_count
    ? Number.parseInt(String(req.query.passenger_count), 10)
    : undefined;

  if (!origin || !destination || !travelDate) {
    return res.status(422).json({
      code: 'TRAVEL_SEARCH_INVALID',
      message: 'origin, destination, travel_date are required'
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
    return res.status(422).json({
      code: 'TRAVEL_SEARCH_INVALID_DATE',
      message: 'travel_date must be YYYY-MM-DD'
    });
  }

  if (passengerCount !== undefined && (Number.isNaN(passengerCount) || passengerCount <= 0 || passengerCount > 10)) {
    return res.status(422).json({
      code: 'TRAVEL_SEARCH_INVALID_PASSENGER_COUNT',
      message: 'passenger_count must be between 1 and 10'
    });
  }

  const passengerSegments = normalisePassengerSegments(passengerTypesRaw, passengerCount);

  const matchingRoutes = TRAVEL_ROUTES.filter(route =>
    route.origin === origin.toUpperCase() && route.destination === destination.toUpperCase()
  );

  if (matchingRoutes.length === 0) {
    return res.status(200).json({
      routes: [],
      bundles: []
    });
  }

  const routes: TravelSearchRoute[] = matchingRoutes.map(route => {
    const availability = travelInventory.getAvailability(route.routeId, travelDate) ?? {
      routeId: route.routeId,
      travelDate,
      capacity: route.seatCapacity,
      reserved: 0,
      available: route.seatCapacity
    };

    const passengerBreakdown = passengerSegments.map(segment => {
      const multiplier = PASSENGER_DEFAULT_PRICING[segment.passengerType];
      const unitAmount = Math.round(route.baseFare * multiplier);
      return {
        passenger_type: segment.passengerType,
        count: segment.count,
        unit_amount: unitAmount,
        subtotal_amount: unitAmount * segment.count
      };
    });

    const totalAmount = passengerBreakdown.reduce((acc, segment) => acc + segment.subtotal_amount, 0);

    return {
      route_id: route.routeId,
      origin: route.origin,
      destination: route.destination,
      departure_time: buildDateTime(travelDate, route.departureTime),
      arrival_time: buildDateTime(travelDate, route.arrivalTime),
      duration_minutes: route.durationMinutes,
      carrier: route.carrier,
      seat_class: route.seatClass,
      availability: {
        capacity: availability.capacity,
        available: availability.available
      },
      pricing: {
        currency: route.currency,
        base_amount: route.baseFare,
        passenger_breakdown: passengerBreakdown,
        total_amount: totalAmount
      },
      bundle_ids: route.bundleIds
    };
  });

  const bundleMap = new Map(BUNDLE_DEFINITIONS.map(bundle => [bundle.bundleId, bundle]));
  const referencedBundleIds = new Set(routes.flatMap(route => route.bundle_ids));
  const bundles = Array.from(referencedBundleIds).map(bundleId => bundleMap.get(bundleId)).filter(Boolean);

  const response: TravelSearchResponse = {
    routes,
    bundles: bundles.map(bundle => ({
      bundle_id: bundle!.bundleId,
      name: bundle!.name,
      description: bundle!.description,
      currency: bundle!.currency,
      base_price: bundle!.basePrice,
      includes: bundle!.includes
    }))
  };

  res.status(200).json(response);
});

export default router;

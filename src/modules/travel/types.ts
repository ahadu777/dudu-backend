export interface HotCity {
  code: string;
  name: string;
  weight: number;
}

export interface BlackoutCalendar {
  year: number;
  blackoutDates: string[];
}

export type PassengerType = 'adult' | 'child' | 'senior';

export interface TravelRouteDefinition {
  routeId: string;
  origin: string;
  destination: string;
  carrier: string;
  seatClass: 'standard' | 'premium';
  departureTime: string; // HH:mm
  arrivalTime: string; // HH:mm
  durationMinutes: number;
  currency: string;
  baseFare: number;
  seatCapacity: number;
  bundleIds: string[];
  blackoutDates?: string[];
}

export interface BundleDefinition {
  bundleId: string;
  name: string;
  description: string;
  currency: string;
  basePrice: number;
  includes: string[];
}

export interface PassengerSegment {
  passengerType: PassengerType;
  count: number;
}

export interface AvailabilitySnapshot {
  routeId: string;
  travelDate: string;
  capacity: number;
  reserved: number;
  available: number;
}

export interface TravelSearchRoute {
  route_id: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  carrier: string;
  seat_class: string;
  availability: {
    capacity: number;
    available: number;
  };
  pricing: {
    currency: string;
    base_amount: number;
    passenger_breakdown: Array<{
      passenger_type: PassengerType;
      count: number;
      unit_amount: number;
      subtotal_amount: number;
    }>;
    total_amount: number;
  };
  bundle_ids: string[];
}

export interface TravelSearchResponse {
  routes: TravelSearchRoute[];
  bundles: Array<{
    bundle_id: string;
    name: string;
    description: string;
    currency: string;
    base_price: number;
    includes: string[];
  }>;
}

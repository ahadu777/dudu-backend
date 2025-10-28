import {
  BlackoutCalendar,
  BundleDefinition,
  HotCity,
  PassengerType,
  TravelRouteDefinition
} from './types';

export const HOT_CITIES: HotCity[] = [
  { code: 'HKG', name: '香港 Hong Kong', weight: 100 },
  { code: 'MAC', name: '澳門 Macao', weight: 90 },
  { code: 'SZX', name: '深圳 Shenzhen', weight: 80 },
  { code: 'GZ', name: '廣州 Guangzhou', weight: 70 }
];

export const BLACKOUT_CALENDAR: BlackoutCalendar = {
  year: 2025,
  blackoutDates: [
    '2025-12-24',
    '2025-12-25',
    '2025-12-31',
    '2026-01-01'
  ]
};

export const TRAVEL_ROUTES: TravelRouteDefinition[] = [
  {
    routeId: 'DT-HKG-MAC-001',
    origin: 'HKG',
    destination: 'MAC',
    carrier: 'DeepTravel Ferry',
    seatClass: 'standard',
    departureTime: '08:00',
    arrivalTime: '09:00',
    durationMinutes: 60,
    currency: 'HKD',
    baseFare: 22000,
    seatCapacity: 180,
    bundleIds: ['BUNDLE-PEAK', 'BUNDLE-FAMILY'],
    blackoutDates: ['2025-12-24', '2025-12-25']
  },
  {
    routeId: 'DT-HKG-MAC-002',
    origin: 'HKG',
    destination: 'MAC',
    carrier: 'DeepTravel Ferry',
    seatClass: 'premium',
    departureTime: '10:30',
    arrivalTime: '11:30',
    durationMinutes: 60,
    currency: 'HKD',
    baseFare: 32000,
    seatCapacity: 90,
    bundleIds: ['BUNDLE-VIP'],
    blackoutDates: ['2025-12-31']
  },
  {
    routeId: 'DT-HKG-ZHU-001',
    origin: 'HKG',
    destination: 'ZHU',
    carrier: 'DeepTravel FastRail',
    seatClass: 'standard',
    departureTime: '09:15',
    arrivalTime: '10:10',
    durationMinutes: 55,
    currency: 'HKD',
    baseFare: 18000,
    seatCapacity: 220,
    bundleIds: ['BUNDLE-RAIL-PASS']
  }
];

export const BUNDLE_DEFINITIONS: BundleDefinition[] = [
  {
    bundleId: 'BUNDLE-PEAK',
    name: 'Peak Explorer Combo',
    description: '包含山頂纜車、昂坪纜車與港島觀光巴士票券。',
    currency: 'HKD',
    basePrice: 48000,
    includes: [
      '山頂纜車來回',
      '昂坪纜車單程',
      '48 小時觀光巴士通行證'
    ]
  },
  {
    bundleId: 'BUNDLE-FAMILY',
    name: 'Family Discovery Pack',
    description: '2 成人 + 2 兒童套票，附送樂園快速通關券。',
    currency: 'HKD',
    basePrice: 78000,
    includes: [
      '家庭票四張',
      '樂園快速通關券 2 張',
      '主題餐廳餐飲券'
    ]
  },
  {
    bundleId: 'BUNDLE-VIP',
    name: 'VIP Lounge Experience',
    description: '尊享候船貴賓室與專屬接駁服務。',
    currency: 'HKD',
    basePrice: 108000,
    includes: ['貴賓室入場', '專屬登船口', '豪華接駁車']
  },
  {
    bundleId: 'BUNDLE-RAIL-PASS',
    name: '珠海樂游套票',
    description: '含珠海長隆樂園門票與市區巴士暢遊。',
    currency: 'HKD',
    basePrice: 54000,
    includes: [
      '長隆樂園門票',
      '市區 48 小時巴士 pass',
      '珠海博物館導覽'
    ]
  }
];

export const PASSENGER_DEFAULT_PRICING: Record<PassengerType, number> = {
  adult: 1,
  child: 0.7,
  senior: 0.8
};

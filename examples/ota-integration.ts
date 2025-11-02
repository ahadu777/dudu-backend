/**
 * OTA Platform Integration Example
 *
 * This example demonstrates how external OTA platforms can integrate
 * with our cruise package ticketing system to reserve inventory.
 */

interface OTAInventoryResponse {
  available_quantities: { [productId: number]: number };
  pricing_context: {
    base_prices: { [productId: number]: { weekday: number; weekend: number } };
    customer_types: string[];
    special_dates: { [date: string]: { multiplier: number } };
  };
}

interface OTAReservationRequest {
  product_id: number;
  quantity: number;
  reservation_expires_at?: string;
}

interface OTAReservationResponse {
  reservation_id: string;
  reserved_until: string;
  pricing_snapshot: {
    base_price: number;
    weekend_premium: number;
    customer_discounts: { [type: string]: number };
  };
}

class OTAClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error ${response.status}: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Get real-time availability for cruise packages
   */
  async getInventory(productIds?: number[]): Promise<OTAInventoryResponse> {
    const queryParams = productIds ? `?product_ids=${productIds.join(',')}` : '';
    return this.request<OTAInventoryResponse>(`/api/ota/inventory${queryParams}`);
  }

  /**
   * Reserve package inventory for OTA sales pipeline
   */
  async createReservation(request: OTAReservationRequest): Promise<OTAReservationResponse> {
    return this.request<OTAReservationResponse>('/api/ota/reserve', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get details for specific reservation
   */
  async getReservation(reservationId: string) {
    return this.request(`/api/ota/reservations/${reservationId}`);
  }

  /**
   * List all active reservations
   */
  async getActiveReservations() {
    return this.request('/api/ota/reservations');
  }
}

// Example usage for OTA integration
async function demonstrateOTAIntegration() {
  console.log('🚀 OTA Platform Integration Demo');
  console.log('=================================');

  // Initialize OTA client
  const ota = new OTAClient('http://localhost:8080', 'ota_test_key_12345');

  try {
    // Step 1: Check available inventory
    console.log('\n1. Checking available cruise package inventory...');
    const inventory = await ota.getInventory([106, 107, 108]);

    console.log('Available packages:');
    console.log(`- Premium Plan (106): ${inventory.available_quantities[106]} units`);
    console.log(`- Pet Plan (107): ${inventory.available_quantities[107]} units`);
    console.log(`- Deluxe Tea Set (108): ${inventory.available_quantities[108]} units`);

    const totalAvailable = Object.values(inventory.available_quantities).reduce((sum, qty) => sum + qty, 0);
    console.log(`Total available for OTA: ${totalAvailable} packages`);

    // Step 2: Reserve inventory for sales
    console.log('\n2. Creating reservation for Premium Plan packages...');
    const reservation = await ota.createReservation({
      product_id: 106,
      quantity: 10
    });

    console.log(`✅ Reservation created: ${reservation.reservation_id}`);
    console.log(`📅 Reserved until: ${reservation.reserved_until}`);
    console.log(`💰 Base price: $${reservation.pricing_snapshot.base_price}`);

    // Step 3: Verify reservation details
    console.log('\n3. Verifying reservation details...');
    const reservationDetails = await ota.getReservation(reservation.reservation_id);
    console.log(`📋 Status: ${reservationDetails.status}`);
    console.log(`📦 Product: ${reservationDetails.product_id}`);
    console.log(`🔢 Quantity: ${reservationDetails.quantity}`);

    // Step 4: Check updated inventory
    console.log('\n4. Checking updated inventory after reservation...');
    const updatedInventory = await ota.getInventory([106]);
    console.log(`Updated Premium Plan availability: ${updatedInventory.available_quantities[106]} units`);

    // Step 5: List all active reservations
    console.log('\n5. Listing all active reservations...');
    const activeReservations = await ota.getActiveReservations();
    console.log(`Total active reservations: ${activeReservations.total_count}`);

    console.log('\n✅ OTA Integration Demo Completed Successfully!');
    console.log('\nKey Benefits:');
    console.log('- Real-time inventory availability');
    console.log('- Secure API key authentication');
    console.log('- Automatic reservation expiry (24 hours)');
    console.log('- Channel separation (OTA vs direct sales)');
    console.log('- Complex pricing preserved across channels');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Business Integration Guidelines for OTA Partners
console.log(`
📋 OTA Integration Guidelines
============================

🏗️ Architecture:
- REST API with JSON request/response
- API key authentication required
- Rate limiting: 100-1000 requests/minute
- Base URL: http://localhost:8080/api/ota/

📦 Product Catalog:
- Product 106: Premium Plan - $288/$318 (weekday/weekend)
- Product 107: Pet Plan - $188 (flat rate)
- Product 108: Deluxe Tea Set - $788/$888 (weekday/weekend)

🎫 Package → Ticket Mapping:
- Each package purchase = 1 ticket with multiple entitlements
- Tickets include function codes for redemption validation
- QR codes generated for mobile redemption

💰 Pricing Rules:
- Weekend premium: +$30 for adults
- Customer types: adult, child, elderly
- Child/elderly fixed at $188 regardless of package/timing
- Special dates: 2025-12-31 (1.5x), 2026-02-18 (1.3x)

⏰ Reservation Management:
- Maximum 100 units per reservation request
- 24-hour automatic expiry
- Real-time inventory synchronization
- Activation via payment webhook integration

🔒 Security:
- API key authentication for all endpoints
- Request logging for audit trails
- Rate limiting prevents abuse
- Error handling with clear status codes

📊 Monitoring:
- Real-time availability tracking
- Reservation success/failure metrics
- Channel separation validation
- Performance monitoring <2 second response times
`);

// Export for use in other applications
export { OTAClient, demonstrateOTAIntegration };

// Run demo if executed directly
if (require.main === module) {
  demonstrateOTAIntegration().catch(console.error);
}
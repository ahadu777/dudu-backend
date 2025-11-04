/**
 * OTA Ticket Activation Example
 *
 * Demonstrates how to activate pre-made tickets when customers complete their purchase.
 * This converts PRE_GENERATED tickets to ACTIVE status and creates customer orders.
 */

interface ActivateTicketRequest {
  ticket_code: string;
  customer_name: string;
  customer_email: string;
}

interface ActivateTicketResponse {
  order_id: string;
  ticket_code: string;
  customer_name: string;
  customer_email: string;
  product_id: number;
  total_amount: string;
  status: 'ACTIVE';
  qr_code: string;
  entitlements: Array<{
    function_code: string;
    remaining_uses: number;
  }>;
  confirmation_code: string;
  activated_at: string;
}

class OTATicketActivation {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = 'http://localhost:8080', apiKey: string = 'test-api-key') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Activate a pre-made ticket when customer completes purchase
   */
  async activateTicket(request: ActivateTicketRequest): Promise<ActivateTicketResponse> {
    const response = await fetch(`${this.baseUrl}/api/ota/tickets/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Ticket activation failed: ${error.message || response.statusText}`);
    }

    return response.json();
  }
}

// Example usage
async function example() {
  const ota = new OTATicketActivation();

  try {
    console.log('🎟️ Activating pre-made ticket for customer...');

    const result = await ota.activateTicket({
      ticket_code: 'CRUISE-2025-FERRY-1730795144582', // Replace with actual ticket code
      customer_name: 'Maria Garcia',
      customer_email: 'maria.garcia@example.com'
    });

    console.log('✅ Ticket activation successful!');
    console.log(`Order ID: ${result.order_id}`);
    console.log(`Confirmation: ${result.confirmation_code}`);
    console.log(`Customer: ${result.customer_name} (${result.customer_email})`);
    console.log(`Status: ${result.status}`);
    console.log(`QR Code: ${result.qr_code.substring(0, 50)}...`);

    console.log('Entitlements:');
    result.entitlements.forEach((entitlement, index) => {
      console.log(`  ${index + 1}. ${entitlement.function_code} (${entitlement.remaining_uses} uses)`);
    });

    return result;
  } catch (error) {
    console.error('❌ Ticket activation failed:', error.message);
    throw error;
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  example().catch(console.error);
}

export { OTATicketActivation, ActivateTicketRequest, ActivateTicketResponse };
/**
 * OTA Bulk Ticket Generation Example
 *
 * Demonstrates how to generate pre-made tickets in bulk for OTA platform integration.
 * These tickets can later be activated by customers through the activation endpoint.
 */

interface BulkGenerateRequest {
  product_id: number;
  quantity: number;
  batch_id: string;
}

interface BulkGenerateResponse {
  tickets: Array<{
    ticket_code: string;
    product_id: number;
    batch_id: string;
    status: 'PRE_GENERATED';
    created_at: string;
  }>;
  total_generated: number;
}

class OTABulkGeneration {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = 'http://localhost:8080', apiKey: string = 'test-api-key') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Generate pre-made tickets in bulk for OTA sales
   */
  async bulkGenerateTickets(request: BulkGenerateRequest): Promise<BulkGenerateResponse> {
    const response = await fetch(`${this.baseUrl}/api/ota/tickets/bulk-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Bulk generation failed: ${error.message || response.statusText}`);
    }

    return response.json();
  }
}

// Example usage
async function example() {
  const ota = new OTABulkGeneration();

  try {
    console.log('🎫 Generating bulk tickets for cruise package...');

    const result = await ota.bulkGenerateTickets({
      product_id: 106, // Premium cruise package
      quantity: 10,
      batch_id: `BATCH_${Date.now()}`
    });

    console.log('✅ Bulk generation successful!');
    console.log(`Generated ${result.total_generated} tickets:`);

    result.tickets.forEach((ticket, index) => {
      console.log(`  ${index + 1}. ${ticket.ticket_code} (${ticket.status})`);
    });

    return result;
  } catch (error) {
    console.error('❌ Bulk generation failed:', error.message);
    throw error;
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  example().catch(console.error);
}

export { OTABulkGeneration, BulkGenerateRequest, BulkGenerateResponse };
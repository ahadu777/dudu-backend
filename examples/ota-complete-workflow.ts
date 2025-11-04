/**
 * Complete OTA Workflow Example
 *
 * Demonstrates the complete end-to-end workflow for OTA platform integration:
 * 1. Bulk generate pre-made tickets
 * 2. Activate ticket when customer purchases
 * 3. Retrieve orders and tickets for customer delivery
 */

import { OTABulkGeneration } from './ota-bulk-generation';
import { OTATicketActivation, ActivateTicketResponse } from './ota-ticket-activation';
import { OTAOrderManagement } from './ota-order-management';

class OTACompleteWorkflow {
  private bulkGeneration: OTABulkGeneration;
  private ticketActivation: OTATicketActivation;
  private orderManagement: OTAOrderManagement;

  constructor(baseUrl: string = 'http://localhost:8080', apiKey: string = 'test-api-key') {
    this.bulkGeneration = new OTABulkGeneration(baseUrl, apiKey);
    this.ticketActivation = new OTATicketActivation(baseUrl, apiKey);
    this.orderManagement = new OTAOrderManagement(baseUrl, apiKey);
  }

  /**
   * Complete workflow: Generate tickets → Activate → Retrieve order
   */
  async runCompleteWorkflow() {
    console.log('🚀 Starting complete OTA workflow...\n');

    try {
      // Step 1: Bulk generate tickets
      console.log('Step 1: 🎫 Generating bulk tickets...');
      const batchId = `WORKFLOW_${Date.now()}`;
      const generation = await this.bulkGeneration.bulkGenerateTickets({
        product_id: 106, // Premium cruise package
        quantity: 5,
        batch_id: batchId
      });

      console.log(`✅ Generated ${generation.total_generated} tickets in batch ${batchId}`);
      const firstTicket = generation.tickets[0];
      console.log(`   First ticket: ${firstTicket.ticket_code}\n`);

      // Step 2: Simulate customer purchase - activate first ticket
      console.log('Step 2: 🎟️ Customer purchasing ticket...');
      const activation = await this.ticketActivation.activateTicket({
        ticket_code: firstTicket.ticket_code,
        customer_name: 'Elena Rodriguez',
        customer_email: 'elena.rodriguez@example.com'
      });

      console.log(`✅ Ticket activated for ${activation.customer_name}`);
      console.log(`   Order ID: ${activation.order_id}`);
      console.log(`   Confirmation: ${activation.confirmation_code}\n`);

      // Step 3: Retrieve customer order and tickets
      console.log('Step 3: 📋 Retrieving customer order...');
      const orders = await this.orderManagement.listOrders({
        limit: 1,
        status: 'confirmed'
      });

      if (orders.orders.length > 0) {
        const customerOrder = orders.orders[0];
        console.log(`✅ Found order: ${customerOrder.order_id} for ${customerOrder.customer_name}`);

        // Get tickets with QR codes
        const tickets = await this.orderManagement.getOrderTickets(customerOrder.order_id);
        console.log(`   Retrieved ${tickets.tickets.length} tickets with QR codes`);

        const ticket = tickets.tickets[0];
        console.log(`   Ticket: ${ticket.ticket_code} (${ticket.status})`);
        console.log(`   Entitlements: ${ticket.entitlements.map(e => `${e.function_code}(${e.remaining_uses})`).join(', ')}`);
      }

      console.log('\n🎉 Complete workflow successful!');
      console.log('OTA integration is ready for production use.');

      return {
        generation,
        activation,
        orders: orders.orders.length > 0 ? orders.orders[0] : null
      };

    } catch (error) {
      console.error('❌ Workflow failed:', error.message);
      throw error;
    }
  }

  /**
   * Demonstrate bulk operations for high-volume OTA scenarios
   */
  async demonstrateBulkOperations() {
    console.log('📦 Demonstrating bulk operations for high-volume OTA...\n');

    try {
      // Generate large batch for OTA inventory
      console.log('Generating 50 tickets for OTA inventory...');
      const bulkGeneration = await this.bulkGeneration.bulkGenerateTickets({
        product_id: 107, // Standard cruise package
        quantity: 50,
        batch_id: `BULK_${Date.now()}`
      });

      console.log(`✅ Generated ${bulkGeneration.total_generated} tickets for OTA distribution`);

      // Simulate multiple customer activations
      console.log('\nSimulating 3 customer purchases...');
      const customers = [
        { name: 'John Smith', email: 'john.smith@example.com' },
        { name: 'Sarah Johnson', email: 'sarah.johnson@example.com' },
        { name: 'Michael Chen', email: 'michael.chen@example.com' }
      ];

      const activations: ActivateTicketResponse[] = [];
      for (let i = 0; i < 3; i++) {
        const ticket = bulkGeneration.tickets[i];
        const customer = customers[i];

        const activation = await this.ticketActivation.activateTicket({
          ticket_code: ticket.ticket_code,
          customer_name: customer.name,
          customer_email: customer.email
        });

        activations.push(activation);
        console.log(`   ✅ ${customer.name}: ${activation.order_id}`);
      }

      console.log('\n📊 Bulk operations summary:');
      console.log(`   Pre-made tickets: ${bulkGeneration.total_generated}`);
      console.log(`   Activated tickets: ${activations.length}`);
      console.log(`   Available for sale: ${bulkGeneration.total_generated - activations.length}`);

      return { bulkGeneration, activations };

    } catch (error) {
      console.error('❌ Bulk operations failed:', error.message);
      throw error;
    }
  }
}

// Example usage
async function main() {
  const workflow = new OTACompleteWorkflow();

  try {
    // Run complete workflow
    await workflow.runCompleteWorkflow();

    console.log('\n' + '='.repeat(60) + '\n');

    // Demonstrate bulk operations
    await workflow.demonstrateBulkOperations();

  } catch (error) {
    console.error('Main workflow failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { OTACompleteWorkflow };
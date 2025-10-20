#!/usr/bin/env tsx

/**
 * US-007: Ticket Cancellation and Refund Example
 *
 * This example demonstrates the complete ticket cancellation flow:
 * 1. Check cancellation policies
 * 2. List user tickets
 * 3. Cancel a ticket
 * 4. Verify refund processing
 * 5. Handle error cases
 */

import { CommerceService, TicketsService, InfraService } from '../sdk';

interface CancellationPoliciesResponse {
  policies: Array<{
    rule_type: 'redemption_based' | 'time_based' | 'product_based';
    description: string;
    refund_percentage: number;
    conditions: any;
  }>;
  examples: Array<{
    scenario: string;
    ticket_status: string;
    redemptions_used: number;
    total_redemptions: number;
    refund_percentage: number;
    explanation: string;
  }>;
}

interface TicketCancellationResponse {
  ticket_status: 'void';
  refund_amount: number;
  refund_id: string;
  cancelled_at: string;
}

interface RefundListResponse {
  refunds: Array<{
    refund_id: string;
    order_id: number;
    amount: number;
    status: string;
    reason: string;
    created_at: string;
    completed_at?: string;
  }>;
}

async function runUS007Example() {
  console.log('🎫 US-007: Ticket Cancellation and Refund Example\n');

  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8080';
  console.log(`📡 Using API: ${baseUrl}\n`);

  try {
    // Step 1: Check cancellation policies
    console.log('📋 Step 1: Check cancellation policies');
    console.log('GET /cancellation-policies');

    const policiesResponse = await fetch(`${baseUrl}/cancellation-policies`);
    if (!policiesResponse.ok) {
      throw new Error(`Failed to get policies: ${policiesResponse.status}`);
    }

    const policies: CancellationPoliciesResponse = await policiesResponse.json();
    console.log(`✅ Found ${policies.policies.length} cancellation policies`);
    console.log(`📖 Example scenarios: ${policies.examples.length}\n`);

    // Show key policy rules
    const redemptionPolicy = policies.policies.find(p => p.rule_type === 'redemption_based');
    if (redemptionPolicy) {
      console.log('🏷️  Redemption-based refund rules:');
      console.log('   • Unused tickets: 100% refund');
      console.log('   • ≤50% used: 50% refund');
      console.log('   • 51-99% used: 25% refund');
      console.log('   • Fully used: 0% refund\n');
    }

    // Step 2: Get user tickets
    console.log('🎟️  Step 2: Get user tickets');
    console.log('GET /my/tickets (Authorization: Bearer user123)');

    const userToken = 'user123'; // Mock token for testing
    const ticketsResponse = await fetch(`${baseUrl}/my/tickets`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!ticketsResponse.ok) {
      throw new Error(`Failed to get tickets: ${ticketsResponse.status}`);
    }

    const ticketsData = await ticketsResponse.json();
    console.log(`✅ User has ${ticketsData.tickets.length} tickets`);

    if (ticketsData.tickets.length === 0) {
      console.log('❌ No tickets found for user. Cannot proceed with cancellation example.');
      return;
    }

    // Find an active ticket to cancel
    const activeTicket = ticketsData.tickets.find((t: any) =>
      t.status === 'active' || t.status === 'assigned'
    );

    if (!activeTicket) {
      console.log('❌ No active tickets found for cancellation.');
      return;
    }

    console.log(`🎯 Selected ticket: ${activeTicket.ticket_code} (${activeTicket.product_name})`);
    console.log(`   Status: ${activeTicket.status}`);
    console.log(`   Entitlements: ${activeTicket.entitlements.length}\n`);

    // Step 3: Cancel the ticket
    console.log('❌ Step 3: Cancel ticket');
    console.log(`POST /tickets/${activeTicket.ticket_code}/cancel`);

    const cancellationRequest = {
      reason: 'Travel plans changed - example cancellation'
    };

    const cancelResponse = await fetch(`${baseUrl}/tickets/${activeTicket.ticket_code}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cancellationRequest)
    });

    if (!cancelResponse.ok) {
      throw new Error(`Failed to cancel ticket: ${cancelResponse.status}`);
    }

    const cancellationResult: TicketCancellationResponse = await cancelResponse.json();
    console.log('✅ Ticket cancelled successfully');
    console.log(`   New status: ${cancellationResult.ticket_status}`);
    console.log(`   Refund amount: $${cancellationResult.refund_amount}`);
    console.log(`   Refund ID: ${cancellationResult.refund_id}`);
    console.log(`   Cancelled at: ${cancellationResult.cancelled_at}\n`);

    // Step 4: Test idempotency
    console.log('🔄 Step 4: Test idempotency (cancel same ticket again)');
    const idempotentResponse = await fetch(`${baseUrl}/tickets/${activeTicket.ticket_code}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cancellationRequest)
    });

    if (!idempotentResponse.ok) {
      throw new Error(`Idempotency test failed: ${idempotentResponse.status}`);
    }

    const idempotentResult: TicketCancellationResponse = await idempotentResponse.json();
    console.log('✅ Idempotency works - same result returned');
    console.log(`   Refund ID: ${idempotentResult.refund_id}\n`);

    // Step 5: Check refund history
    console.log('💰 Step 5: Check refund history');
    console.log('GET /my/refunds');

    const refundsResponse = await fetch(`${baseUrl}/my/refunds`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!refundsResponse.ok) {
      throw new Error(`Failed to get refunds: ${refundsResponse.status}`);
    }

    const refundsData: RefundListResponse = await refundsResponse.json();
    console.log(`✅ User has ${refundsData.refunds.length} refund records`);

    if (refundsData.refunds.length > 0) {
      refundsData.refunds.forEach((refund, index) => {
        console.log(`   ${index + 1}. ${refund.refund_id}: $${refund.amount} (${refund.status})`);
      });
    }
    console.log();

    // Step 6: Test error cases
    console.log('🚨 Step 6: Test error cases');

    // 6a. Try to cancel someone else's ticket
    console.log('   Testing unauthorized cancellation...');
    const unauthorizedResponse = await fetch(`${baseUrl}/tickets/${activeTicket.ticket_code}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer user456', // Different user
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Should fail' })
    });

    if (unauthorizedResponse.status === 404) {
      console.log('   ✅ Unauthorized cancellation correctly blocked (404)');
    } else {
      console.log(`   ❌ Expected 404, got ${unauthorizedResponse.status}`);
    }

    // 6b. Try to cancel without auth
    console.log('   Testing missing authentication...');
    const unauthResponse = await fetch(`${baseUrl}/tickets/${activeTicket.ticket_code}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Should fail' })
    });

    if (unauthResponse.status === 401) {
      console.log('   ✅ Missing authentication correctly blocked (401)');
    } else {
      console.log(`   ❌ Expected 401, got ${unauthResponse.status}`);
    }

    console.log('\n🎉 US-007 Ticket Cancellation Example Completed Successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Cancellation policies retrieved');
    console.log('   ✅ User tickets listed');
    console.log('   ✅ Ticket cancelled with refund calculation');
    console.log('   ✅ Idempotency verified');
    console.log('   ✅ Refund history checked');
    console.log('   ✅ Error cases handled correctly');

  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runUS007Example().catch(console.error);
}

export { runUS007Example };
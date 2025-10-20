/**
 * US-003 Example: Buyer views tickets & QR
 *
 * This example demonstrates the buyer's mobile app experience:
 * 1. View purchased tickets
 * 2. Check entitlements and usage
 * 3. Generate QR codes for redemption
 * 4. Handle multiple tickets
 */

import { OpenAPI } from '../sdk';

// Configure the SDK
OpenAPI.BASE = process.env.API_BASE || 'http://localhost:8080';

async function runUS003Example() {
  console.log('🚀 US-003: Buyer Views Tickets & QR\n');

  try {
    // 1. View My Tickets
    console.log('🎫 Step 1: View My Tickets');
    const ticketsResponse = await fetch(`${OpenAPI.BASE}/my/tickets`, {
      headers: { 'Authorization': 'Bearer user123' }
    });

    if (!ticketsResponse.ok) {
      throw new Error(`Failed to fetch tickets: ${ticketsResponse.status}`);
    }

    const tickets = await ticketsResponse.json() as any;
    console.log(`Found ${tickets.tickets.length} tickets for user123\n`);

    if (tickets.tickets.length === 0) {
      console.log('⚠️ No tickets found. Run US-001 first to purchase tickets.');
      return;
    }

    // 2. Display Ticket Details
    console.log('📋 Step 2: Ticket Details');
    tickets.tickets.forEach((ticket: any, index: number) => {
      console.log(`Ticket ${index + 1}: ${ticket.ticket_code}`);
      console.log(`  Product: ${ticket.product_name}`);
      console.log(`  Status: ${ticket.status}`);
      console.log(`  Order ID: ${ticket.order_id}`);

      if (ticket.entitlements && ticket.entitlements.length > 0) {
        console.log(`  Entitlements:`);
        ticket.entitlements.forEach((ent: any) => {
          const percentage = Math.round((ent.remaining_uses / ent.max_uses) * 100);
          console.log(`    • ${ent.function_name}: ${ent.remaining_uses}/${ent.max_uses} uses (${percentage}% remaining)`);
        });
      }
      console.log('');
    });

    // 3. Generate QR Codes
    console.log('📱 Step 3: Generate QR Codes');
    const qrTokens: any[] = [];

    for (const [index, ticket] of tickets.tickets.entries()) {
      console.log(`Generating QR for ticket ${index + 1}: ${ticket.ticket_code}`);

      const qrResponse = await fetch(`${OpenAPI.BASE}/tickets/${ticket.ticket_code}/qr-token`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer user123' }
      });

      if (qrResponse.ok) {
        const qr = await qrResponse.json() as any;
        qrTokens.push({ ticket_code: ticket.ticket_code, qr_token: qr.qr_token, expires_at: qr.expires_at });
        console.log(`  ✅ QR generated: ${qr.qr_token.substring(0, 30)}...`);
        console.log(`  ⏰ Expires: ${qr.expires_at}`);
      } else {
        const error = await qrResponse.json() as any;
        console.log(`  ❌ QR generation failed: ${error.message || 'Unknown error'}`);
      }
      console.log('');
    }

    // 4. Mobile App Simulation
    console.log('📱 Step 4: Mobile App User Interface Simulation');
    console.log('='.repeat(50));
    console.log('📱 MY TICKETS APP');
    console.log('='.repeat(50));

    tickets.tickets.forEach((ticket: any, index: number) => {
      console.log(`\n🎫 ${ticket.product_name}`);
      console.log(`   Ticket: ${ticket.ticket_code}`);
      console.log(`   Status: ${ticket.status === 'ACTIVE' ? '🟢 Active' : '🔴 Inactive'}`);

      if (ticket.entitlements) {
        console.log(`   Available:`);
        ticket.entitlements.forEach((ent: any) => {
          const icon = ent.function_code === 'ferry' ? '🚢' : ent.function_code === 'bus' ? '🚌' : '🚇';
          console.log(`   ${icon} ${ent.function_name}: ${ent.remaining_uses} uses left`);
        });
      }

      const qrToken = qrTokens.find(q => q.ticket_code === ticket.ticket_code);
      if (qrToken) {
        console.log(`   📱 [SHOW QR CODE] (Expires in 5 min)`);
      } else {
        console.log(`   📱 [GENERATE QR CODE]`);
      }
      console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    });

    // 5. QR Code Management
    console.log('\n🔄 Step 5: QR Code Management');
    if (qrTokens.length > 0) {
      console.log('Active QR codes:');
      qrTokens.forEach((qr, index) => {
        const expiresAt = new Date(qr.expires_at);
        const now = new Date();
        const minutesLeft = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / 60000));

        console.log(`  ${index + 1}. ${qr.ticket_code}: ${minutesLeft} minutes remaining`);
      });

      // Demonstrate QR refresh
      const firstTicket = tickets.tickets[0];
      console.log(`\n🔄 Refreshing QR code for ${firstTicket.ticket_code}...`);

      const refreshResponse = await fetch(`${OpenAPI.BASE}/tickets/${firstTicket.ticket_code}/qr-token`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer user123' }
      });

      if (refreshResponse.ok) {
        const newQr = await refreshResponse.json() as any;
        console.log(`✅ New QR generated: ${newQr.qr_token.substring(0, 30)}...`);
        console.log(`⏰ Fresh expiry: ${newQr.expires_at}`);
      }
    }

    // 6. Usage Statistics
    console.log('\n📊 Step 6: Usage Statistics');
    const totalEntitlements = tickets.tickets.reduce((total: number, ticket: any) => {
      return total + (ticket.entitlements?.length || 0);
    }, 0);

    const usedEntitlements = tickets.tickets.reduce((used: number, ticket: any) => {
      return used + (ticket.entitlements?.reduce((ticketUsed: number, ent: any) => {
        return ticketUsed + ent.used_count;
      }, 0) || 0);
    }, 0);

    console.log(`Total entitlements: ${totalEntitlements}`);
    console.log(`Total redemptions: ${usedEntitlements}`);
    console.log(`Available for use: ${totalEntitlements - usedEntitlements}`);

    console.log('\n✅ US-003 Complete: Buyer ticket viewing and QR management!');
    console.log('💡 QR codes ready for scanning at gates');

  } catch (error) {
    console.error('❌ Error in US-003 flow:', error);
    process.exit(1);
  }
}

// Run example if called directly
if (require.main === module) {
  runUS003Example()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Example failed:', error);
      process.exit(1);
    });
}

export { runUS003Example };
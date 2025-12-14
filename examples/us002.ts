/**
 * US-002 Example: Operator scan & redemption
 *
 * This example demonstrates the operator workflow:
 * 1. Operator authentication
 * 2. Create validator session
 * 3. Scan QR codes and redeem tickets
 * 4. Handle different scenarios (valid, invalid, replay)
 */

import { OpenAPI } from '../sdk';

// Configure the SDK
OpenAPI.BASE = process.env.API_BASE || 'http://localhost:8080';

async function runUS002Example() {
  console.log('🚀 US-002: Operator Scan & Redemption\n');

  try {
    // 1. Operator Authentication
    console.log('👮 Step 1: Operator Authentication');
    const loginResponse = await fetch(`${OpenAPI.BASE}/operators/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        password: 'secret123'
      })
    });

    const operator = await loginResponse.json() as any;
    console.log(`Operator authenticated: ${operator.operator_id}`);
    console.log(`Token expires: ${operator.expires_at}\n`);

    // 2. Create Validator Session
    console.log('🔧 Step 2: Create Validator Session');
    const sessionResponse = await fetch(`${OpenAPI.BASE}/validators/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${operator.operator_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_id: 'gate-01',
        location_id: 52
      })
    });

    const session = await sessionResponse.json() as any;
    console.log(`Session created: ${session.session_id}`);
    console.log(`Device: ${session.device_id} at location ${session.location_id}\n`);

    // 3. Create Multiple Sessions (Multi-gate scenario)
    console.log('🚪 Step 3: Create Additional Sessions');
    const devices = ['gate-02', 'gate-03'];
    const sessions = [session];

    for (const deviceId of devices) {
      const additionalSessionResponse = await fetch(`${OpenAPI.BASE}/validators/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${operator.operator_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_id: deviceId,
          location_id: 52
        })
      });

      if (additionalSessionResponse.ok) {
        const additionalSession = await additionalSessionResponse.json() as any;
        sessions.push(additionalSession);
        console.log(`Additional session: ${additionalSession.session_id} (${deviceId})`);
      }
    }
    console.log(`Total active sessions: ${sessions.length}\n`);

    // 4. Demonstrate Scanning (requires QR token from US-001 or existing tickets)
    console.log('🔍 Step 4: Simulate Ticket Scanning');
    console.log('Note: For actual scanning, QR tokens are needed from ticket holders\n');

    // Get existing tickets to demonstrate with
    const ticketsResponse = await fetch(`${OpenAPI.BASE}/my/tickets`, {
      headers: { 'Authorization': 'Bearer user123' }
    });

    if (ticketsResponse.ok) {
      const tickets = await ticketsResponse.json() as any;
      if (tickets.tickets && tickets.tickets.length > 0) {
        const ticket = tickets.tickets[0];
        console.log(`Found test ticket: ${ticket.ticket_code}`);

        // Try to generate QR for testing
        const qrResponse = await fetch(`${OpenAPI.BASE}/tickets/${ticket.ticket_code}/qr-token`, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer user123' }
        });

        if (qrResponse.ok) {
          const qr = await qrResponse.json() as any;
          console.log(`Generated QR token for testing: ${qr.qr_token.substring(0, 50)}...\n`);

          // Test different function codes
          const functions = ['ferry', 'bus', 'mrt'];

          for (const functionCode of functions) {
            console.log(`🚢 Testing ${functionCode} redemption:`);

            const scanResponse = await fetch(`${OpenAPI.BASE}/venue/scan`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${operatorToken}`
              },
              body: JSON.stringify({
                qr_token: qr.qr_token,
                function_code: functionCode,
                venue_code: 'central-pier',
                terminal_device_id: 'gate-01'
              })
            });

            if (scanResponse.ok) {
              const scan = await scanResponse.json() as any;
              console.log(`  Result: ${scan.result}, Remaining: ${scan.remaining_uses}`);
            } else {
              const error = await scanResponse.json() as any;
              console.log(`  Error: ${error.error_code} - ${error.message}`);
            }
          }

          // Test replay protection
          console.log('\n🔒 Step 5: Test Replay Protection');
          const replayResponse = await fetch(`${OpenAPI.BASE}/venue/scan`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${operatorToken}`
            },
            body: JSON.stringify({
              qr_token: qr.qr_token,
              function_code: 'ferry',
              venue_code: 'central-pier',
              terminal_device_id: 'gate-01'
            })
          });

          if (replayResponse.status === 409) {
            console.log('✅ Replay protection working correctly (409 Conflict)');
          } else {
            console.log('⚠️ Replay protection may not be implemented yet');
          }

        } else {
          console.log('⚠️ QR token generation not yet implemented');
        }
      } else {
        console.log('⚠️ No tickets found for testing. Run US-001 first to create tickets.');
      }
    }

    console.log('\n✅ US-002 Complete: Operator workflow demonstrated!');
    console.log('💡 Ready to scan QR codes from ticket holders');

  } catch (error) {
    console.error('❌ Error in US-002 flow:', error);
    process.exit(1);
  }
}

// Run example if called directly
if (require.main === module) {
  runUS002Example()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Example failed:', error);
      process.exit(1);
    });
}

export { runUS002Example };
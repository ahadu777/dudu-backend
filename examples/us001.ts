/**
 * US-001 Example (v0.4.1): Buy package and redeem via QR
 *
 * Flow:
 * 1. GET /catalog
 * 2. POST /orders
 * 3. POST /payments/notify
 * 4. GET /my/tickets
 * 5. POST /tickets/{code}/qr-token   -> { token, expires_in }
 * 6. POST /operators/login           -> { operator_token }
 * 7. POST /validators/sessions       -> { session_id, expires_in }
 * 8. POST /tickets/scan              -> { result, ticket_status, entitlements[] }
 *
 * Notes:
 * - Catalog items are { id, name } (not product_id/product_name)
 * - Send scan body.qr_token = token returned from QR step
 * - Read remaining uses from entitlements[] (match by function_code)
 */

import { OpenAPI } from '../sdk';

OpenAPI.BASE = process.env.API_BASE || 'http://localhost:8080';
const USER_TOKEN = process.env.USER_TOKEN || 'user123';

async function runUS001Example() {
  console.log('🚀 US-001: Complete Buy and Redeem Flow\n');

  const base = OpenAPI.BASE;

  const ok = (r: Response, label: string) => {
    if (!r.ok) throw new Error(`${label} failed: ${r.status} ${r.statusText}`);
    return r;
  };

  try {
    // 1) Catalog
    console.log('📋 1) Catalog');
    const catalog: any = await fetch(`${base}/catalog`).then(r => ok(r, 'catalog').json());
    const product = catalog.products.find((p: any) => p.id === 101) ?? catalog.products[0];
    if (!product) throw new Error('No products available');
    console.log(`Products: ${catalog.products.length}; chosen: ${product.id} – ${product.name}\n`);

    // 2) Create Order
    console.log('🛒 2) Create Order');
    const orderPayload = {
      items: [{ product_id: product.id, qty: 1 }],
      channel_id: 1,
      out_trade_no: `us001-${Date.now()}`
    };
    const order: any = await fetch(`${base}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    }).then(r => ok(r, 'order').json());
    console.log(`Order: ${order.order_id}, status=${order.status}\n`);

    // 3) Payment Notify (mock)
    console.log('💳 3) Payment Notify');
    await fetch(`${base}/payments/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.order_id,
        payment_status: 'SUCCESS',
        paid_at: new Date().toISOString(),
        signature: 'valid-mock-signature'
      })
    }).then(r => ok(r, 'payment notify').text());
    console.log('Payment processed.\n');

    // 4) My Tickets
    console.log('🎫 4) My Tickets');
    const my: any = await fetch(`${base}/my/tickets`, {
      headers: { Authorization: `Bearer ${USER_TOKEN}` }
    }).then(r => ok(r, 'my tickets').json());
    if (!my.tickets?.length) throw new Error('No tickets for user');
    const newTicket = my.tickets.find((t: any) => t.order_id === order.order_id) ?? my.tickets[0];
    console.log(`Ticket: ${newTicket.ticket_code} (${newTicket.product_name})\n`);

    // 5) QR Token
    console.log('📱 5) QR Token');
    const qrResp: any = await fetch(`${base}/tickets/${newTicket.ticket_code}/qr-token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${USER_TOKEN}` }
    }).then(r => ok(r, 'qr token').json());
    const qrToken: string = qrResp.token; // { token, expires_in }
    console.log(`QR token: ${qrToken.slice(0, 40)}... (ttl=${qrResp.expires_in}s)\n`);

    // 6) Operator Login
    console.log('👮 6) Operator Login');
    const op: any = await fetch(`${base}/operators/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'secret123' })
    }).then(r => ok(r, 'operator login').json());
    const opToken: string = op.operator_token;

    // 7) Validator Session
    console.log('🛰️ 7) Validator Session');
    const sess: any = await fetch(`${base}/validators/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ device_id: 'gate-01', location_id: 52 })
    }).then(r => ok(r, 'validator session').json());
    console.log(`Session: ${sess.session_id}\n`);

    // 8) Scan & Redeem
    console.log('🔍 8) Scan & Redeem');
    const scan: any = await fetch(`${base}/tickets/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qr_token: qrToken,           // NOTE: field name is qr_token (spec)
        function_code: 'ferry',
        session_id: sess.session_id,
        location_id: 52
      })
    }).then(r => ok(r, 'scan').json());

    const ferryEnt = Array.isArray(scan.entitlements)
      ? scan.entitlements.find((e: any) => e.function_code === 'ferry')
      : null;

    console.log(`Result: ${scan.result}, ticket_status: ${scan.ticket_status}`);
    console.log(`Remaining uses (ferry): ${ferryEnt?.remaining_uses}\n`);
    console.log('✅ US-001 Complete');
  } catch (err) {
    console.error('❌ US-001 failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runUS001Example()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runUS001Example };
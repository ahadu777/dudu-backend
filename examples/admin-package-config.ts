/**
 * Admin Package Configuration Example
 *
 * Demonstrates:
 * 1. Idempotent template upsert and version history retrieval
 * 2. Route fare revisions (upsert, history, restore)
 * 3. Error handling for version conflicts and missing history
 */

import { OpenAPI } from '../sdk';

OpenAPI.BASE = process.env.API_BASE || 'http://localhost:8080';

interface TemplateUpsertResponse {
  templateId: string;
  version: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  idempotent: boolean;
}

interface TemplateHistoryResponse {
  templateId: string;
  versions: Array<{
    version: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface RouteFareResponse {
  routeCode: string;
  revision: number;
  lockMinutes: number;
  blackoutDates: string[];
  fares: Array<{
    passenger_type: 'adult' | 'child' | 'elderly';
    price: number;
    currency: string;
  }>;
  updatedAt: string;
}

async function ensureOk(response: Response, label: string) {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${label} failed: ${response.status} ${response.statusText} — ${body}`);
  }
  console.log(`✅ ${label}`);
  return response;
}

async function runAdminPackageConfigExample() {
  console.log('🎯 Admin Package Configuration Demo\n');

  const base = OpenAPI.BASE;
  const templatePayload = {
    name: 'Weekend Explorer',
    description: '2-day multi-attraction pass',
    status: 'draft',
    entitlements: [
      {
        function_code: 'museum',
        label: 'Museum entry',
        quantity: 2,
        redemption_channel: 'mobile',
        requires_id_verification: false,
        validity_type: 'relative',
        validity_duration_days: 7
      }
    ],
    pricing: {
      currency: 'USD',
      tiers: [
        {
          tier_id: 'base',
          name: 'Base',
          customer_types: ['adult'],
          price: 120,
          currency: 'USD'
        }
      ]
    }
  };

  try {
    console.log('📦 Step 1: Create initial template version (v1.0.0)');
    const createResponse = await ensureOk(
      await fetch(`${base}/admin/packages/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templatePayload)
      }),
      'POST /admin/packages/templates (create)'
    );
    const createBody = (await createResponse.json()) as TemplateUpsertResponse;
    console.log(`   → templateId=${createBody.templateId}, version=${createBody.version}, idempotent=${createBody.idempotent}`);

    console.log('♻️  Step 2: Re-send same payload (expect idempotent)');
    const idempotentResponse = await ensureOk(
      await fetch(`${base}/admin/packages/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templatePayload)
      }),
      'POST /admin/packages/templates (idempotent)'
    );
    const idempotentBody = (await idempotentResponse.json()) as TemplateUpsertResponse;
    console.log(`   → version=${idempotentBody.version}, idempotent=${idempotentBody.idempotent}`);

    console.log('🚀 Step 3: Publish new version (v1.0.1) with extra entitlement');
    const versionPayload = {
      ...templatePayload,
      version: 'v1.0.1',
      status: 'active',
      entitlements: [
        ...templatePayload.entitlements,
        {
          function_code: 'aquarium',
          label: 'Aquarium entry',
          quantity: 1,
          redemption_channel: 'operator',
          requires_id_verification: true,
          validity_type: 'absolute',
          validity_start_at: '2025-11-01T00:00:00Z',
          validity_end_at: '2026-01-31T23:59:59Z'
        }
      ]
    };

    await ensureOk(
      await fetch(`${base}/admin/packages/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(versionPayload)
      }),
      'POST /admin/packages/templates (v1.0.1)'
    );

    console.log('📚 Step 4: Fetch template version history');
    const historyResponse = await ensureOk(
      await fetch(`${base}/admin/packages/templates/${createBody.templateId}/versions`),
      'GET /admin/packages/templates/{templateId}/versions'
    );
    const history = (await historyResponse.json()) as TemplateHistoryResponse;
    console.log(`   → Versions available: ${history.versions.map(v => v.version).join(', ')}`);

    console.log('🛣️ Step 5: Upsert route fares (revision 1)');
    const routeCode = 'RT-001';
    const baseRoutePayload = {
      fares: [
        { passenger_type: 'adult', price: 35, currency: 'USD' },
        { passenger_type: 'child', price: 20, currency: 'USD' }
      ],
      lockMinutes: 45,
      blackoutDates: ['2025-12-31']
    };

    const routeCreateResponse = await ensureOk(
      await fetch(`${base}/admin/routes/fares/${routeCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseRoutePayload)
      }),
      'PUT /admin/routes/fares/{routeCode} (revision 1)'
    );
    const routeV1 = (await routeCreateResponse.json()) as RouteFareResponse;
    console.log(`   → revision=${routeV1.revision}, lockMinutes=${routeV1.lockMinutes}`);

    console.log('⚙️  Step 6: Update route fares (revision 2)');
    const routeUpdateResponse = await ensureOk(
      await fetch(`${base}/admin/routes/fares/${routeCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fares: [
            { passenger_type: 'adult', price: 32, currency: 'USD' },
            { passenger_type: 'child', price: 18, currency: 'USD' },
            { passenger_type: 'elderly', price: 15, currency: 'USD' }
          ],
          lockMinutes: 30
        })
      }),
      'PUT /admin/routes/fares/{routeCode} (revision 2)'
    );
    const routeV2 = (await routeUpdateResponse.json()) as RouteFareResponse;
    console.log(`   → revision=${routeV2.revision}, fares=${routeV2.fares.length}`);

    console.log('🧾 Step 7: Inspect route fare history');
    const routeHistoryResponse = await ensureOk(
      await fetch(`${base}/admin/routes/fares/${routeCode}/history`),
      'GET /admin/routes/fares/{routeCode}/history'
    );
    const routeHistory = (await routeHistoryResponse.json()) as { revisions: RouteFareResponse[] };
    console.log(`   → Recorded revisions: ${routeHistory.revisions.map(r => r.revision).join(', ')}`);

    console.log('⏪ Step 8: Restore previous revision');
    const restoreResponse = await ensureOk(
      await fetch(`${base}/admin/routes/fares/${routeCode}/restore`, { method: 'POST' }),
      'POST /admin/routes/fares/{routeCode}/restore'
    );
    const restored = (await restoreResponse.json()) as RouteFareResponse;
    console.log(`   → Active revision reverted to fares: ${restored.fares.map(f => `${f.passenger_type}:${f.price}`).join(', ')}`);

    console.log('🧪 Step 9: Negative case — template version conflict');
    const conflictResponse = await fetch(`${base}/admin/packages/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...versionPayload,
        description: 'Conflicting payload',
        version: 'v1.0.1'
      })
    });
    if (conflictResponse.status === 409) {
      console.log('   → Received expected 409 Template version conflict');
    } else {
      await ensureOk(conflictResponse, 'POST /admin/packages/templates (expected conflict)');
    }

    console.log('🧪 Step 10: Negative case — restore without history');
    const restoreAgain = await fetch(`${base}/admin/routes/fares/${routeCode}/restore`, { method: 'POST' });
    if (restoreAgain.status === 409) {
      console.log('   → Second restore blocked with 409 (no history)');
    } else {
      await ensureOk(restoreAgain, 'POST /admin/routes/fares/{routeCode}/restore (expected 409)');
    }

    console.log('\n🎉 Admin package configuration flow completed successfully.');
  } catch (error) {
    console.error('\n❌ Admin package configuration demo failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runAdminPackageConfigExample();
}

export { runAdminPackageConfigExample };

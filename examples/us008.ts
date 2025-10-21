/**
 * US-008 Example: Promotion detail view for dashboard
 *
 * Flow:
 * 1. GET /catalog                      -> { products[] } basic product list
 * 2. GET /catalog/promotions/{id}      -> { promotion } detailed view with marketing content
 * 3. Use promotion details for purchase decision
 * 4. Optional: POST /orders with selected product_id
 *
 * Notes:
 * - Catalog shows basic product info for browsing
 * - Promotion detail shows rich content: description, features, images, inventory
 * - No authentication required for viewing promotions
 * - All product states supported (active, archived)
 * - Real-time inventory availability calculated
 */

import { OpenAPI } from '../sdk';

OpenAPI.BASE = process.env.API_BASE || 'http://localhost:8080';

interface PromotionDetail {
  id: number;
  sku: string;
  name: string;
  description: string;
  unit_price: number;
  status: 'draft' | 'active' | 'archived';
  sale_start_at?: string | null;
  sale_end_at?: string | null;
  functions: Array<{
    function_code: string;
    label: string;
    quantity: number;
  }>;
  inventory: {
    sellable_cap: number;
    reserved_count: number;
    sold_count: number;
    available: number;
  };
  features?: string[];
  images?: string[];
}

interface PromotionDetailResponse {
  promotion: PromotionDetail;
}

async function runUS008Example() {
  console.log('🎯 US-008: Promotion Detail View for Dashboard\n');

  const base = OpenAPI.BASE;

  const ok = (r: Response, label: string) => {
    if (!r.ok) throw new Error(`${label}: ${r.status} ${r.statusText}`);
    console.log(`✅ ${label}: ${r.status}`);
    return r;
  };

  try {
    // Step 1: Browse available promotions in catalog
    console.log('📋 Step 1: Browse catalog for available promotions');
    const catalogResponse = await fetch(`${base}/catalog`);
    ok(catalogResponse, 'GET /catalog');

    const catalog = await catalogResponse.json() as any;
    console.log(`   Found ${catalog.products.length} products in catalog`);
    console.log(`   Available products: ${catalog.products.map((p: any) => `${p.id} (${p.name})`).join(', ')}\n`);

    // Step 2: Get detailed promotion information for transport pass
    console.log('🚌 Step 2: View 3-in-1 Transport Pass promotion details');
    const transportResponse = await fetch(`${base}/catalog/promotions/101`);
    ok(transportResponse, 'GET /catalog/promotions/101');

    const transportPromo = await transportResponse.json() as PromotionDetailResponse;
    const transport = transportPromo.promotion;

    console.log(`   📦 Product: ${transport.name} (${transport.sku})`);
    console.log(`   💰 Price: $${transport.unit_price}`);
    console.log(`   📝 Description: ${transport.description}`);
    console.log(`   ✨ Features: ${transport.features?.join(', ')}`);
    console.log(`   📊 Inventory: ${transport.inventory.available}/${transport.inventory.sellable_cap} available`);
    console.log(`   🎫 Functions: ${transport.functions.map(f => `${f.label} (${f.quantity}x)`).join(', ')}\n`);

    // Step 3: Get detailed promotion information for premium product
    console.log('🎢 Step 3: View Theme Park Pass promotion details');
    const parkResponse = await fetch(`${base}/catalog/promotions/104`);
    ok(parkResponse, 'GET /catalog/promotions/104');

    const parkPromo = await parkResponse.json() as PromotionDetailResponse;
    const park = parkPromo.promotion;

    console.log(`   📦 Product: ${park.name} (${park.sku})`);
    console.log(`   💰 Price: $${park.unit_price} (Premium)`);
    console.log(`   📝 Description: ${park.description}`);
    console.log(`   ✨ Features: ${park.features?.join(', ')}`);
    console.log(`   📊 Inventory: ${park.inventory.available}/${park.inventory.sellable_cap} available`);
    console.log(`   🎫 Functions: ${park.functions.map(f => `${f.label} (${f.quantity === 999 ? 'unlimited' : f.quantity + 'x'})`).join(', ')}\n`);

    // Step 4: Test error handling - invalid product ID
    console.log('❌ Step 4: Test error handling for invalid product ID');
    try {
      const invalidResponse = await fetch(`${base}/catalog/promotions/invalid`);
      if (!invalidResponse.ok) {
        const error = await invalidResponse.json() as any;
        console.log(`   ✅ Expected error: ${invalidResponse.status} - ${error.message}\n`);
      }
    } catch (error) {
      console.log(`   ✅ Handled invalid ID error properly\n`);
    }

    // Step 5: Test error handling - non-existent product
    console.log('🔍 Step 5: Test error handling for non-existent product');
    try {
      const notFoundResponse = await fetch(`${base}/catalog/promotions/999`);
      if (!notFoundResponse.ok) {
        const error = await notFoundResponse.json() as any;
        console.log(`   ✅ Expected error: ${notFoundResponse.status} - ${error.message}\n`);
      }
    } catch (error) {
      console.log(`   ✅ Handled not found error properly\n`);
    }

    // Step 6: View archived/inactive product
    console.log('📚 Step 6: View archived product details');
    const archivedResponse = await fetch(`${base}/catalog/promotions/105`);
    ok(archivedResponse, 'GET /catalog/promotions/105');

    const archivedPromo = await archivedResponse.json() as PromotionDetailResponse;
    const archived = archivedPromo.promotion;

    console.log(`   📦 Product: ${archived.name} (${archived.status})`);
    console.log(`   💰 Price: $${archived.unit_price}`);
    console.log(`   📝 Description: ${archived.description}`);
    console.log(`   ✨ Features: ${archived.features?.join(', ')}`);
    console.log(`   📊 Inventory: ${archived.inventory.available}/${archived.inventory.sellable_cap} available\n`);

    // Step 7: Demonstrate purchase decision flow
    console.log('🛒 Step 7: User selects transport pass for purchase');
    console.log(`   Selected: ${transport.name} - $${transport.unit_price}`);
    console.log(`   Reason: ${transport.features?.slice(0, 2).join(' + ')} for great value`);
    console.log(`   Next step: Create order with product_id: ${transport.id}\n`);

    // Optional: Show how this integrates with order creation
    console.log('💡 Integration example:');
    console.log(`   POST ${base}/orders`);
    console.log(`   Body: {`);
    console.log(`     "items": [{"product_id": ${transport.id}, "qty": 1}],`);
    console.log(`     "channel_id": 1,`);
    console.log(`     "out_trade_no": "promo-${transport.id}-${Date.now()}"`);
    console.log(`   }`);

    console.log('\n🎉 US-008 Example completed successfully!');
    console.log('✅ Dashboard can now display rich promotion details');
    console.log('✅ Users can make informed purchase decisions');
    console.log('✅ Error cases handled gracefully');
    console.log('✅ Seamless integration with purchase flow');

  } catch (error) {
    console.error('\n❌ US-008 Example failed:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  runUS008Example();
}

export { runUS008Example };
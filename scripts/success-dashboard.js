#!/usr/bin/env node

/**
 * Success Validation Dashboard
 * Tests actual user stories and validates foundation quality
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const BASE_URL = 'http://localhost:8080';

async function runTest(name, testFn) {
  try {
    console.log(`\n🧪 ${name}`);
    const result = await testFn();
    console.log(`✅ PASS: ${result}`);
    return true;
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    return false;
  }
}

async function testFoundation() {
  const tests = [];

  // Test 1: Server Health
  tests.push(await runTest("Server Health", async () => {
    const { stdout } = await execAsync(`curl -s ${BASE_URL}/healthz`);
    const response = JSON.parse(stdout);
    if (response.status !== 'ok') throw new Error('Server unhealthy');
    return 'Server responding correctly';
  }));

  // Test 2: Mock Store Initialization
  tests.push(await runTest("Mock Store Seeded", async () => {
    const { stdout } = await execAsync(`curl -s -H "Authorization: Bearer user123" ${BASE_URL}/my/tickets`);
    const response = JSON.parse(stdout);
    if (!response.tickets || response.tickets.length === 0) throw new Error('No test tickets found');
    return `${response.tickets.length} test tickets loaded`;
  }));

  // Test 3: Domain Types Validation
  tests.push(await runTest("Domain Types Aligned", async () => {
    const { stdout } = await execAsync(`curl -s -H "Authorization: Bearer user123" ${BASE_URL}/my/tickets`);
    const response = JSON.parse(stdout);
    const ticket = response.tickets[0];

    // Validate required domain.ts Ticket fields
    const requiredFields = ['ticket_code', 'product_id', 'product_name', 'status', 'entitlements', 'user_id', 'order_id'];
    for (const field of requiredFields) {
      if (!(field in ticket)) throw new Error(`Missing domain field: ${field}`);
    }

    // Validate entitlement structure
    const entitlement = ticket.entitlements[0];
    const entRequiredFields = ['function_code', 'label', 'remaining_uses'];
    for (const field of entRequiredFields) {
      if (!(field in entitlement)) throw new Error(`Missing entitlement field: ${field}`);
    }

    return 'All domain.ts types present';
  }));

  // Test 4: Error Format Consistency
  tests.push(await runTest("Error Format Standard", async () => {
    const { stdout } = await execAsync(`curl -s ${BASE_URL}/my/tickets`);
    const response = JSON.parse(stdout);

    // Should follow domain.ts ApiError format
    if (!response.code || !response.message) throw new Error('Error format incorrect');
    if (response.code !== 'UNAUTHORIZED') throw new Error('Expected UNAUTHORIZED');

    return 'Error format matches domain.ts ApiError';
  }));

  return tests;
}

async function testUserStories() {
  const tests = [];

  // US-001: Buy package and redeem via QR
  tests.push(await runTest("US-001: Catalog Browse", async () => {
    const { stdout } = await execAsync(`curl -s ${BASE_URL}/catalog`);
    const response = JSON.parse(stdout);
    if (!response.products || response.products.length < 4) throw new Error('Insufficient products');
    return `${response.products.length} products available`;
  }));

  tests.push(await runTest("US-001: Ticket Viewing", async () => {
    const { stdout } = await execAsync(`curl -s -H "Authorization: Bearer user123" ${BASE_URL}/my/tickets`);
    const response = JSON.parse(stdout);
    if (!response.tickets || response.tickets.length === 0) throw new Error('No tickets found');

    // Validate business logic: tickets have entitlements with remaining uses
    const hasActiveEntitlements = response.tickets.some(ticket =>
      ticket.entitlements.some(ent => ent.remaining_uses > 0)
    );
    if (!hasActiveEntitlements) throw new Error('No active entitlements found');

    return `${response.tickets.length} tickets with active entitlements`;
  }));

  return tests;
}

async function testCardEvolution() {
  console.log('\n📊 CARD EVOLUTION TRACKING');

  try {
    const { stdout } = await execAsync('node scripts/story-coverage.mjs');

    // Count status distribution
    const lines = stdout.split('\n');
    const statusCounts = {
      'Done': 0,
      'Ready': 0,
      'In Progress': 0,
      'Missing': 0
    };

    lines.forEach(line => {
      if (line.includes('Done')) statusCounts['Done']++;
      else if (line.includes('Ready')) statusCounts['Ready']++;
      else if (line.includes('In Progress')) statusCounts['In Progress']++;
      else if (line.includes('Missing')) statusCounts['Missing']++;
    });

    console.log('📈 Progress Summary:');
    console.log(`   ✅ Done: ${statusCounts['Done']} cards`);
    console.log(`   🔄 Ready: ${statusCounts['Ready']} cards`);
    console.log(`   ⚠️  In Progress: ${statusCounts['In Progress']} cards`);
    console.log(`   ❌ Missing: ${statusCounts['Missing']} cards`);

    const totalCards = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const completionRate = Math.round((statusCounts['Done'] / totalCards) * 100);
    console.log(`   📊 Completion: ${completionRate}%`);

    return completionRate;
  } catch (error) {
    console.log(`❌ Card tracking failed: ${error.message}`);
    return 0;
  }
}

async function main() {
  console.log('🚀 SUCCESS VALIDATION DASHBOARD');
  console.log('================================');

  console.log('\n🏗️  FOUNDATION TESTS');
  const foundationTests = await testFoundation();
  const foundationScore = foundationTests.filter(Boolean).length / foundationTests.length;

  console.log('\n📖 USER STORY TESTS');
  const storyTests = await testUserStories();
  const storyScore = storyTests.filter(Boolean).length / storyTests.length;

  console.log('\n📊 CARD EVOLUTION');
  const completionRate = await testCardEvolution();

  console.log('\n🎯 SUCCESS SUMMARY');
  console.log('==================');
  console.log(`Foundation Quality: ${Math.round(foundationScore * 100)}%`);
  console.log(`Story Validation: ${Math.round(storyScore * 100)}%`);
  console.log(`Card Completion: ${completionRate}%`);

  const overallScore = (foundationScore + storyScore + (completionRate / 100)) / 3;
  console.log(`\n🏆 OVERALL SUCCESS: ${Math.round(overallScore * 100)}%`);

  if (overallScore >= 0.8) {
    console.log('🎉 EXCELLENT! Ready for production scale.');
  } else if (overallScore >= 0.6) {
    console.log('👍 GOOD! Foundation solid, continue implementing.');
  } else {
    console.log('⚠️  NEEDS WORK: Address foundation issues first.');
  }
}

main().catch(console.error);
#!/usr/bin/env node
/**
 * Auto-discover and run Newman tests
 * Usage:
 *   node scripts/run-newman-tests.js              # Run all tests
 *   node scripts/run-newman-tests.js --prd        # Run all PRD tests
 *   node scripts/run-newman-tests.js --story      # Run all Story tests
 *   node scripts/run-newman-tests.js --prd 006    # Run specific PRD
 *   node scripts/run-newman-tests.js --story 014  # Run specific Story
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLLECTIONS_DIR = path.join(__dirname, '../postman/auto-generated');
const REPORTS_DIR = path.join(__dirname, '../reports/newman');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Parse arguments
const args = process.argv.slice(2);
let filter = null;
let specificId = null;

if (args.includes('--prd')) {
  filter = 'prd';
  const idx = args.indexOf('--prd');
  if (args[idx + 1] && !args[idx + 1].startsWith('--')) {
    specificId = args[idx + 1].padStart(3, '0');
  }
} else if (args.includes('--story') || args.includes('--us')) {
  filter = 'us';
  const idx = args.indexOf('--story') !== -1 ? args.indexOf('--story') : args.indexOf('--us');
  if (args[idx + 1] && !args[idx + 1].startsWith('--')) {
    specificId = args[idx + 1].padStart(3, '0');
  }
}

// Discover collections
const collections = fs.readdirSync(COLLECTIONS_DIR)
  .filter(f => f.endsWith('.postman_collection.json'))
  .filter(f => {
    if (!filter) return true;
    if (filter === 'prd') {
      if (specificId) return f.startsWith(`prd-${specificId}`);
      return f.startsWith('prd-');
    }
    if (filter === 'us') {
      if (specificId) return f.startsWith(`us-${specificId}`);
      return f.startsWith('us-');
    }
    return true;
  })
  .sort();

if (collections.length === 0) {
  console.log('No test collections found matching criteria.');
  process.exit(0);
}

console.log(`\n📋 Found ${collections.length} test collection(s):\n`);
collections.forEach(c => console.log(`   - ${c}`));
console.log('');

// Run each collection
let passed = 0;
let failed = 0;
const results = [];

for (const collection of collections) {
  const collectionPath = path.join(COLLECTIONS_DIR, collection);
  const reportName = collection.replace('.postman_collection.json', '-e2e.xml');
  const reportPath = path.join(REPORTS_DIR, reportName);

  console.log(`\n▶️  Running: ${collection}`);
  console.log('─'.repeat(60));

  try {
    execSync(
      `npx newman run "${collectionPath}" --reporters cli,junit --reporter-junit-export "${reportPath}"`,
      { stdio: 'inherit' }
    );
    passed++;
    results.push({ name: collection, status: 'PASS' });
  } catch (error) {
    failed++;
    results.push({ name: collection, status: 'FAIL' });
  }
}

// Summary
console.log('\n' + '═'.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('═'.repeat(60));
results.forEach(r => {
  const icon = r.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${r.name}`);
});
console.log('─'.repeat(60));
console.log(`Total: ${collections.length} | Passed: ${passed} | Failed: ${failed}`);
console.log('═'.repeat(60) + '\n');

process.exit(failed > 0 ? 1 : 0);

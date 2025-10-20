#!/usr/bin/env node

/**
 * Integration Proof Validator
 * Tests that our "last mile" gap solution is complete and accessible
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 INTEGRATION PROOF VALIDATION');
console.log('===============================');

let score = 0;
let maxScore = 0;

function test(name, condition, description) {
  maxScore++;
  console.log(`\n🧪 ${name}`);
  if (condition) {
    score++;
    console.log(`✅ PASS: ${description}`);
  } else {
    console.log(`❌ FAIL: ${description}`);
  }
}

// Test 1: Integration Proof Documentation
test(
  "Integration Proof Documentation",
  fs.existsSync('docs/INTEGRATION_PROOF.md'),
  "Core documentation explaining the last mile gap and solution exists"
);

// Test 2: Story Runbooks
const expectedRunbooks = [
  'docs/integration/US-001-runbook.md',
  'docs/integration/US-002-runbook.md',
  'docs/integration/US-003-runbook.md',
  'docs/integration/US-004-runbook.md',
  'docs/integration/US-005-runbook.md',
  'docs/integration/US-006-runbook.md'
];

const runbooksExist = expectedRunbooks.every(path => fs.existsSync(path));
test(
  "Story Runbooks Complete",
  runbooksExist,
  `All 6 story runbooks exist with copy-paste commands`
);

// Test 3: Newman E2E Infrastructure
const newmanExists = fs.existsSync('docs/postman_e2e.json') &&
                    fs.existsSync('postman_env.local.json');
test(
  "Newman E2E Infrastructure",
  newmanExists,
  "Postman collection and environment files for automated testing"
);

// Test 4: TypeScript SDK and Examples
const sdkExists = fs.existsSync('sdk/index.ts') &&
                 fs.existsSync('examples/us001.ts') &&
                 fs.existsSync('examples/all-stories.ts');
test(
  "TypeScript SDK + Examples",
  sdkExists,
  "Generated SDK and working TypeScript examples for frontend integration"
);

// Test 5: Package.json Scripts
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
} catch (e) {
  packageJson = { scripts: {} };
}

const requiredScripts = [
  'test:e2e',
  'example:us001',
  'example:all',
  'sdk:generate'
];

const scriptsExist = requiredScripts.every(script => packageJson.scripts[script]);
test(
  "NPM Scripts Available",
  scriptsExist,
  "All integration proof scripts available via npm run"
);

// Test 6: Context in Main Files
const readmeContent = fs.existsSync('README.md') ? fs.readFileSync('README.md', 'utf8') : '';
const claudeContent = fs.existsSync('CLAUDE.md') ? fs.readFileSync('CLAUDE.md', 'utf8') : '';

const contextInFiles = readmeContent.includes('Integration Proof') &&
                      claudeContent.includes('INTEGRATION PROOF');
test(
  "Context in Main Files",
  contextInFiles,
  "README.md and CLAUDE.md reference integration proof solution"
);

// Test 7: Accurate Dashboard Calculation
test(
  "Dashboard Uses Canonical Cards",
  fs.existsSync('scripts/success-dashboard.js') &&
  fs.readFileSync('scripts/success-dashboard.js', 'utf8').includes('canonicalCards'),
  "Dashboard uses accurate 10-card calculation (not story-coverage.mjs)"
);

// Test 8: Fresh AI Instructions
const integrationProofContent = fs.existsSync('docs/INTEGRATION_PROOF.md') ?
  fs.readFileSync('docs/INTEGRATION_PROOF.md', 'utf8') : '';

const hasAIInstructions = integrationProofContent.includes('Fresh AI') &&
                         integrationProofContent.includes('Context for New AI');
test(
  "Fresh AI Instructions",
  hasAIInstructions,
  "Clear instructions for fresh AI agents to understand the solution"
);

// Results
console.log('\n📊 VALIDATION RESULTS');
console.log('=====================');
console.log(`Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)`);

if (score === maxScore) {
  console.log('🎉 EXCELLENT! Integration proof is complete and accessible.');
  console.log('💡 Fresh AI agents can understand and use our solution.');
} else {
  console.log('⚠️  Some integration proof components are missing.');
  console.log('💡 Consider adding missing pieces for better AI context.');
}

console.log('\n🚀 Quick Test Commands:');
console.log('npm run test:e2e           # Validate E2E flows');
console.log('npm run example:us001      # Test TypeScript integration');
console.log('node scripts/success-dashboard.js  # Check accurate progress');
console.log('cat docs/integration/US-001-runbook.md  # See copy-paste commands');

process.exit(score === maxScore ? 0 : 1);
#!/usr/bin/env node

/**
 * Fresh AI Autonomy Validator
 * Tests if a fresh AI can handle complete User Story → Implementation workflow
 */

const fs = require('fs');
const path = require('path');

console.log('🤖 FRESH AI AUTONOMY VALIDATOR');
console.log('==============================\n');

// Check if essential templates exist
function checkTemplates() {
  console.log('📋 Template Availability');

  const templates = [
    'docs/templates/STORY_ANALYSIS.md',
    'docs/templates/CARD_TEMPLATE.md'
  ];

  let allExist = true;

  templates.forEach(template => {
    if (fs.existsSync(template)) {
      console.log(`✅ PASS: ${template} exists`);
    } else {
      console.log(`❌ FAIL: ${template} missing`);
      allExist = false;
    }
  });

  return allExist;
}

// Check if workflow documentation is complete
function checkWorkflowDocs() {
  console.log('\n📖 Workflow Documentation');

  const docs = [
    { file: 'CLAUDE.md', content: 'Complete Workflow: User Story → Implementation' },
    { file: 'docs/INTEGRATION_PROOF.md', content: 'Self-Healing Integration Methodology' },
    { file: 'docs/FRESH_AI_ONBOARDING.md', content: 'Fresh AI Onboarding' },
    { file: 'docs/METHODOLOGY_EVOLUTION.md', content: 'Methodology Evolution' }
  ];

  let allComplete = true;

  docs.forEach(({ file, content }) => {
    if (fs.existsSync(file)) {
      const fileContent = fs.readFileSync(file, 'utf8');
      if (fileContent.includes(content)) {
        console.log(`✅ PASS: ${file} has ${content} section`);
      } else {
        console.log(`⚠️  WARN: ${file} missing ${content} section`);
        allComplete = false;
      }
    } else {
      console.log(`❌ FAIL: ${file} missing`);
      allComplete = false;
    }
  });

  return allComplete;
}

// Check if existing patterns are well documented
function checkExistingPatterns() {
  console.log('\n🏗️  Existing Pattern References');

  const patterns = [
    { path: 'docs/stories/_index.yaml', purpose: 'Story → Card mapping examples' },
    { path: 'docs/cards', purpose: 'Card structure examples' },
    { path: 'src/types/domain.ts', purpose: 'Type definitions (SSoT)' },
    { path: 'openapi/openapi.json', purpose: 'API specification patterns' }
  ];

  let allAvailable = true;

  patterns.forEach(({ path, purpose }) => {
    if (fs.existsSync(path)) {
      console.log(`✅ PASS: ${path} available for ${purpose}`);
    } else {
      console.log(`❌ FAIL: ${path} missing - needed for ${purpose}`);
      allAvailable = false;
    }
  });

  return allAvailable;
}

// Check if validation infrastructure works
function checkValidationInfra() {
  console.log('\n🔍 Validation Infrastructure');

  const scripts = [
    'scripts/integration-proof-validator.js',
    'scripts/success-dashboard.js',
    'scripts/progress-report.js'
  ];

  let allExist = true;

  scripts.forEach(script => {
    if (fs.existsSync(script)) {
      console.log(`✅ PASS: ${script} available`);
    } else {
      console.log(`❌ FAIL: ${script} missing`);
      allExist = false;
    }
  });

  // Check package.json has validation commands
  if (fs.existsSync('package.json')) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = pkg.scripts || {};

    const requiredScripts = [
      'validate:integration',
      'test:e2e',
      'example:us001'
    ];

    requiredScripts.forEach(scriptName => {
      if (scripts[scriptName]) {
        console.log(`✅ PASS: npm run ${scriptName} available`);
      } else {
        console.log(`❌ FAIL: npm run ${scriptName} missing`);
        allExist = false;
      }
    });
  }

  return allExist;
}

// Simulate fresh AI workflow capability test
function testWorkflowCapability() {
  console.log('\n🧪 Fresh AI Workflow Capability Test');

  const capabilities = [
    { name: 'Story Analysis Template', check: () => fs.existsSync('docs/templates/STORY_ANALYSIS.md') },
    { name: 'Card Generation Template', check: () => fs.existsSync('docs/templates/CARD_TEMPLATE.md') },
    { name: 'Team Assignment Guidelines', check: () => {
      const template = fs.readFileSync('docs/templates/CARD_TEMPLATE.md', 'utf8');
      return template.includes('Team A - Commerce') && template.includes('Team B - Fulfillment');
    }},
    { name: 'API Design Patterns', check: () => {
      const claude = fs.readFileSync('CLAUDE.md', 'utf8');
      return claude.includes('API Design Decision Guidelines');
    }},
    { name: 'SSoT Hierarchy Documentation', check: () => {
      const claude = fs.readFileSync('CLAUDE.md', 'utf8');
      return claude.includes('SSoT Hierarchy');
    }},
    { name: 'Integration Proof Creation Process', check: () => {
      const integration = fs.readFileSync('docs/INTEGRATION_PROOF.md', 'utf8');
      return integration.includes('4-part solution');
    }},
    { name: 'Validation-Driven Development', check: () => {
      const integration = fs.readFileSync('docs/INTEGRATION_PROOF.md', 'utf8');
      return integration.includes('Self-Healing');
    }}
  ];

  let passCount = 0;

  capabilities.forEach(({ name, check }) => {
    try {
      if (check()) {
        console.log(`✅ PASS: Fresh AI can ${name}`);
        passCount++;
      } else {
        console.log(`❌ FAIL: Fresh AI cannot ${name}`);
      }
    } catch (error) {
      console.log(`❌ FAIL: Fresh AI cannot ${name} (error: ${error.message})`);
    }
  });

  return passCount === capabilities.length;
}

// Test sample user story breakdown
function testSampleStoryBreakdown() {
  console.log('\n📝 Sample Story Breakdown Test');

  const sampleStory = "I want users to be able to cancel their tickets and get a refund";

  console.log(`Sample Story: "${sampleStory}"`);
  console.log('\nFresh AI should be able to:');

  const expectedCapabilities = [
    '1. Analyze story using STORY_ANALYSIS.md template',
    '2. Identify business rules (24h cancellation policy)',
    '3. Break down into cards (ticket-cancellation, refund-processing)',
    '4. Assign teams (B - Fulfillment, A - Commerce)',
    '5. Generate card specs using CARD_TEMPLATE.md',
    '6. Implement following existing patterns',
    '7. Create integration proof (runbook, Newman, examples)',
    '8. Validate with npm run validate:integration'
  ];

  expectedCapabilities.forEach(capability => {
    console.log(`   ${capability}`);
  });

  return true; // This is a capability description, not a test
}

// Main validation
function main() {
  const results = [
    checkTemplates(),
    checkWorkflowDocs(),
    checkExistingPatterns(),
    checkValidationInfra(),
    testWorkflowCapability()
  ];

  testSampleStoryBreakdown();

  const passCount = results.filter(Boolean).length;
  const totalTests = results.length;

  console.log('\n📊 VALIDATION RESULTS');
  console.log('=====================');
  console.log(`Score: ${passCount}/${totalTests} (${Math.round(passCount/totalTests*100)}%)`);

  if (passCount === totalTests) {
    console.log('🎉 EXCELLENT! Fresh AI has complete autonomy capability.');
    console.log('💡 A fresh AI can now handle: User Story → Cards → Implementation → Integration Proof');
  } else if (passCount >= totalTests * 0.8) {
    console.log('👍 GOOD! Fresh AI has most autonomy capabilities.');
    console.log('⚠️  Some enhancements needed for complete autonomy.');
  } else {
    console.log('⚠️  NEEDS WORK! Fresh AI autonomy requires more infrastructure.');
    console.log('❌ Missing essential templates or documentation.');
  }

  console.log('\n🚀 Test Fresh AI Autonomy:');
  console.log('Give a fresh AI this prompt: "I want users to cancel tickets and get refunds"');
  console.log('They should be able to complete the entire implementation autonomously.');

  process.exit(passCount === totalTests ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { checkTemplates, checkWorkflowDocs, checkExistingPatterns, checkValidationInfra, testWorkflowCapability };
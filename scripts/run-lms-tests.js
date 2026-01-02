#!/usr/bin/env node
/**
 * Run LMS Postman collection tests with Newman
 * Usage:
 *   node scripts/run-lms-tests.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLLECTION_PATH = path.join(__dirname, '..', 'postman', 'LMS-COMPLETE-TEST-SUITE.postman_collection.json');
const REPORTS_DIR = path.join(__dirname, '..', 'reports', 'newman');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

if (!fs.existsSync(COLLECTION_PATH)) {
  console.error(`❌ Collection not found: ${COLLECTION_PATH}`);
  console.log('   Run: node scripts/generate-lms-postman-collection.js');
  process.exit(1);
}

const reportPath = path.join(REPORTS_DIR, 'lms-complete-test-suite.xml');

console.log('\n📋 Running LMS Complete Test Suite');
console.log('═'.repeat(60));
console.log(`Collection: ${COLLECTION_PATH}`);
console.log(`Report: ${reportPath}`);
console.log('═'.repeat(60) + '\n');

try {
  execSync(
    `npx newman run "${COLLECTION_PATH}" --reporters cli,junit --reporter-junit-export "${reportPath}"`,
    { stdio: 'inherit' }
  );
  console.log('\n✅ LMS tests completed successfully!\n');
  process.exit(0);
} catch (error) {
  console.log('\n❌ LMS tests failed!\n');
  process.exit(1);
}


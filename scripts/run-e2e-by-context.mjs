#!/usr/bin/env node
/**
 * E2E Test Runner by Story Context
 *
 * Usage:
 *   node scripts/run-e2e-by-context.mjs --story US-010A
 *   node scripts/run-e2e-by-context.mjs --story US-012
 *
 * Environment:
 *   BASE_URL - API base URL (default: http://localhost:8080)
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Story to Collection mapping
const STORY_COLLECTIONS = {
  'US-010A': {
    collection: 'reports/collections/us-010a-traveler-loop.json',
    description: 'DeepTravel Traveler Loop - 旅客购票流程'
  },
  'US-010B': {
    collection: 'reports/collections/us-010b-operations-backbone.json',
    description: 'DeepTravel Operations Backbone - 运营管理'
  },
  'US-012': {
    collection: 'reports/collections/us-012-ota-integration.json',
    description: 'OTA Platform Integration - OTA平台集成'
  },
  'US-013': {
    collection: 'reports/collections/us-013-venue-operations.json',
    description: 'Venue Operations - 场馆运营'
  }
};

// Parse arguments
const args = process.argv.slice(2);
const storyIndex = args.indexOf('--story');

if (storyIndex === -1 || !args[storyIndex + 1]) {
  console.error('Usage: node scripts/run-e2e-by-context.mjs --story <STORY_ID>');
  console.error('');
  console.error('Available stories:');
  Object.entries(STORY_COLLECTIONS).forEach(([id, info]) => {
    console.error(`  ${id}: ${info.description}`);
  });
  process.exit(1);
}

const storyId = args[storyIndex + 1].toUpperCase();
const storyConfig = STORY_COLLECTIONS[storyId];

if (!storyConfig) {
  console.error(`❌ Unknown story: ${storyId}`);
  console.error('');
  console.error('Available stories:');
  Object.entries(STORY_COLLECTIONS).forEach(([id, info]) => {
    console.error(`  ${id}: ${info.description}`);
  });
  process.exit(1);
}

const collectionPath = resolve(projectRoot, storyConfig.collection);

if (!existsSync(collectionPath)) {
  console.error(`❌ Collection not found: ${storyConfig.collection}`);
  process.exit(1);
}

// Environment setup
const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
const reportDir = resolve(projectRoot, 'reports/newman');

// Ensure report directory exists
execSync(`mkdir -p ${reportDir}`);

const reportPath = resolve(reportDir, `${storyId.toLowerCase()}-e2e.xml`);

console.log(`🚀 Running E2E tests for ${storyId}`);
console.log(`   ${storyConfig.description}`);
console.log(`   Collection: ${storyConfig.collection}`);
console.log(`   Base URL: ${baseUrl}`);
console.log('');

// Run Newman
const cmd = [
  'npx newman run',
  `"${collectionPath}"`,
  `--env-var "base_url=${baseUrl}"`,
  `--env-var "baseUrl=${baseUrl}"`,
  '--reporters cli,junit',
  `--reporter-junit-export "${reportPath}"`
].join(' ');

try {
  execSync(cmd, {
    stdio: 'inherit',
    cwd: projectRoot
  });
  console.log('');
  console.log(`✅ ${storyId} tests passed`);
  console.log(`   Report: ${reportPath}`);
  process.exit(0);
} catch (error) {
  console.error('');
  console.error(`❌ ${storyId} tests failed`);
  console.error(`   Report: ${reportPath}`);
  process.exit(1);
}

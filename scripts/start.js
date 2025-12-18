#!/usr/bin/env node
/**
 * Start script that handles Render's directory issue
 * Finds dist/index.js relative to project root, not src/
 */
const path = require('path');
const fs = require('fs');

// Get current working directory
let projectRoot = process.cwd();

// If we're in src/, go up one level
if (projectRoot.endsWith('/src') || projectRoot.endsWith('\\src')) {
  projectRoot = path.join(projectRoot, '..');
}

// Try to find dist/index.js
const distPath = path.join(projectRoot, 'dist', 'index.js');

if (fs.existsSync(distPath)) {
  console.log(`Starting from: ${distPath}`);
  require(distPath);
} else {
  // Fallback: try relative to current directory
  const fallbackPath = path.join(process.cwd(), 'dist', 'index.js');
  if (fs.existsSync(fallbackPath)) {
    console.log(`Starting from: ${fallbackPath}`);
    require(fallbackPath);
  } else {
    console.error('Error: Cannot find dist/index.js');
    console.error(`Searched in: ${distPath}`);
    console.error(`Searched in: ${fallbackPath}`);
    console.error(`Current directory: ${process.cwd()}`);
    process.exit(1);
  }
}


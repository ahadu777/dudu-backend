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
  console.log(`✅ Starting from: ${distPath}`);
  require(distPath);
} else {
  // Fallback: try relative to current directory
  const fallbackPath = path.join(process.cwd(), 'dist', 'index.js');
  if (fs.existsSync(fallbackPath)) {
    console.log(`✅ Starting from: ${fallbackPath}`);
    require(fallbackPath);
  } else {
    // Last resort: try to build if dist doesn't exist
    console.warn('⚠️ dist/index.js not found. Attempting to build...');
    console.log(`Current directory: ${process.cwd()}`);
    console.log(`Project root: ${projectRoot}`);
    console.log(`Looking for dist at: ${distPath}`);
    
    // Check if we're in the right place and try to build
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      console.log('📦 Found package.json, running build...');
      const { execSync } = require('child_process');
      try {
        process.chdir(projectRoot);
        execSync('npm run build', { stdio: 'inherit' });
        if (fs.existsSync(distPath)) {
          console.log(`✅ Build successful! Starting from: ${distPath}`);
          require(distPath);
        } else {
          console.error('❌ Build completed but dist/index.js still not found');
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
      }
    } else {
      console.error('❌ Cannot find dist/index.js and cannot locate package.json');
      console.error(`Searched in: ${distPath}`);
      console.error(`Searched in: ${fallbackPath}`);
      console.error(`Current directory: ${process.cwd()}`);
      process.exit(1);
    }
  }
}


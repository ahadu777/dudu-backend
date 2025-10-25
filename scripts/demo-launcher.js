#!/usr/bin/env node

/**
 * Demo Launcher
 * Launches the interactive promotion showcase demo
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎯 Enhanced Promotion Showcase Demo Launcher');
console.log('==============================================\n');

// Check if server is running
const checkServer = () => {
  return new Promise((resolve) => {
    exec('curl -s http://localhost:8080/healthz', (error, stdout) => {
      if (error) {
        resolve(false);
      } else {
        try {
          const response = JSON.parse(stdout);
          resolve(response.status === 'ok');
        } catch {
          resolve(false);
        }
      }
    });
  });
};

const main = async () => {
  console.log('🔍 Checking if server is running...');

  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.log('❌ Server not running! Please start the server first:');
    console.log('   npm run build && PORT=8080 npm start\n');
    process.exit(1);
  }

  console.log('✅ Server is running!\n');

  console.log('🚀 Demo Features:');
  console.log('   📱 Real Unsplash images for professional display');
  console.log('   🏷️ Dynamic badges ("Popular Choice", "Limited Time")');
  console.log('   ⏰ Live countdown timers for sale periods');
  console.log('   💰 Enhanced value propositions and savings messaging');
  console.log('   📊 Real-time inventory with visual progress bars');
  console.log('   🎨 Responsive design with hover effects\n');

  console.log('🌐 Access the demo at:');
  console.log('   http://localhost:8080/demo/promotions\n');

  console.log('📋 Quick API Tests:');
  console.log('   curl http://localhost:8080/catalog/promotions/101  # Transport Pass');
  console.log('   curl http://localhost:8080/catalog/promotions/104  # Theme Park');
  console.log('   curl http://localhost:8080/catalog/promotions/102  # Day Pass\n');

  // Try to open in browser
  const openCommand = process.platform === 'darwin' ? 'open' :
                     process.platform === 'win32' ? 'start' : 'xdg-open';

  console.log('🖥️ Attempting to open demo in your default browser...');

  exec(`${openCommand} http://localhost:8080/demo/promotions`, (error) => {
    if (error) {
      console.log('⚠️ Could not automatically open browser.');
      console.log('   Please manually visit: http://localhost:8080/demo/promotions');
    } else {
      console.log('✅ Demo opened in browser!');
    }

    console.log('\n🎉 Demo is ready! Refresh the page to see real-time data updates.');
    console.log('💡 Try clicking the "Buy Now" buttons to see purchase flow integration.');
  });
};

main().catch(console.error);
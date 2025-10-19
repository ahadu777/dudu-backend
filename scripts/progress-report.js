#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read all card files
const cardsDir = path.join(__dirname, '..', 'docs', 'cards');
const cards = [];

if (fs.existsSync(cardsDir)) {
  const files = fs.readdirSync(cardsDir);

  files.forEach(file => {
    if (file.endsWith('.md')) {
      const content = fs.readFileSync(path.join(cardsDir, file), 'utf8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (frontmatterMatch) {
        const frontmatter = {};
        frontmatterMatch[1].split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length) {
            const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
            frontmatter[key.trim()] = value;
          }
        });
        cards.push(frontmatter);
      }
    }
  });
}

// Group by team
const teams = {};
cards.forEach(card => {
  const team = card.team || 'Unassigned';
  if (!teams[team]) teams[team] = [];
  teams[team].push(card);
});

// Generate report
console.log('\n🚀 PROJECT PROGRESS REPORT\n');
console.log('=' .repeat(60));

// Overall statistics
const statuses = cards.reduce((acc, card) => {
  acc[card.status] = (acc[card.status] || 0) + 1;
  return acc;
}, {});

console.log('\n📊 Overall Status:');
console.log(`   ✅ Done: ${statuses['Done'] || 0}`);
console.log(`   🔄 In Progress: ${statuses['In Progress'] || 0}`);
console.log(`   🔀 PR: ${statuses['PR'] || 0}`);
console.log(`   📋 Ready: ${statuses['Ready'] || 0}`);
console.log(`   🚫 Blocked: ${statuses['Blocked'] || 0}`);

// Team breakdown
console.log('\n👥 Team Breakdown:\n');

Object.keys(teams).sort().forEach(team => {
  console.log(`\n${team}:`);
  console.log('-'.repeat(40));

  teams[team].forEach(card => {
    const statusIcon = {
      'Done': '✅',
      'In Progress': '🔄',
      'PR': '🔀',
      'Ready': '📋',
      'Blocked': '🚫'
    }[card.status] || '❓';

    console.log(`  ${statusIcon} ${card.card || card.slug}`);
    console.log(`     Status: ${card.status}`);
    if (card.branch && card.branch !== '""') {
      console.log(`     Branch: ${card.branch}`);
    }
    if (card.pr && card.pr !== '""' && card.pr !== '') {
      console.log(`     PR: ${card.pr}`);
    }
    console.log(`     Last Update: ${card.last_update}`);
  });
});

// Critical path
console.log('\n\n🎯 Critical Path:');
console.log('-'.repeat(40));

const inProgress = cards.filter(c => c.status === 'In Progress');
const blocked = cards.filter(c => c.status === 'Blocked');
const ready = cards.filter(c => c.status === 'Ready');

if (blocked.length > 0) {
  console.log('\n⚠️  BLOCKED ITEMS (need attention):');
  blocked.forEach(card => {
    console.log(`   - ${card.card}: ${card.team}`);
  });
}

if (inProgress.length > 0) {
  console.log('\n🔄 Currently In Progress:');
  inProgress.forEach(card => {
    console.log(`   - ${card.card}: ${card.team}`);
  });
}

if (ready.length > 0) {
  console.log('\n📋 Ready to Start:');
  ready.forEach(card => {
    console.log(`   - ${card.card}: ${card.team}`);
  });
}

// Endpoints status
console.log('\n\n🔌 Endpoint Implementation Status:');
console.log('-'.repeat(40));

const endpoints = {
  'Infrastructure': [
    { path: '/healthz', status: 'Done', desc: 'Health check' },
    { path: '/version', status: 'Done', desc: 'Version info' },
    { path: '/docs', status: 'Done', desc: 'Swagger UI' }
  ],
  'Commerce (Team A)': [
    { path: 'GET /catalog', status: 'Done', desc: 'Product catalog' },
    { path: 'POST /orders', status: 'Done', desc: 'Create order' },
    { path: 'POST /payments/notify', status: 'Ready', desc: 'Payment webhook' }
  ],
  'Tickets (Team B)': [
    { path: 'GET /my/tickets', status: 'Ready', desc: 'User tickets' },
    { path: 'POST /tickets/:code/qr-token', status: 'Ready', desc: 'Generate QR' }
  ],
  'Gate (Team C)': [
    { path: 'POST /operators/login', status: 'Ready', desc: 'Operator auth' },
    { path: 'POST /validators/sessions', status: 'Ready', desc: 'Session mgmt' },
    { path: 'POST /tickets/scan', status: 'Ready', desc: 'Scan QR' },
    { path: 'GET /reports/redemptions', status: 'Ready', desc: 'Reports' }
  ]
};

Object.entries(endpoints).forEach(([category, items]) => {
  console.log(`\n${category}:`);
  items.forEach(item => {
    const icon = item.status === 'Done' ? '✅' : '⏳';
    console.log(`  ${icon} ${item.path} - ${item.desc}`);
  });
});

console.log('\n' + '='.repeat(60));
console.log('\n');
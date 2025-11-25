/**
 * Test Directus Token Permissions
 * Run with: node test-directus-token.js
 */

const axios = require('axios');

const DIRECTUS_URL = 'https://dudu-derp-cxk5g.ondigitalocean.app';
const TOKEN = 'HE9EiIEgdf-UD7quY4Ajoas19vgmkFvF';

async function testDirectusToken() {
  console.log('🔐 Testing Directus Token Permissions...\n');
  console.log(`URL: ${DIRECTUS_URL}`);
  console.log(`Token: ${TOKEN.substring(0, 10)}...`);
  console.log('='.repeat(60));

  const tests = [
    {
      name: 'Read tickets collection',
      url: `${DIRECTUS_URL}/items/tickets?limit=1`,
      method: 'GET'
    },
    {
      name: 'Read reservation_slots collection',
      url: `${DIRECTUS_URL}/items/reservation_slots?limit=1`,
      method: 'GET'
    },
    {
      name: 'Read ticket_reservations collection',
      url: `${DIRECTUS_URL}/items/ticket_reservations?limit=1`,
      method: 'GET'
    }
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const test of tests) {
    try {
      console.log(`\n📋 Test: ${test.name}`);

      const response = await axios({
        method: test.method,
        url: test.url,
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        },
        timeout: 5000
      });

      if (response.status === 200) {
        const data = response.data?.data;
        console.log(`✅ PASS - Status: ${response.status}`);
        console.log(`   Data returned: ${data ? data.length : 0} items`);
        passedTests++;
      } else {
        console.log(`⚠️  WARN - Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      failedTests++;
      if (error.response) {
        console.log(`❌ FAIL - Status: ${error.response.status}`);
        console.log(`   Error: ${JSON.stringify(error.response.data)}`);

        if (error.response.status === 403) {
          console.log(`   ⚠️  Permission denied - Check role permissions in Directus`);
        }
      } else {
        console.log(`❌ FAIL - ${error.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Passed: ${passedTests}/${tests.length}`);
  console.log(`   ❌ Failed: ${failedTests}/${tests.length}`);

  if (passedTests === tests.length) {
    console.log(`\n🎉 All tests passed! Token is ready to use.`);
    console.log(`\n✅ Add to your .env file:`);
    console.log(`   USE_DIRECTUS=true`);
    console.log(`   DIRECTUS_ACCESS_TOKEN=${TOKEN}`);
  } else {
    console.log(`\n⚠️  Some tests failed. Check Directus permissions for "reservation" role.`);
  }

  console.log('');
}

testDirectusToken().catch(error => {
  console.error('💥 Fatal error:', error.message);
  process.exit(1);
});

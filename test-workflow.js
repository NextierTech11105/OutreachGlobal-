/**
 * TEST THE COMPLETE WORKFLOW
 *
 * This script tests each step of your automated lead generation:
 * 1. Property Search
 * 2. Skip Trace
 * 3. Property Hunt API connection
 * 4. Nextier import readiness
 */

const axios = require('axios');

const REALESTATE_API_KEY = 'NEXTIER-2906-74a1-8684-d2f63f473b7b';
const REALESTATE_SKIPTRACE_KEY = 'ELITEHOMEOWNERADVISORSSKIPPRODUCTION-8aae-7b54-9463-5db02217ffa5';
const PROPERTY_HUNT_API = 'https://property-hunt-api-yahrg.ondigitalocean.app';

console.log('🧪 TESTING COMPLETE WORKFLOW\n');
console.log('='.repeat(60));

// TEST 1: Property Search API
async function testPropertySearch() {
  console.log('\n📍 TEST 1: Property Search API');
  console.log('-'.repeat(60));

  try {
    const response = await axios.post(
      'https://api.realestateapi.com/v2/PropertySearch',
      {
        state: 'FL',
        city: 'Miami',
        property_type: 'SFR',
        size: 5  // Just get 5 for testing
      },
      {
        headers: {
          'x-api-key': REALESTATE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Property Search: WORKING`);
    console.log(`   Found ${response.data.data.length} properties`);

    if (response.data.data.length > 0) {
      const sample = response.data.data[0];
      console.log(`   Sample: ${sample.address?.address || 'N/A'}`);
      console.log(`   Owner: ${sample.owner1FirstName} ${sample.owner1LastName}`);
      return sample;
    }

    return null;
  } catch (error) {
    console.log(`❌ Property Search: FAILED`);
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// TEST 2: Skip Trace API
async function testSkipTrace(property) {
  console.log('\n🔍 TEST 2: Skip Trace API');
  console.log('-'.repeat(60));

  if (!property) {
    console.log('⚠️  Skipping (no property from Test 1)');
    return null;
  }

  try {
    const mailAddress = property.mailAddress || property.address;

    const response = await axios.post(
      'https://api.realestateapi.com/v1/SkipTrace',
      {
        mail_address: mailAddress.street || mailAddress.address,
        mail_city: mailAddress.city,
        mail_state: mailAddress.state,
        mail_zip: mailAddress.zip,
        first_name: property.owner1FirstName,
        last_name: property.owner1LastName
      },
      {
        headers: {
          'x-api-key': REALESTATE_SKIPTRACE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Skip Trace: WORKING`);
    console.log(`   Phones: ${response.data.phones?.length || 0}`);
    console.log(`   Emails: ${response.data.emails?.length || 0}`);

    if (response.data.phones?.length > 0) {
      console.log(`   Phone: ${response.data.phones[0]}`);
    }
    if (response.data.emails?.length > 0) {
      console.log(`   Email: ${response.data.emails[0]}`);
    }

    return response.data;
  } catch (error) {
    console.log(`❌ Skip Trace: FAILED`);
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// TEST 3: Property Hunt API
async function testPropertyHuntAPI() {
  console.log('\n🏘️  TEST 3: Property Hunt API Connection');
  console.log('-'.repeat(60));

  try {
    const response = await axios.get(`${PROPERTY_HUNT_API}/health`);

    console.log(`✅ Property Hunt API: ONLINE`);
    console.log(`   Status: ${response.data.status || 'healthy'}`);
    return true;
  } catch (error) {
    console.log(`❌ Property Hunt API: OFFLINE`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Make sure API is deployed at: ${PROPERTY_HUNT_API}`);
    return false;
  }
}

// TEST 4: Saved Search Creation
async function testSavedSearch() {
  console.log('\n💾 TEST 4: Saved Search Creation');
  console.log('-'.repeat(60));

  try {
    const response = await axios.post(
      'https://api.realestateapi.com/v1/PropertyPortfolio/SavedSearch/Create',
      {
        search_name: 'TEST - Delete Me',
        search_query: {
          state: 'FL',
          city: 'Miami',
          property_type: 'SFR',
          size: 10
        }
      },
      {
        headers: {
          'x-api-key': REALESTATE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const searchId = response.data.search_id || response.data.id;

    console.log(`✅ Saved Search: WORKING`);
    console.log(`   Search ID: ${searchId}`);
    console.log(`   ⚠️  This is a test search - you can delete it from your RealEstateAPI dashboard`);

    return searchId;
  } catch (error) {
    console.log(`❌ Saved Search: FAILED`);
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// RUN ALL TESTS
async function runTests() {
  const property = await testPropertySearch();
  const skipData = await testSkipTrace(property);
  const propertyHuntOnline = await testPropertyHuntAPI();
  const searchId = await testSavedSearch();

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  const results = [
    { name: 'Property Search API', status: property ? '✅ PASS' : '❌ FAIL' },
    { name: 'Skip Trace API', status: skipData ? '✅ PASS' : '❌ FAIL' },
    { name: 'Property Hunt API', status: propertyHuntOnline ? '✅ PASS' : '❌ FAIL' },
    { name: 'Saved Search Creation', status: searchId ? '✅ PASS' : '❌ FAIL' }
  ];

  results.forEach(test => {
    console.log(`${test.status}  ${test.name}`);
  });

  const allPassed = results.every(t => t.status.includes('✅'));

  console.log('\n' + '='.repeat(60));

  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('\n✅ Your system is ready for automated lead generation!');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Run create-saved-search.js to create your production searches');
    console.log('2. Add the search IDs to daily-lead-automation.js');
    console.log('3. Set up cron job to run daily-lead-automation.js every morning');
    console.log('4. Watch leads flow into Nextier automatically!');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Make sure you added both API keys to DigitalOcean:');
    console.log('   - REALESTATE_API_KEY');
    console.log('   - REALESTATE_SKIPTRACE_API_KEY');
    console.log('2. Verify Property Hunt API is deployed');
    console.log('3. Check API key permissions on RealEstateAPI.com');
  }

  console.log('\n');
}

// Run it
runTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Test suite failed:', err.message);
    process.exit(1);
  });

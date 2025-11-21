/**
 * CREATE YOUR FIRST AUTOMATED SAVED SEARCH
 *
 * This creates a saved search that runs DAILY and finds:
 * - Pre-foreclosure properties
 * - High equity (50%+)
 * - Florida market
 * - $200k-$500k value range
 */

const axios = require('axios');

const REALESTATE_API_KEY = 'NEXTIER-2906-74a1-8684-d2f63f473b7b';

async function createSavedSearch() {
  try {
    console.log('🔍 Creating Saved Search: High-Equity Pre-Foreclosures...\n');

    const response = await axios.post(
      'https://api.realestateapi.com/v1/PropertyPortfolio/SavedSearch/Create',
      {
        search_name: 'FL Pre-Foreclosure High Equity',
        search_query: {
          state: 'FL',
          pre_foreclosure: true,
          equity_percent_min: 50,
          value_min: 200000,
          value_max: 500000,
          property_type: 'SFR',
          size: 1000  // Max 1000 results
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

    console.log('✅ SAVED SEARCH CREATED!\n');
    console.log('Search ID:', searchId);
    console.log('Search Name:', response.data.search_name);
    console.log('\n📊 Initial Results:');
    console.log('Total Properties:', response.data.total || response.data.count);

    console.log('\n🎯 IMPORTANT: Save this Search ID!');
    console.log(`Search ID: ${searchId}`);
    console.log('\nYou will use this ID to retrieve daily updates.\n');

    // Test retrieving the search
    console.log('📥 Testing search retrieval...\n');
    const searchResults = await axios.post(
      'https://api.realestateapi.com/v1/PropertyPortfolio/SavedSearch',
      {
        search_id: searchId
      },
      {
        headers: {
          'x-api-key': REALESTATE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Search Retrieval Successful!\n');
    console.log('Summary:', searchResults.data.summary);
    console.log('Properties Found:', searchResults.data.data?.length || 0);

    if (searchResults.data.data && searchResults.data.data.length > 0) {
      console.log('\n🏠 Sample Property:');
      const sample = searchResults.data.data[0];
      console.log('Address:', sample.address);
      console.log('City:', sample.city);
      console.log('Value:', sample.value);
      console.log('Equity:', sample.equity_percent ? `${sample.equity_percent}%` : 'N/A');
      console.log('Owner:', sample.owner_first_name, sample.owner_last_name);
    }

    console.log('\n📋 NEXT STEPS:');
    console.log('1. Add this search ID to your daily cron job');
    console.log('2. Every morning, retrieve new/updated properties');
    console.log('3. Skip trace to get phone/email');
    console.log('4. Import to Nextier');
    console.log('5. Launch AI-powered campaigns');

    return searchId;

  } catch (error) {
    console.error('❌ Error creating saved search:');
    console.error(error.response?.data || error.message);
    throw error;
  }
}

// Run it
createSavedSearch()
  .then(searchId => {
    console.log('\n🎉 SUCCESS! Your automated lead machine is set up!');
    console.log(`Search ID: ${searchId}`);
  })
  .catch(err => {
    console.error('\n❌ Failed:', err.message);
    process.exit(1);
  });

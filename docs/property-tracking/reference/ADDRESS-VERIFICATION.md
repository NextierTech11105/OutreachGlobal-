# Address Verification API Reference

## Overview

Verify 1-100 addresses at a time. Returns property IDs, geocodes, and normalized addresses.

**Endpoint:** `POST https://api.realestateapi.com/v2/AddressVerification`

---

## What is a "Valid" Property?

A verified property is:
- A REAPI recognized physical property
- A known structure with a unique property identifier
- Has mailing addresses for nearly all verified addresses

**Addresses that CANNOT be valid:**
- P.O. Boxes
- Land parcels without physical structures

---

## Confidence Scores

- Only returns a match when confidence is **100%**
- Only confidence scores of **0.88 or above** yield a match property
- Lower confidence scores return `match: false` even if a potential match exists

---

## Request Requirements

Submit an `addresses` array with:

**Option 1:** Individual fields
```json
{
  "street": "2505 NW 28th Street",
  "city": "Oklahoma City",
  "state": "OK",
  "zip": "73107"
}
```

**Option 2:** Street + Zip (no city/state required)
```json
{
  "street": "2505 NW 28th Street",
  "zip": "73107"
}
```

**Option 3:** Single address field
```json
{
  "address": "2505 NW 28th Street, Oklahoma City, OK 73107"
}
```

---

## Max Size & Mapping

- **Max addresses per call:** 100
- **Use `key` field** to map input data to output data
- Each address object can have a `key` field for easy mapping

**Example:**
```json
{
  "addresses": [
    {
      "key": 0,
      "street": "2505 NW 28th Street",
      "city": "Oklahoma City",
      "state": "OK",
      "zip": "73107"
    },
    {
      "key": 1,
      "street": "123 Main St",
      "zip": "10001"
    }
  ]
}
```

---

## Error Handling

Each address is treated **independently**:
- Returns 200 response even if some addresses fail
- Individual addresses can fail with:
  - **404 (Not Found):** Address doesn't exist in warehouse
  - **400 (Bad Request):** Address not parseable

**Example Response with Errors:**
```json
{
  "results": [
    {
      "key": 0,
      "match": true,
      "propertyId": "335810662",
      ...
    },
    {
      "key": 1,
      "error": 404,
      "errorMessage": "Address not found"
    }
  ]
}
```

---

## Data Normalization/Standardization

### Address Formatting

**Street Types:**
- Input: `"Street"` → Output: `"St"`
- Input: `"Avenue"` → Output: `"Ave"`
- Input: `"Boulevard"` → Output: `"Blvd"`

**Directional Prefixes:**
- Input: `"Northwest"` → Output: `"Nw"`
- Input: `"NW"` → Output: `"Nw"`

**Partial Addresses Get Filled:**
- Input: `"123 Main S"` → Output: `"123 Main St"`

**Tolerates Errors:**
```
Input:  "4508 Nw 48ht Str.   eet, Olkaho  a       Citty, OK        73107"
Output: "4508 Nw 48th St, Oklahoma City, OK 73107"
```

**Format Includes:**
- Commas after `address.label` and `address.city`
- Proper casing (initial capitals)
- No periods after abbreviations

---

## Rate Limiting

**By x-api-key:**
- **10 requests/second**
- **Up to 1,000 addresses/second** (10 req × 100 addresses)

**By x-user-id (if specified):**
- **3 requests/second**
- **Up to 300 addresses/second** (3 req × 100 addresses)

### Batch Processing Example

```javascript
const axios = require('axios');

let url = 'https://api.realestateapi.com/v2/AddressVerification';

// 1000 batches of 100 addresses = 100,000 total addresses
let addressVerifyBatches = [
  { addresses: [ /* 100 addresses */ ] },
  { addresses: [ /* 100 addresses */ ] },
  // ...998 more batches
];

let headers = {
  'x-api-key': "YOUR_API_KEY",
  // 'x-user-id': "testUserId" // Optional user-level rate limiting
};

let counter = 0;

// Process 10 batches per second = 1000 addresses/second
setInterval(async () => {
  for (let i = 0; i < 10; i++) {
    let body = {
      addresses: addressVerifyBatches[counter].addresses
    };

    let runVerify = await axios.post(url, body, {headers});
    counter++;
  }
}, 1000); // 1000ms = 1 second
```

**Without Rate Limiting:**
- Intermittent 429 errors
- Eventually only 429 errors when rate window is clogged

---

## Response Schema

### Root Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | REAPI unique property identifier |
| `propertyId` | string | REAPI unique property identifier (as string) |
| `vacant` | boolean | Property currently vacant |
| `absenteeOwner` | boolean | Owner not residing in property |
| `apn` | string | Assessor's Parcel Number |
| `latitude` | float | Property latitude |
| `longitude` | float | Property longitude |
| `lotNumber` | string | Lot number |
| `propertyUse` | string | Actual use (e.g., single-family residence) |
| `precision` | string | Lat/long accuracy (most are zip9) |
| `searchType` | string | "A" = full address verification |
| `match` | boolean | Matching address found |
| `confidence` | float | Match strength (0-1) |

### Address Object

| Field | Type | Description |
|-------|------|-------------|
| `fips` | string | FIPS code |
| `house` | string | House number |
| `address` | string | Full address |
| `street` | string | Street name |
| `preDirection` | string | Directional prefix (N, S, E, W) |
| `streetType` | string | Street type (Ave, St, Blvd) |
| `unit` | string | Unit number |
| `unitType` | string | Unit type (apartment, suite) |
| `city` | string | City name |
| `county` | string | County name |
| `state` | string | State code (VA, MD, NC) |
| `zip` | string | ZIP code |
| `zip4` | string | Extended ZIP+4 |
| `carrierRoute` | string | USPS carrier route |
| `congressionalDistrict` | integer | Congressional district |
| `label` | string | Address label |

### Mail Address Object

Same structure as Address object, but for mailing address (if different from property address).

---

## Enriching Verified Addresses

### Using REAPI Property ID

Once addresses are verified:

**1. Property Detail Bulk API:**
```javascript
const propertyIds = verifiedAddresses
  .filter(a => a.match)
  .map(a => a.propertyId);

// Feed into Property Detail Bulk API
const propertyDetails = await getPropertyDetails(propertyIds);
```

**2. SkipTrace API:**
```javascript
const skipTraceResults = await skipTrace(propertyIds);
```

---

## Performance

**Current Architecture:**
- **2,200 queries/second** (100 addresses per query)
- **220,000 addresses/second throughput**

**Ideal For:**
- Huge bulk jobs
- Syncing existing database to RealEstateAPI
- Real-time address validation

**Availability:**
- Pro+ plans
- Unlimited on Enterprise

---

## Example Request/Response

### Request
```json
{
  "addresses": [
    {
      "key": 0,
      "street": "2505 NW 28th Street",
      "city": "Oklahoma City",
      "state": "OK",
      "zip": "73107"
    },
    {
      "key": 1,
      "address": "123 Main St, New York, NY 10001"
    }
  ]
}
```

### Response
```json
{
  "results": [
    {
      "key": 0,
      "id": 335810662,
      "propertyId": "335810662",
      "match": true,
      "confidence": 0.99,
      "vacant": false,
      "absenteeOwner": true,
      "address": {
        "house": "2505",
        "street": "Nw 28th",
        "streetType": "St",
        "city": "Oklahoma City",
        "state": "OK",
        "zip": "73107",
        "label": "2505 Nw 28th St, Oklahoma City, OK 73107"
      },
      "latitude": 35.4944,
      "longitude": -97.5461
    },
    {
      "key": 1,
      "match": true,
      "confidence": 0.95,
      "propertyId": "194066223",
      "address": {
        "house": "123",
        "street": "Main",
        "streetType": "St",
        "city": "New York",
        "state": "NY",
        "zip": "10001",
        "label": "123 Main St, New York, NY 10001"
      }
    }
  ],
  "statusCode": 200,
  "credits": 2
}
```

---

## Integration with Property Tracking

Use Address Verification to:
1. Validate user-inputted addresses
2. Get property IDs for tracking
3. Normalize addresses for database storage
4. Geocode addresses for map display

**Workflow:**
```
User Input Address
  ↓
Address Verification API
  ↓
Get Property ID + Normalized Address
  ↓
Property Detail API (get full data)
  ↓
Skip Trace API (get owner contacts)
  ↓
Save to Database
  ↓
Add to Saved Search for Tracking
```

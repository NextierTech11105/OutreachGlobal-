# API Endpoints

## Base URL
```
Production: https://monkfish-app-mb7h3.ondigitalocean.app
Local: http://localhost:3001
```

## Authentication
All endpoints require authentication except where noted.

**Auth Header:**
```
Authorization: Bearer <jwt_token>
```

**Team ID:**
All endpoints require `:teamId` parameter in URL.

---

## Search Endpoints

### 1. Property Search
Execute property search with layered filters.

**Endpoint:** `POST /rest/:teamId/realestate-api/property-search`

**Request Body:**
```json
{
  "state": "NY",
  "county": "Nassau",
  "zipCode": "11530",
  "propertyType": "Multi-Family",
  "absenteeOwner": true,
  "preForeclosure": false,
  "yearsOwned": 5,
  "sortBy": "equity_percent",
  "sortDirection": "desc",
  "size": 50
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "prop_123",
      "address": "123 Main St",
      "city": "Garden City",
      "state": "NY",
      "zipCode": "11530",
      "propertyType": "Multi-Family",
      "estimatedValue": 850000,
      "equityPercent": 65,
      "ownerName": "John Doe",
      "absenteeOwner": true,
      "yearsOwned": 8
    }
  ],
  "total": 1543
}
```

---

### 2. Property Count
Get total count before executing search.

**Endpoint:** `POST /rest/:teamId/realestate-api/property-count`

**Request Body:**
```json
{
  "state": "NY",
  "county": "Nassau",
  "propertyType": "Multi-Family",
  "absenteeOwner": true
}
```

**Response:**
```json
{
  "count": 1543,
  "estimatedResults": 1543
}
```

---

### 3. Property Detail
Get full property payload including lender and mortgage info.

**Endpoint:** `POST /rest/:teamId/realestate-api/property-detail/:propertyId`

**Auth:** Required

**Response:**
```json
{
  "id": "prop_123",
  "address": {
    "streetAddress": "123 Main St",
    "city": "Garden City",
    "state": "NY",
    "zip": "11530"
  },
  "ownerInfo": {
    "owner1FirstName": "John",
    "owner1LastName": "Doe",
    "owner1FullName": "John Doe",
    "mailAddress": {
      "address": "456 Oak Ave",
      "city": "Miami",
      "state": "FL",
      "zip": "33101"
    }
  },
  "propertyInfo": {
    "propertyType": "Multi-Family",
    "yearBuilt": 1985,
    "bedrooms": 8,
    "bathrooms": 6,
    "buildingSquareFeet": 3500,
    "lotSquareFeet": 7500
  },
  "taxInfo": {
    "assessedValue": 820000,
    "taxAmount": 18500,
    "taxYear": 2024
  },
  "mortgageInfo": {
    "lenderName": "Wells Fargo Bank",
    "loanAmount": 450000,
    "loanType": "Conventional",
    "loanDate": "2018-06-15",
    "interestRate": 4.25
  },
  "estimatedValue": 850000,
  "equityPercent": 47,
  "yearsOwned": 8,
  "lastSaleDate": "2017-03-20",
  "lastSalePrice": 650000,
  "absenteeOwner": true,
  "ownerOccupied": false,
  "vacant": false,
  "preForeclosure": false,
  "foreclosure": false,
  "lisPendens": false,
  "mlsListed": false,
  "propertiesOwned": 4,
  "portfolioValue": 3200000
}
```

---

### 4. Skip Trace
Get owner contact information.

**Endpoint:** `POST /rest/:teamId/realestate-api/skip-trace`

**Auth:** Required

**Request Body:**
```json
{
  "propertyId": "prop_123"
}
```

**Response:**
```json
{
  "match": true,
  "confidence": 0.92,
  "identity": {
    "firstName": "John",
    "lastName": "Doe",
    "phones": [
      {
        "number": "+1-555-123-4567",
        "type": "mobile",
        "valid": true
      },
      {
        "number": "+1-555-987-6543",
        "type": "home",
        "valid": true
      }
    ],
    "emails": [
      {
        "email": "john.doe@example.com",
        "valid": true
      }
    ],
    "currentAddress": {
      "address": "456 Oak Ave",
      "city": "Miami",
      "state": "FL",
      "zip": "33101"
    }
  }
}
```

---

## Saved Search Endpoints

### 5. Create Saved Search
Save search criteria and property IDs.

**Endpoint:** `POST /rest/:teamId/realestate-api/saved-search/create`

**Auth:** Required

**Request Body:**
```json
{
  "searchName": "MFH-Nassau-Absentee",
  "searchQuery": {
    "state": "NY",
    "county": "Nassau",
    "propertyType": "Multi-Family",
    "absenteeOwner": true,
    "yearsOwned": 5
  },
  "batchJobEnabled": "true"
}
```

**Response:**
```json
{
  "id": "ss_01abc123",
  "searchName": "MFH-Nassau-Absentee",
  "totalProperties": 1543,
  "createdAt": "2025-01-22T10:30:00Z"
}
```

---

### 6. List Saved Searches
Get all saved searches for team.

**Endpoint:** `POST /rest/:teamId/realestate-api/saved-search/list`

**Auth:** Required

**Response:**
```json
[
  {
    "id": "ss_01abc123",
    "searchName": "MFH-Nassau-Absentee",
    "totalProperties": 1543,
    "addedCount": 12,
    "deletedCount": 5,
    "updatedCount": 34,
    "lastBatchJobAt": "2025-01-22T00:00:00Z",
    "batchJobStatus": "completed"
  }
]
```

---

### 7. Delete Saved Search
Delete a saved search.

**Endpoint:** `POST /rest/:teamId/realestate-api/saved-search/delete`

**Auth:** Required

**Request Body:**
```json
{
  "searchId": "ss_01abc123"
}
```

**Response:**
```json
{
  "searchId": "ss_01abc123",
  "deleted": true
}
```

---

## Campaign Endpoints

### 8. Import to Campaign
Create Nextier leads and launch campaign.

**Endpoint:** `POST /rest/:teamId/realestate-api/import-to-campaign`

**Auth:** Required

**Request Body:**
```json
{
  "propertyIds": [
    "prop_123",
    "prop_456",
    "prop_789"
  ],
  "campaignName": "Q1 MFH Outreach",
  "messageTemplateId": "template_xyz"
}
```

**Response:**
```json
{
  "totalProperties": 3,
  "successfullyProcessed": 3,
  "leads": [
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1-555-123-4567",
      "address": "123 Main St",
      "city": "Garden City",
      "state": "NY",
      "zipCode": "11530",
      "propertyValue": 850000,
      "equityPercent": 47,
      "propertyType": "Multi-Family",
      "metadata": {
        "propertyId": "prop_123",
        "skipTraceMatch": true,
        "portfolio": 4
      }
    }
  ],
  "campaignName": "Q1 MFH Outreach"
}
```

---

## Automation Endpoints

### 9. Run Daily Automation
Manually trigger daily tracking job.

**Endpoint:** `POST /rest/:teamId/realestate-api/automation/run-daily`

**Auth:** Required

**Request Body:**
```json
{
  "savedSearchIds": ["ss_01abc123", "ss_01xyz789"]
}
```

**Response:**
```json
{
  "processed": 2,
  "totalEvents": 47,
  "criticalEvents": 12
}
```

---

### 10. Monitor Property Events
Get recent events for specific properties.

**Endpoint:** `POST /rest/:teamId/realestate-api/automation/monitor-events`

**Auth:** Required

**Request Body:**
```json
{
  "propertyIds": ["prop_123", "prop_456"]
}
```

**Response:**
```json
{
  "events": [
    {
      "propertyId": "prop_123",
      "event": "pre_foreclosure",
      "priority": "CRITICAL",
      "detectedAt": "2025-01-22T08:30:00Z",
      "oldValue": false,
      "newValue": true
    },
    {
      "propertyId": "prop_456",
      "event": "estate_deed",
      "priority": "CRITICAL",
      "detectedAt": "2025-01-21T12:15:00Z",
      "oldValue": "warranty",
      "newValue": "estate"
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    "state is required",
    "propertyType must be a valid type"
  ]
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Invalid token"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Property not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Failed to fetch property details"
}
```

---

## Rate Limits

- **Property Search:** 100 requests/minute
- **Property Detail:** 250 requests/hour (RealEstateAPI limit)
- **Skip Trace:** 500 requests/hour (cost limit)
- **Campaign Import:** 10 requests/minute

## Batch Processing

All batch operations process **250 properties at a time**:
- Property Detail fetching
- Skip Trace execution
- Campaign SMS sends

# Saved Search & Property Portfolio Tracking

## Overview

Keep your property data fresh with daily automated tracking. The Property Portfolio APIs track property IDs or search criteria to detect:
- **New additions** - Properties that now match your criteria
- **Updates** - Existing properties with field changes
- **Deletions** - Properties that no longer match criteria

**Common Use Cases:**
- Track on-market vs off-market status (mls_active)
- Monitor pre-foreclosures / auctions
- Routine vacancy status checks
- Estate deed detection
- MLS listing changes

---

## 1. Create Saved Search API

**Endpoint:** `POST https://api.realestateapi.com/v1/PropertyPortfolio/SavedSearch/Create`

### Request Body

```json
{
  "search_name": "Oklahoma City MLS Active SFR",
  "search_query": {
    "size": 1000,
    "mls_active": true,
    "property_type": "SFR",
    "city": "Oklahoma City",
    "state": "OK"
  },
  "list_size": 1000,
  "meta_data": {
    "key_1": "test-metadata-value"
  }
}
```

### Response

```json
{
  "input": {
    "search_name": "Oklahoma City MLS Active SFR",
    "search_query": { ... },
    "meta_data": { ... }
  },
  "data": {
    "searchId": "5a90fb85-37c5-456f-b88f-dec52c0b8911",
    "searchName": "Oklahoma City MLS Active SFR",
    "xUserId": "x-user-id"
  },
  "statusCode": 200,
  "statusMessage": "Success",
  "credits": 10
}
```

### Parameters

| Field | Type | Description |
|-------|------|-------------|
| `search_name` | string | Descriptive name for the search |
| `search_query` | object | Property Search query criteria |
| `list_size` | integer | Max 10,000 properties |
| `meta_data` | object | Optional metadata for filtering |

---

## 2. Retrieve Saved Search API

**Endpoint:** `POST https://api.realestateapi.com/v1/PropertyPortfolio/SavedSearch`

**Purpose:** Get daily diff of property changes

### Request

```json
{
  "search_id": "3b17feae-0245-45ef-a91b-77b89ced524c"
}
```

### Response

```json
{
  "input": {
    "search_id": "3b17feae-0245-45ef-a91b-77b89ced524c"
  },
  "data": {
    "search": {
      "searchId": "3b17feae-0245-45ef-a91b-77b89ced524c",
      "accountId": 59,
      "xUserId": null,
      "searchName": "MLS Active In The 918",
      "searchQuery": "{\"city\":\"Tulsa\",\"state\":\"OK\",\"mls_active\":true}",
      "list_size": 10000,
      "lastReportDate": "2024-05-24T03:28:16.000Z",
      "nextReportDate": "2024-05-25T03:28:16.000Z",
      "createdAt": "2024-05-24T03:25:11.000Z",
      "meta_data": {}
    },
    "results": [
      {
        "id": "186925006",
        "changeType": "deleted",
        "lastUpdateDate": "2024-01-09T00:00:00.000Z"
      },
      {
        "id": "385788",
        "changeType": null,
        "lastUpdateDate": "2024-02-23T00:00:00.000Z"
      },
      {
        "id": "197384549",
        "changeType": "updated",
        "lastUpdateDate": "2024-05-02T00:00:00.000Z"
      },
      {
        "id": "194078780",
        "changeType": "added",
        "lastUpdateDate": "2024-01-09T00:00:00.000Z"
      }
    ],
    "summary": {
      "size": 10000,
      "added": 1,
      "deleted": 1,
      "updated": 11,
      "unchanged": 9987
    }
  },
  "statusCode": 200,
  "statusMessage": "Success",
  "credits": 0,
  "live": true,
  "requestExecutionTimeMS": "249ms"
}
```

### Change Types

| Change Type | Description | Action Required |
|-------------|-------------|-----------------|
| `added` | New property matching criteria | Call Property Detail + Save to DB |
| `updated` | Existing property with field changes | Call Property Detail + Update DB |
| `deleted` | Property no longer matches criteria | Remove from DB |
| `null` (unchanged) | No changes detected | No action needed |

---

## 3. Grouping & Performing Updates

### Handle Additions (`changeType: "added"`)

**Step 1:** Call Property Detail API
```typescript
const propertyDetail = await getPropertyDetail(propertyId);
```

**Step 2:** Save to database with changelog
```json
{
  "id": "194078780",
  "lastUpdated": "2024-01-09T00:00:00.000Z",
  "lastChangeType": "added",
  "data": {
    ...propertyDetailResponse
  }
}
```

**Alternative: Changelog Array**
```json
{
  "id": "194078780",
  "changelog": [
    {
      "changeType": "added",
      "updateDate": "2024-01-09T00:00:00.000Z"
    }
  ],
  "data": {
    ...propertyDetailResponse
  }
}
```

### Handle Updates (`changeType: "updated"`)

**Step 1:** Check if ID exists in DB

**Step 2:** Check timestamp vs refresh policy
- Weekly refresh
- Monthly refresh
- Immediate refresh (whenever available)

**Step 3:** If refreshing, call Property Detail

**Step 4:** Diff old vs new data
```typescript
const diff = comparePropertyData(oldData, newData);

// Store diff for audit trail
changelog.push({
  changeType: "updated",
  updateDate: "2024-05-02T00:00:00.000Z",
  changes: {
    mlsListed: { old: false, new: true },
    mlsPrice: { old: null, new: 450000 }
  }
});
```

**Step 5:** Update database

### Handle Deletions (`changeType: "deleted"`)

**Step 1:** Remove from active tracking
```typescript
await db.savedSearchResults.update({
  where: { propertyId: "186925006" },
  data: {
    deleted: true,
    deletedAt: new Date()
  }
});
```

**Best Practice:** Soft delete instead of hard delete to maintain historical records.

### Handle Unchanged (`changeType: null`)

**No action required.** Property still matches criteria but no field changes detected.

---

## 4. Get All Saved Searches API

**Endpoint:** `POST https://api.realestateapi.com/v1/PropertyPortfolio/SavedSearch/List`

### Filter by search_id

```json
{
  "filter": {
    "search_id": "your-search-id"
  }
}
```

Returns a single search.

### Filter by x_user_id

```json
{
  "filter": {
    "x_user_id": "your-x-user-id"
  }
}
```

Returns all searches associated with user.

### Filter by meta_data

```json
{
  "filter": {
    "meta_data": {
      "key_1": "foo",
      "key_3": "baz"
    }
  }
}
```

Returns all searches matching metadata fields.

---

## 5. Delete Saved Search API

**Endpoint:** `POST https://api.realestateapi.com/v1/PropertyPortfolio/SavedSearch/Delete`

### Request

```json
{
  "search_id": "5a90fb85-37c5-456f-b88f-dec52c0b8911"
}
```

### Response

```json
{
  "input": {
    "search_id": "1280f7b8-7285-4055-915d-f19be4cd7af1"
  },
  "data": {
    "searchId": "1280f7b8-7285-4055-915d-f19be4cd7af1",
    "deleted": true
  },
  "statusCode": 200,
  "statusMessage": "Success",
  "credits": 0
}
```

---

## 6. Track a List of IDs

For scenarios where properties don't fall into a single search criteria.

### Create Saved Search with ID List

```json
{
  "search_name": "Lukas_IDsTest_062525",
  "list_size": 10,
  "search_query": {
    "ids": [
      "335810662",
      "190167848",
      "191455659",
      "194066223",
      "187069145",
      "33726348",
      "35780942",
      "35809525",
      "34483531",
      "40671873"
    ]
  }
}
```

### Response

```json
{
  "input": {
    "search_name": "Lukas_IDsTest_062525",
    "list_size": 10,
    "search_query": {
      "ids": [...],
      "size": 10,
      "ids_last_update": true
    }
  },
  "data": {
    "search": {
      "searchId": "910d5054-8c88-4ee2-a139-284d4cxxxxxx",
      "searchName": "Lukas_IDsTest_062525",
      ...
    },
    "results": [ 10 properties ],
    "summary": {
      "size": 10,
      "added": 10,
      "deleted": 0,
      "updated": 0,
      "unchanged": 0
    }
  },
  "statusCode": 200,
  "credits": 0
}
```

### Retrieve Daily Updates

Same as regular saved search retrieval:

```json
{
  "searchId": "910d5054-8c88-4ee2-a139-284d4cxxxxxx"
}
```

### Tracking More Than 10,000 IDs

**Limitation:** `list_size` max is 10,000

**Solution:** Break into multiple saved searches

**Naming Convention:**
```
"IDs_List_Seq_000"
"IDs_List_Seq_001"
"IDs_List_Seq_002"
...
```

**Alternative at Scale (10M+ properties):**
- Track by ZIP code instead
- One saved search per ZIP
- Prioritize ZIP codes with most properties

---

## Integration with Nextier Property Tracking

### Database Schema Alignment

**saved_searches table:**
```typescript
{
  id: "ss_01abc123",
  teamId: "team_xyz",
  searchName: "MFH-Nassau-Absentee",
  searchQuery: { state: "NY", county: "Nassau", ... },
  realEstateSearchId: "5a90fb85-37c5-456f-b88f-dec52c0b8911", // <- REAPI search_id
  lastReportDate: "2024-05-24T03:28:16.000Z",
  nextReportDate: "2024-05-25T03:28:16.000Z",
  totalProperties: 1543,
  addedCount: 12,
  deletedCount: 5,
  updatedCount: 34,
  batchJobEnabled: "true"
}
```

**saved_search_results table:**
```typescript
{
  id: "ssr_01abc123",
  savedSearchId: "ss_01abc123",
  propertyId: "194078780",
  changeType: "added",
  lastUpdateDate: "2024-01-09T00:00:00.000Z",
  firstSeenAt: "2024-01-09T00:00:00.000Z",
  lastSeenAt: "2024-05-24T00:00:00.000Z",
  timesFound: "145",
  signals: {
    mlsListed: true,
    mlsPrice: 450000,
    preForeclosure: false,
    deedType: "warranty"
  },
  signalHistory: [
    {
      date: "2024-01-09",
      events: [],
      signals: { mlsListed: false },
      changeType: "added"
    },
    {
      date: "2024-05-02",
      events: ["mls_listed"],
      signals: { mlsListed: true, mlsPrice: 450000 },
      changeType: "updated"
    }
  ],
  propertyData: { ...fullPropertyDetail }
}
```

### Daily Tracking Workflow

```typescript
async function runDailyTracking(savedSearchId: string) {
  // 1. Get saved search from DB
  const savedSearch = await db.savedSearches.findUnique({
    where: { id: savedSearchId }
  });

  // 2. Call REAPI Retrieve Saved Search
  const reapi Result = await realEstateAPI.retrieveSavedSearch({
    search_id: savedSearch.realEstateSearchId
  });

  // 3. Group by changeType
  const added = reapiResult.results.filter(r => r.changeType === "added");
  const updated = reapiResult.results.filter(r => r.changeType === "updated");
  const deleted = reapiResult.results.filter(r => r.changeType === "deleted");

  // 4. Handle additions (batch 250)
  for (let i = 0; i < added.length; i += 250) {
    const batch = added.slice(i, i + 250);
    const propertyDetails = await realEstateAPI.bulkPropertyDetail(batch.map(p => p.id));

    for (const property of propertyDetails) {
      await db.savedSearchResults.create({
        data: {
          savedSearchId,
          propertyId: property.id,
          changeType: "added",
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          signals: extractSignals(property),
          propertyData: property
        }
      });
    }
  }

  // 5. Handle updates (selective refresh)
  for (const prop of updated) {
    const existing = await db.savedSearchResults.findFirst({
      where: { propertyId: prop.id, savedSearchId }
    });

    // Refresh if older than 7 days
    if (daysSince(existing.lastUpdateDate) > 7) {
      const freshData = await realEstateAPI.propertyDetail(prop.id);
      const oldSignals = existing.signals;
      const newSignals = extractSignals(freshData);

      // Detect events
      const events = detectEvents(oldSignals, newSignals);

      await db.savedSearchResults.update({
        where: { id: existing.id },
        data: {
          signals: newSignals,
          signalHistory: [
            ...existing.signalHistory,
            {
              date: new Date(),
              events,
              signals: newSignals,
              changeType: "updated"
            }
          ],
          propertyData: freshData,
          lastUpdateDate: new Date()
        }
      });

      // Trigger campaigns for critical events
      if (events.includes("estate_deed") || events.includes("pre_foreclosure")) {
        await triggerFollowUpCampaign(prop.id, events);
      }
    }
  }

  // 6. Handle deletions
  for (const prop of deleted) {
    await db.savedSearchResults.update({
      where: { propertyId: prop.id, savedSearchId },
      data: { deleted: true, deletedAt: new Date() }
    });
  }

  // 7. Update summary stats
  await db.savedSearches.update({
    where: { id: savedSearchId },
    data: {
      addedCount: added.length.toString(),
      deletedCount: deleted.length.toString(),
      updatedCount: updated.length.toString(),
      lastBatchJobAt: new Date(),
      batchJobStatus: "completed"
    }
  });
}
```

---

## Best Practices

### 1. Refresh Policy

**Weekly Refresh (Cost Efficient):**
- Refresh properties with `lastUpdateDate` > 7 days old
- Good for stable properties (SFR, owner-occupied)

**Daily Refresh (Data Fresh):**
- Refresh all updated properties immediately
- Ideal for volatile properties (MLS listings, foreclosures)

**Smart Refresh (Balanced):**
```typescript
function shouldRefresh(property: SavedSearchResult): boolean {
  // Always refresh critical events
  if (property.signals.preForeclosure || property.signals.mlsListed) {
    return true;
  }

  // Weekly for stable properties
  return daysSince(property.lastUpdateDate) > 7;
}
```

### 2. Changelog Strategy

**Option A: Full Payload Storage**
```json
{
  "changelog": [
    {
      "date": "2024-05-02",
      "fullSnapshot": { ...entirePropertyDetail }
    }
  ]
}
```

**Option B: Diff Only (Efficient)**
```json
{
  "changelog": [
    {
      "date": "2024-05-02",
      "changes": {
        "mlsListed": { old: false, new: true },
        "mlsPrice": { old: null, new: 450000 }
      }
    }
  ]
}
```

**Recommendation:** Use Option B (diff only) to save storage and make change detection easier.

### 3. Error Handling

```typescript
try {
  const result = await realEstateAPI.retrieveSavedSearch(searchId);
} catch (error) {
  await db.savedSearches.update({
    where: { id: savedSearchId },
    data: {
      batchJobStatus: "failed",
      lastError: error.message
    }
  });

  // Alert team
  await sendAlert(`Tracking job failed for ${savedSearch.searchName}`);
}
```

### 4. Rate Limiting

When processing large searches:
- Batch Property Detail calls (250 at a time)
- Add delays between batches
- Monitor API rate limits

---

## Example: Estate Deed Tracking

**Create Saved Search:**
```json
{
  "search_name": "Nassau-MFH-Estate-Deeds",
  "search_query": {
    "state": "NY",
    "county": "Nassau",
    "property_type": "MFR",
    "document_type_code": ["DTDT", "DTEX", "DTPR", "DTAD"],
    "years_owned": 5,
    "size": 10000
  }
}
```

**Daily Cron Job:**
```typescript
// Run at midnight
cron.schedule('0 0 * * *', async () => {
  const estateDeedSearches = await db.savedSearches.findMany({
    where: { batchJobEnabled: "true", searchName: { contains: "Estate-Deeds" } }
  });

  for (const search of estateDeedSearches) {
    await runDailyTracking(search.id);
  }
});
```

**Result:** Automatic detection of estate deed transfers → Immediate SMS campaign to motivated sellers.

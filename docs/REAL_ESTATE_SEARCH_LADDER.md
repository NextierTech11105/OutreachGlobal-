# Real Estate API Ladder Journey

Here is the **ladder-style journey** for a property search that touches the RealEstateAPI from end to end. Each row is a participant and each arrow is a hands-off interaction, so you can visibly follow how a user action ripples through the system.

```mermaid
sequenceDiagram
  participant User
  participant Frontend as "Property Search UI"
  participant API as "/api/property-search"
  participant Service as "RealEstateApi Service"
  participant External as "RealEstateAPI"
  participant SavedSearch as "Saved Search API / DB"
  participant Bucket as "CSV/Object Bucket"

  User->>Frontend: Choose state, county, property type, zoning, filters, click Search
  Frontend->>API: GET /api/property-search?state=...&propertyType=...&lot_size_min=...&pre_foreclosure=true
  API->>Service: Build PropertySearchQuery and call searchProperties
  Service->>External: POST /v2/PropertySearch with query + API key
  External-->>Service: Returns property list
  Service-->>API: Return result data
  API-->>Frontend: JSON payload
  Frontend-->>User: Display cards, badges (MLS, zoning, owner history)

  User->>Frontend: Save search (name/description + query)
  Frontend->>SavedSearch: POST /api/saved-searches { query, userId, notifyOnChanges }
  SavedSearch->>Service: runSavedSearchForIds -> search + ID batching
  Service-->>SavedSearch: ids + counts
  SavedSearch->>SavedSearch: Insert saved_searches row
  SavedSearch->>SavedSearch: Batch insert saved_search_property_ids (10K limit)
  SavedSearch->>Bucket: Export job grabs IDs, fetches details, writes CSV/object rows
  Bucket-->>SavedSearch: (optional) notifications about completion
```

This diagram acts like a ladder: each participant is a rung, and the arrows show where the control passes from one team to another. Use it for presentations or to explain the life cycle of a property search bucket.

# Outreach Global Storyboard

This storyboard is a **visual storytelling map** of how the platform works—from the user clicking filters to saved searches turning into buckets. Each “frame” mirrors the shapes/arrows idea you asked for, with a short caption and an accompanying mermaid snippet to sketch what is happening.

## Frame 1: User sets filters

- Caption: “I pick state, county, property type, zoning, and flags like MLS-listed or pre-foreclosure; then I hit Search.”
- Visual:

```mermaid
flowchart LR
  User([User]) --> UI[Property Search Screen]
  UI --> FilterControls{"Filters: state, county, property type, zoning, lot size, MLS, owner flags"}
```

## Frame 2: UI talks to backend

- Caption: “The UI sends those filters to `/api/property-search`, which forwards them to RealEstateAPI.”
- Visual:

```mermaid
flowchart LR
  UI[Property Search Screen] --> API["/api/property-search"]
  API --> Service[RealEstateAPI Client]
  Service --> Response[Property data]
  Response --> UI
```

## Frame 3: Saving becomes a bucket

- Caption: “Saving the search runs it again, stores up to 10K IDs, and flags any MLS/ownership changes.”
- Visual:

```mermaid
flowchart LR
  API --> SavedSearches[(saved_searches + saved_search_property_ids)]
  SavedSearches --> Bucket[10K-ID Bucket]
  SavedSearches --> Events[Change log + alerts]
```

## Frame 4: Export and automation

- Caption: “Now you can export that bucket to CSV/Object bucket with zoning, lot size, MLS, ownership history, etc.”
- Visual:

```mermaid
flowchart LR
  Bucket --> Export[CSV / Object Storage]
  Export --> Automation[Marketing / Outreach flow]
```

Reuse this storyboard in presentations or docs by showing each frame as a slide; the simple shapes and captions keep things non-technical while still explaining what touches what. Let me know if you want an actual image file or a slide deck version. 

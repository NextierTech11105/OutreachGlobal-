# NEXTIER PAGE MAP - COMPLETE FEATURE AUDIT

## CRITICAL PATH (Must Work)
1. Import CSV → 2. View Leads → 3. Create Campaign → 4. Send SMS → 5. Handle Replies

---

## ALL PAGES

### SECTORS
| Page | Route | Backend API | Status |
|------|-------|-------------|--------|
| Dashboard | /t/[team] | None | BROKEN - no data queries |
| Sectors | /t/[team]/sectors | GET /luci/sectors | WORKS |

### HUB
| Page | Route | Backend API | Status |
|------|-------|-------------|--------|
| Import | /t/[team]/import | POST /raw-data-lake/import | NEEDS TEST |
| B2B Search | /t/[team]/b2b-search | POST /business-list/search | WORKS |
| Skip Trace | /t/[team]/skip-trace | POST /luci/enrich | WORKS |
| Lead Lab | /t/[team]/lead-lab | GET /luci/leadlab | WORKS |
| Leads | /t/[team]/leads | GraphQL leads query | WORKS (names fixed) |
| Data Browser | /t/[team]/data-browser | GraphQL | NEEDS TEST |

### LAKE
| Page | Route | Backend API | Status |
|------|-------|-------------|--------|
| Deals | /t/[team]/deals | GraphQL | UNKNOWN |

### CONTENT
| Page | Route | Backend API | Status |
|------|-------|-------------|--------|
| Content Hub | /t/[team]/content | None | UI ONLY |
| Valuation Tool | /t/[team]/valuation | Real Estate API | WORKS |

### CAMPAIGNS
| Page | Route | Backend API | Status |
|------|-------|-------------|--------|
| Campaign Builder | /t/[team]/campaign-builder | POST /campaigns | WORKS |
| Campaigns | /t/[team]/campaigns | GET /campaigns | WORKS |
| Quick Send | /t/[team]/quick-send | POST /gianna/send | NEEDS TEST |
| Digital Workers | /t/[team]/digital-workers | /gianna, /cathy, /sabrina | PARTIAL |
| Sequences | /t/[team]/sequences | /sequences | WORKS |
| SMS Queue | /t/[team]/sms/queue | BullMQ queue | WORKS |

### INBOX
| Page | Route | Backend API | Status |
|------|-------|-------------|--------|
| Messages | /t/[team]/inbox | GET /inbox | WORKS |
| Call Queue | /t/[team]/call-center | call_queue table | SCHEMA ONLY |
| Power Dialer | /t/[team]/power-dialer | None | UI ONLY |
| Appointments | /t/[team]/appointments | None | UI ONLY |
| Workflows | /t/[team]/workflows | /workflows | WORKS |

### ANALYTICS
| Page | Route | Backend API | Status |
|------|-------|-------------|--------|
| Overview | /t/[team]/analytics | None | UI ONLY |
| SMS Analytics | /t/[team]/sms/analytics | /metrics | WORKS |
| Pipeline Heatmap | /t/[team]/pipelines | None | UI ONLY |
| Reports | /t/[team]/reports | None | UI ONLY |
| API Monitor | /t/[team]/api-monitor | /health | WORKS |

### SETTINGS
| Page | Route | Backend API | Status |
|------|-------|-------------|--------|
| Settings | /t/[team]/settings | GraphQL team | WORKS |
| Diagnostics | /t/[team]/diagnostics | /health | WORKS |
| Account | /t/[team]/settings/account | GraphQL | WORKS |
| Users | /t/[team]/users | GraphQL teamMembers | WORKS |
| Integrations | /t/[team]/integrations | GraphQL | WORKS |
| SignalHouse | /t/[team]/signalhouse | /signalhouse/configure | WORKS |

---

## CRITICAL FIXES NEEDED

### 1. Dashboard - Show Real Data
- Add lead counts by status
- Add campaign metrics
- Add SMS stats

### 2. Import - Test End-to-End
- Upload CSV from C:\Users\colep\Downloads\US_*_Database
- Verify leads appear in /leads page
- Verify names show (fixed in resolver)

### 3. Quick Send - Test SMS Flow
- Select lead
- Pick template
- Send via SignalHouse
- Verify delivery

### 4. Call Queue - Add Routing
- Implement actual call queue logic
- Route hot leads to queue
- Track call outcomes

---

## YOUR CSV FILES
- C:\Users\colep\Downloads\US_Consultant_Database
- C:\Users\colep\Downloads\US_Plumber_Database
- C:\Users\colep\Downloads\US_Realtor_Database

These need to be imported via /t/[team]/import

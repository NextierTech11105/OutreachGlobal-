# NEXTIER Platform Debugging & Fix Prompt

## Problem Statement
The NEXTIER outreach platform has a critical architectural mismatch between frontend and backend:
- **Frontend** calls REST endpoints like `/api/buckets`, `/api/sectors/stats`, `/api/leads`
- **Backend** has GraphQL resolvers and different REST paths like `/raw-data-lake/import`
- **Result**: All pages show zeros/errors because API calls return 404

## Root Cause Analysis

### Frontend Calls (NOT WORKING)
```typescript
// apps/front/src/app/t/[team]/sectors/page.tsx
fetch("/api/buckets?perPage=100")      // ❌ 404
fetch("/api/sectors/stats")             // ❌ 404

// apps/front/src/app/t/[team]/quick-send/page.tsx
fetch("/api/buckets")                   // ❌ 404
fetch("/api/lead/upload")               // ❌ 404
```

### Backend Endpoints (EXIST BUT DIFFERENT PATHS)
```typescript
// apps/api/src/app/raw-data-lake/raw-data-lake.controller.ts
@Controller("raw-data-lake")            // ✅ Works but path is /raw-data-lake/*
POST /raw-data-lake/import              // ✅

// GraphQL Resolvers
// apps/api/src/app/lead/resolvers/lead.resolver.ts     // ✅ GraphQL only
// apps/api/src/app/team/resolvers/team.resolver.ts     // ✅ GraphQL only
```

## Solution Required

### Option A: Add Missing REST Endpoints (RECOMMENDED)
Create REST controllers to match what frontend expects:

1. **`/api/buckets` controller** - List all data lake buckets
   - Returns: id, name, description, source, totalLeads, enrichedLeads, etc.

2. **`/api/sectors/stats` controller** - Return sector statistics
   - Returns: raw, skip_traced, validated, ready, blocked, sent counts

3. **`/api/leads` controller** - CRUD operations for leads
   - GET /leads - List leads with pagination
   - POST /leads - Create lead
   - GET /leads/:id - Get single lead

4. **`/api/lead/upload` controller** - CSV import
   - Accepts: csvContent, vertical, sourceTag, fileName
   - Returns: success, message, stats (total, withPhone, withEmail, withAddress)

### Option B: Rewrite Frontend to Use GraphQL
Replace all `fetch()` calls with GraphQL queries using Apollo Client

## Implementation Instructions

### Step 1: Create Buckets Controller
File: `apps/api/src/app/buckets/buckets.controller.ts`
```typescript
@Controller("api/buckets")
@UseGuards(CombinedAuthGuard)
export class BucketsController {
  @Get()
  async list(@TenantContext("teamId") teamId: string) {
    // Query buckets from database
    // Return bucket list with stats
  }
  
  @Get(":id")
  async get(@TenantContext("teamId") teamId: string, @Param("id") id: string) {
    // Get single bucket with leads
  }
}
```

### Step 2: Create Sectors Stats Controller
File: `apps/api/src/app/sectors/sectors.controller.ts`
```typescript
@Controller("api/sectors")
@UseGuards(CombinedAuthGuard)
export class SectorsController {
  @Get("stats")
  async stats(@TenantContext("teamId") teamId: string) {
    // Aggregate lead counts by status
    // Return: raw, skip_traced, validated, ready, blocked, sent
  }
}
```

### Step 3: Create Leads Controller
File: `apps/api/src/app/lead/controllers/lead.controller.ts`
```typescript
@Controller("api/leads")
@UseGuards(CombinedAuthGuard)
export class LeadController {
  @Get()
  async list(@TenantContext("teamId") teamId: string, @Query() query: any) {
    // List leads with pagination/filtering
  }
  
  @Post()
  async create(@TenantContext("teamId") teamId: string, @Body() body: any) {
    // Create new lead
  }
  
  @Get(":id")
  async get(@TenantContext("teamId") teamId: string, @Param("id") id: string) {
    // Get single lead with relations
  }
}
```

### Step 4: Wire Controllers in Module
Update `apps/api/src/app/lead/lead.module.ts`:
```typescript
import { LeadController } from "./controllers/lead.controller";

@Module({
  controllers: [
    LeadController,
    SignalHouseController,
    SignalHouseWebhookController,
    // ... existing controllers
  ],
})
export class LeadModule {}
```

### Step 5: Add New Modules
Create `apps/api/src/app/buckets/buckets.module.ts` and `apps/api/src/app/sectors/sectors.module.ts`

### Step 6: Register in App Module
Update `apps/api/src/app/app.module.ts`:
```typescript
import { BucketsModule } from "./buckets/buckets.module";
import { SectorsModule } from "./sectors/sectors.module";

@Module({
  imports: [
    // ... existing imports
    BucketsModule,
    SectorsModule,
  ],
})
export class AppModule {}
```

## Files to Create/Modify

### New Files
1. `apps/api/src/app/buckets/buckets.controller.ts`
2. `apps/api/src/app/buckets/buckets.service.ts`
3. `apps/api/src/app/buckets/buckets.module.ts`
4. `apps/api/src/app/sectors/sectors.controller.ts`
5. `apps/api/src/app/sectors/sectors.service.ts`
6. `apps/api/src/app/sectors/sectors.module.ts`

### Modified Files
1. `apps/api/src/app/lead/lead.module.ts` - Add LeadController
2. `apps/api/src/app/app.module.ts` - Import new modules

## Testing Checklist

After implementation, verify:
- [ ] `/api/buckets` returns bucket list
- [ ] `/api/sectors/stats` returns sector statistics
- [ ] `/api/leads` returns paginated lead list
- [ ] `/api/lead/upload` accepts CSV and returns stats
- [ ] Sectors page shows data (not zeros)
- [ ] Quick Send page shows Data Lake batches
- [ ] Dashboard shows lead counts

## Deployment

1. Commit changes to GitHub
2. Push triggers DigitalOcean App Platform deploy
3. Verify API endpoints respond correctly

## Additional Issues Found (Lower Priority)

1. **SkipTrace Service needs rewrite** - Schema mismatch
   - Location: `apps/api/src/app/enrichment/enrichment.module.ts:13`

2. **Auto-Trigger SMS not implemented** - Just logs
   - Location: `apps/api/src/app/lead/consumers/auto-trigger.consumer.ts:405`

3. **Content Nurture SMS not implemented** - Just logs
   - Location: `apps/api/src/app/lead/consumers/content-nurture.consumer.ts:388`

4. **Integration providers not implemented** - HubSpot, etc.
   - Location: `apps/api/src/app/integration/services/integration.service.ts:47`

## Success Criteria

Platform is working when:
1. Dashboard shows lead counts > 0
2. Sectors page shows data buckets
3. Quick Send page shows Data Lake batches
4. CSV upload works and imports leads
5. Campaign creation and execution works
6. SMS sending via SignalHouse works

---

**Generated by:** NEXTIER Platform Debug Audit  
**Date:** 2026-01-26

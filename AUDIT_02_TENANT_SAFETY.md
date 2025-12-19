# AUDIT Phase 2: Tenant Isolation & Data Safety
**Platform**: OutreachGlobal / Nextier / Homeowner Advisor
**Audit Date**: 2025-12-18
**Auditor**: Claude (Principal Platform Engineer)
**Status**: ✅ Complete

---

## Executive Summary

Tenant isolation is implemented via **application-level filtering** using `teamId` foreign keys. However, there are **CRITICAL security vulnerabilities** that allow cross-tenant data access:

**🔴 CRITICAL FINDINGS**:
1. **apiAuth() DOES NOT return teamId** - Frontend routes expect it but helper doesn't provide it!
2. **Shared database for Nextier + Homeowner Advisor** - No physical isolation
3. **No Row-Level Security (RLS)** - Application-level filtering only
4. **No tenant namespacing in S3/Spaces** - All files share same bucket
5. **4 tables lack teamId** - Users, properties (partially), and system tables
6. **Recent schema sync incident** - DB/schema mismatches caused production outage

**Tenant Isolation Score**: 4/10 (Partially Implemented, Critical Bugs)

---

## 1. Multi-Tenant Architecture Analysis

### Design Pattern: **Shared Database, Team-Scoped Tables**

**Approach**: All tenants share one PostgreSQL database with `teamId` foreign key on all major tables.

**ULID Prefix System**:
- Teams: `team_01HXXX...`
- Team Members: `tm_01HXXX...`
- Leads: `lead_01HXXX...`
- Campaigns: `camp_01HXXX...`
- Inbox Items: `inb_01HXXX...`

**Isolation Level**: Application-level (NOT database-level)

### Current Deployment Configuration

From [AUDIT_01B_DO_INFRASTRUCTURE.md](AUDIT_01B_DO_INFRASTRUCTURE.md):

```
┌─────────────────────────────┐
│  Nextier App (NYC)          │
│  - API Service (512MB)      │
│  - Frontend (512MB)         │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  PostgreSQL 17              │
│  SHARED DATABASE            │
│  defaultdb                  │
│  1 vCPU / 1GB RAM           │
└──────────┬──────────────────┘
           │
           ▲
┌──────────┴──────────────────┐
│  Homeowner Advisor (NYC)    │
│  - Frontend ONLY            │
│  - ❌ NO API SERVICE!       │
└─────────────────────────────┘
```

**⚠️ CRITICAL**: Both apps connect to **SAME database, SAME schema, SAME tables**.

---

## 2. Schema-Level Isolation Analysis

### Tables WITH teamId Foreign Key (23 tables)

✅ **Properly Isolated**:

| Table | teamId Enforcement | Cascade Delete | Indexed |
|-------|-------------------|----------------|---------|
| leads | `.notNull()` | ✅ YES | ✅ YES |
| campaigns | `.notNull()` | ✅ YES | ✅ YES |
| campaignSequences | Via campaigns | ✅ YES (indirect) | ✅ YES |
| campaignLeads | Via campaigns | ✅ YES (indirect) | ✅ YES |
| campaignExecutions | Via campaigns | ✅ YES (indirect) | ✅ YES |
| campaignEvents | Via campaigns | ✅ YES (indirect) | ✅ YES |
| inboxItems | `.notNull()` | ✅ YES | ✅ YES |
| responseBuckets | `.notNull()` | ✅ YES | ❌ NO |
| bucketMovements | `.notNull()` | ✅ YES | ✅ YES |
| suppressionList | `.notNull()` | ✅ YES | ✅ YES |
| messages | `.notNull()` | ✅ YES | ✅ YES |
| messageTemplates | `.notNull()` | ✅ YES | ❌ NO |
| messageLabels | `.notNull()` | ✅ YES | ❌ NO |
| aiSdrAvatars | `.notNull()` | ✅ YES | ✅ YES |
| powerDialers | `.notNull()` | ✅ YES | ✅ YES |
| integrations | `.notNull()` | ✅ YES | ✅ YES |
| initialMessages | `.notNull()` | ✅ YES | ✅ YES |
| prompts | `.notNull()` | ✅ YES | ✅ YES |
| workflows | `.notNull()` | ✅ YES | ✅ YES |
| teamSettings | `.notNull()` | ✅ YES | ✅ YES |
| teamMembers | `.notNull()` | ✅ YES | ✅ YES |
| teamInvitations | `.notNull()` | ✅ YES | ✅ YES |
| importLeadPresets | `.notNull()` | ✅ YES | ❌ NO |

**Source**: [apps/api/src/database/schema/*.schema.ts](apps/api/src/database/schema/)

### Tables WITHOUT teamId (4 tables)

❌ **Potentially Shared Across Tenants**:

| Table | Scope | Risk Level |
|-------|-------|------------|
| users | Global (cross-tenant) | 🟡 Medium (by design) |
| teams | Root table | ✅ Safe (is the tenant) |
| properties | Shared property data | 🔴 High (no isolation!) |
| phone | Global phone registry | 🟡 Medium |

**⚠️ CRITICAL RISK**: `properties` table has NO `teamId`!

```typescript
// apps/api/src/database/schema/properties.schema.ts
export const properties = pgTable("properties", {
  id: primaryUlid("prop"),
  // ❌ NO teamId FIELD!
  address: varchar().notNull(),
  city: varchar(),
  state: varchar(),
  zipCode: varchar(),
  // ... property data
});
```

**Impact**: All tenants can see ALL properties in the system. If Nextier and Homeowner Advisor both search "123 Main St", they see the same property record.

### Cascade Deletion Behavior

**Configuration**: All `teamId` references use `{ onDelete: "cascade" }`

```typescript
export const teamsRef = (config?: ReferenceConfig["actions"]) =>
  ulidColumn().references(() => teams.id, config);

// Used as:
teamId: teamsRef({ onDelete: "cascade" }).notNull()
```

**Effect**: When a team is deleted, ALL associated data is automatically deleted:
- ✅ Leads
- ✅ Campaigns
- ✅ Messages
- ✅ Inbox items
- ✅ Workflows
- ✅ Everything with teamId reference

**Risk**: Accidental team deletion = permanent data loss with NO recovery.

---

## 3. Application-Level Filtering Analysis

### Backend (NestJS API) - 103 Filtered Queries

**Pattern**: Drizzle ORM queries with `eq(table.teamId, teamId)`

**Example from** [apps/api/src/app/lead/services/lead.service.ts](apps/api/src/app/lead/services/lead.service.ts):

```typescript
async findAll(teamId: string) {
  return await this.db
    .select()
    .from(leads)
    .where(eq(leads.teamId, teamId))  // ✅ Filtering by teamId
    .orderBy(desc(leads.createdAt));
}
```

**Enforcement**: 103 occurrences of `eq(.*teamId` across 35 service files.

**✅ GOOD**: API services consistently filter by teamId.

### Frontend (Next.js API Routes) - BROKEN!

**Example from** [apps/front/src/app/api/leads/route.ts:20-42](apps/front/src/app/api/leads/route.ts#L20-L42):

```typescript
export async function GET(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();  // ❌ BUG: apiAuth() doesn't return teamId!

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Build where conditions
    const conditions: ReturnType<typeof eq>[] = [];

    // Only show leads for the user's team
    if (teamId) {  // ❌ teamId is ALWAYS undefined!
      conditions.push(eq(leads.teamId, teamId));
    }

    // ... query execution
  }
}
```

**The apiAuth() Helper** [apps/front/src/lib/api-auth.ts:22-47](apps/front/src/lib/api-auth.ts#L22-L47):

```typescript
export async function apiAuth(): Promise<{ userId: string | null }> {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get("nextier_session")?.value ||
      cookieStore.get("session")?.value;

    if (!token) {
      return { userId: null };  // ❌ NO teamId returned!
    }

    const decoded = jwtDecode<JWTPayload>(token);

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return { userId: null };  // ❌ NO teamId returned!
    }

    return { userId: decoded.sub };  // ❌ ONLY userId, NO teamId!
  } catch (error) {
    return { userId: null };
  }
}
```

**🔴 CRITICAL BUG**:
1. Frontend routes destructure `{ userId, teamId } = await apiAuth()`
2. apiAuth() ONLY returns `{ userId: string | null }`
3. `teamId` is **ALWAYS undefined**
4. Query condition `if (teamId)` **NEVER executes**
5. **NO tenant filtering occurs!**

**Affected Routes** (at minimum):
- [apps/front/src/app/api/leads/route.ts](apps/front/src/app/api/leads/route.ts)
- [apps/front/src/app/api/calendar/leads/route.ts](apps/front/src/app/api/calendar/leads/route.ts)
- Likely **ALL 170 frontend API routes** with same pattern!

**Impact**: **CROSS-TENANT DATA LEAK** - Users can see leads/campaigns/inbox from OTHER teams!

---

## 4. Authentication & Authorization Flow

### Current Architecture

```
┌─────────────────────┐
│   User Login        │
│   (Email/Password)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   NestJS API        │
│   /auth/login       │
│   Generates JWT     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│   JWT Token (Cookie)        │
│   {                         │
│     sub: userId,            │
│     username: email,        │
│     iat: timestamp,         │
│     exp: expiry             │
│   }                         │
│   ❌ NO teamId in token!    │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│   Frontend API Route        │
│   const { userId, teamId }  │
│     = await apiAuth()       │
│   ❌ teamId = undefined!    │
└─────────────────────────────┘
```

### JWT Payload Structure

**Current**:
```json
{
  "sub": "user_01HXXX...",
  "username": "user@example.com",
  "jti": "token_id",
  "iat": 1734556800,
  "exp": 1734643200,
  "iss": "nextier"
}
```

**Missing**: `teamId` claim!

### Team Selection Flow (Unknown)

**Questions**:
1. How does a user select their active team?
2. Is `teamId` stored in a separate cookie?
3. Is team selection stored in database session?
4. How do multi-team users switch between teams?

**Finding**: No evidence of team selection mechanism in frontend API routes.

---

## 5. Row-Level Security (RLS) Analysis

### PostgreSQL RLS Status

**Finding**: ❌ **NOT IMPLEMENTED**

**Evidence**:
- 26 migration snapshot files checked
- 0 RLS policies found
- No `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements
- No `CREATE POLICY` statements

**Source**: [apps/api/src/database/migrations/meta/*.json](apps/api/src/database/migrations/meta/)

### Current Security Model

**Type**: Application-Level Filtering Only

**Protection**:
- ✅ API services filter by `teamId` (103 occurrences)
- ❌ Frontend routes do NOT filter (teamId undefined)
- ❌ Database has NO protection if query bypasses application
- ❌ Direct SQL queries can access any tenant's data

**Risk**: **HIGH** - Relies entirely on application code correctness.

### RLS Recommendation

Implement PostgreSQL Row-Level Security:

```sql
-- Enable RLS on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see teams they're members of
CREATE POLICY team_member_access ON teams
FOR ALL
TO authenticated
USING (
  id IN (
    SELECT team_id FROM team_members
    WHERE user_id = current_setting('app.current_user_id')::text
  )
);

-- Enable RLS on leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see leads in their teams
CREATE POLICY team_leads_access ON leads
FOR ALL
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = current_setting('app.current_user_id')::text
  )
);

-- Repeat for all 23 tenant-scoped tables
```

**Benefit**: Database-enforced isolation regardless of application bugs.

---

## 6. Object Storage Isolation (DigitalOcean Spaces)

### Current Configuration

**File**: [apps/front/src/lib/spaces.ts](apps/front/src/lib/spaces.ts)

```typescript
const SPACES_BUCKET = "nextier";  // ❌ Single shared bucket!

export async function uploadCSV(
  filename: string,
  csvContent: string,
  folder: string = "exports",  // ❌ No tenant prefix!
): Promise<{ url: string; cdnUrl: string } | null> {
  const key = `${folder}/${Date.now()}-${filename}`;  // ❌ No teamId!
  return uploadFile(key, csvContent, "text/csv", true);
}
```

**Key Structure**: `folder/timestamp-filename`
**Example**: `exports/1734556800-leads.csv`

**⚠️ PROBLEM**: NO tenant isolation in file paths!

### Risks

1. **File Name Collisions**: Two tenants upload "leads.csv" at same millisecond → overwrite
2. **No Access Control**: If tenant A guesses tenant B's filename, they can access it
3. **Public Files**: `ACL: "public-read"` on CSV exports
4. **CDN Caching**: All tenants share same CDN URL space

### Recommended Structure

```
nextier/
├── team_01HXXX.../         # Tenant A
│   ├── exports/
│   │   └── 1734556800-leads.csv
│   ├── uploads/
│   └── imports/
├── team_01HYYY.../         # Tenant B
│   ├── exports/
│   │   └── 1734556800-leads.csv  # Same filename, different tenant!
│   ├── uploads/
│   └── imports/
```

**Implementation**:
```typescript
export async function uploadCSV(
  teamId: string,  // ✅ Add teamId parameter
  filename: string,
  csvContent: string,
  folder: string = "exports",
): Promise<{ url: string; cdnUrl: string } | null> {
  const key = `${teamId}/${folder}/${Date.now()}-${filename}`;  // ✅ Tenant-scoped
  return uploadFile(key, csvContent, "text/csv", false);  // ✅ Private by default
}
```

---

## 7. Shared Database Risk Analysis

### Current State

**Database**: `app-98cd0402-e1d4-48ef-9adf-173580806a89`
**Schema**: `defaultdb`
**Shared By**:
1. Nextier app (API + Frontend)
2. Homeowner Advisor app (Frontend only)

### Risk Scenarios

#### Scenario 1: Cross-Tenant Query Bug

**Bug**: Frontend apiAuth() doesn't return teamId (CONFIRMED)
**Impact**: User from Nextier sees leads from Homeowner Advisor
**Likelihood**: 🔴 **HIGH** (bug exists in production)
**Severity**: 🔴 **CRITICAL** (GDPR/CCPA violation)

#### Scenario 2: SQL Injection

**Bug**: Unsanitized user input in query
**Example**:
```typescript
// BAD: Vulnerable to SQL injection
const query = `SELECT * FROM leads WHERE team_id = '${teamId}'`;
```

**Impact**: Attacker bypasses teamId filter, accesses all data
**Likelihood**: 🟡 Medium (using ORM, but still possible)
**Severity**: 🔴 **CRITICAL**

#### Scenario 3: Accidental Team Deletion

**Trigger**: Admin deletes team accidentally
**Effect**: Cascade delete removes ALL data (leads, campaigns, messages, etc.)
**Recovery**: ❌ **NONE** (no backup/restore flow documented)
**Likelihood**: 🟡 Medium
**Severity**: 🔴 **CRITICAL**

#### Scenario 4: Properties Table Leak

**Bug**: `properties` table has NO `teamId`
**Impact**: All tenants see same properties
**Example**:
- Nextier searches "123 Main St" → Finds property_01HXXX
- Homeowner Advisor searches "123 Main St" → Finds SAME property_01HXXX
- Both tenants can update/delete it!
**Likelihood**: 🔴 **HIGH** (confirmed schema issue)
**Severity**: 🔴 **CRITICAL**

### Recommended Solution

**Option A: Separate Databases Per Tenant** (Safest)

```
nextier-db (PostgreSQL)
  ├── defaultdb
  │   ├── teams (only Nextier teams)
  │   ├── leads (only Nextier leads)
  │   └── ...

homeowner-advisor-db (PostgreSQL)
  ├── defaultdb
  │   ├── teams (only HA teams)
  │   ├── leads (only HA leads)
  │   └── ...
```

**Pros**:
- Physical isolation (impossible to leak data)
- Independent scaling
- Separate backups
- Compliance-friendly

**Cons**:
- Higher cost ($60/month per database)
- More complex deployment
- Schema migrations must run twice

**Option B: Implement RLS + Fix Bugs** (Cheaper)

**Requirements**:
1. Fix apiAuth() to return teamId
2. Add RLS policies to all tables
3. Add teamId to properties table
4. Add tenant namespacing to Spaces
5. Comprehensive testing

**Pros**:
- Lower cost (keep shared DB)
- Simpler deployment

**Cons**:
- Still relies partially on application code
- Higher risk if bugs exist

---

## 8. Recent Schema Sync Incident

### Incident Summary

**Date**: December 17, 2024
**Impact**: Production outage, 401/404 errors, failed health checks
**Root Cause**: DB/schema mismatch

**Details** from [docs/SCHEMA_SYNC_INCIDENT.md](docs/SCHEMA_SYNC_INCIDENT.md):

```
Drizzle schema defined columns that didn't exist in database:
- teams.description
- teams.branding

Chain of failures:
1. Drizzle tries to SELECT non-existent columns
2. API startup fails
3. Health checks fail
4. Deployment rolls back
5. Frontend gets 404s
```

### Prevention Rules (from incident doc)

**NEVER**:
1. Add columns to schema without migrations first
2. Add GraphQL fields for non-existent columns
3. Request fields in frontend without verifying they exist

**ALWAYS**:
1. Database-first approach:
   - Add column to database (migration)
   - Add to Drizzle schema
   - Add to GraphQL model
   - Add to frontend queries
   - Run codegen
2. Test locally before deploying
3. Keep schema in sync

### Relevance to Tenant Safety

This incident proves:
1. Schema mismatches cause production outages
2. No automated schema validation exists
3. Deployments can succeed with incorrect schemas
4. **Risk**: Adding `teamId` to `properties` table requires careful migration

---

## 9. Multi-Team User Scenarios

### Question: Can One User Belong to Multiple Teams?

**Schema Evidence**:

```typescript
// apps/api/src/database/schema/teams.schema.ts
export const teamMembers = pgTable("team_members", {
  id: primaryUlid(TEAM_MEMBER_PK),  // tm_01HXXX...
  teamId: teamsRef({ onDelete: "cascade" }).notNull(),
  userId: ulidColumn().references(() => users.id, { onDelete: "cascade" }),
  role: varchar().notNull().default("MEMBER"),
  status: varchar().notNull().default("PENDING"),
  // ...
});
```

**Answer**: ✅ **YES** - A user can have multiple `team_members` records.

**Flow**:
1. User logs in → JWT with `userId`
2. User selects team → ???
3. Application uses `teamId` for queries → ❌ BROKEN (teamId undefined)

**Missing**:
- Team selection UI/API
- Active team storage (cookie? session?)
- Team switching mechanism

### Potential Security Issue

**Problem**: If user belongs to Team A and Team B, and frontend doesn't filter by teamId (confirmed bug), user might see data from BOTH teams in mixed queries.

**Example**:
```typescript
// Current (BROKEN):
const { userId, teamId } = await apiAuth();  // teamId = undefined
const leads = await db.select().from(leads).where(
  teamId ? eq(leads.teamId, teamId) : undefined  // ❌ Condition never executes!
);
// Returns ALL leads from ALL teams the user belongs to!
```

---

## 10. Critical Findings Summary

### 🔴 CRITICAL (Fix Immediately)

| # | Finding | Risk Level | Impact |
|---|---------|------------|--------|
| 1 | apiAuth() doesn't return teamId | CRITICAL | Cross-tenant data leak |
| 2 | Frontend routes don't filter by team | CRITICAL | GDPR violation |
| 3 | properties table has no teamId | CRITICAL | Shared data across tenants |
| 4 | Shared DB for two apps | HIGH | Single point of failure |
| 5 | No RLS policies | HIGH | No database-level protection |

### 🟡 HIGH (Fix Soon)

| # | Finding | Risk Level | Impact |
|---|---------|------------|--------|
| 6 | Spaces bucket has no tenant namespacing | HIGH | File access leaks |
| 7 | CSV exports are public | HIGH | Data exposure |
| 8 | No backup/restore for cascade deletes | HIGH | Permanent data loss |
| 9 | Missing team selection flow | MEDIUM | User confusion |
| 10 | JWT doesn't include teamId claim | MEDIUM | Auth architecture issue |

### 🟢 MEDIUM (Plan for Future)

| # | Finding | Risk Level | Impact |
|---|---------|------------|--------|
| 11 | No schema validation in CI/CD | MEDIUM | Deployment failures |
| 12 | 4 tables lack teamId index | LOW | Query performance |
| 13 | phone/users tables are global | LOW | By design (acceptable) |

---

## 11. Recommendations

### Immediate Actions (Week 1)

1. **Fix apiAuth() to return teamId**:
   ```typescript
   export async function apiAuth(): Promise<{
     userId: string | null;
     teamId: string | null;  // ✅ ADD THIS
   }> {
     // Decode JWT
     const decoded = jwtDecode<JWTPayload>(token);

     // Fetch user's active team from database or cookie
     const teamId = await getActiveTeamId(decoded.sub);

     return { userId: decoded.sub, teamId };
   }
   ```

2. **Add teamId to JWT payload**:
   ```typescript
   // API: apps/api/src/app/auth/auth.service.ts
   const token = jwt.sign({
     sub: user.id,
     username: user.email,
     teamId: user.activeTeamId,  // ✅ ADD THIS
     iat: Date.now(),
     exp: Date.now() + 86400000,
   });
   ```

3. **Add teamId to properties table**:
   ```sql
   -- Migration: 0026_add_team_to_properties.sql
   ALTER TABLE properties ADD COLUMN team_id TEXT;

   -- Migrate existing data (assign to first team or mark as orphaned)
   UPDATE properties SET team_id = (
     SELECT id FROM teams LIMIT 1
   ) WHERE team_id IS NULL;

   -- Make it required
   ALTER TABLE properties ALTER COLUMN team_id SET NOT NULL;

   -- Add foreign key
   ALTER TABLE properties ADD CONSTRAINT properties_team_id_fkey
     FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

   -- Add index
   CREATE INDEX properties_team_id_idx ON properties(team_id);
   ```

4. **Test all 170 frontend API routes** for teamId filtering.

### Short-Term (Month 1)

5. **Implement Row-Level Security** on all 23 tenant-scoped tables.

6. **Add tenant namespacing to Spaces**:
   - Update all `uploadFile()` calls to include `teamId` prefix
   - Migrate existing files to tenant folders

7. **Separate databases** for Nextier and Homeowner Advisor.

8. **Add schema validation** to CI/CD pipeline.

### Long-Term (Quarter 1)

9. **Implement team selection UI** and active team management.

10. **Add comprehensive tenant isolation tests**:
    - Unit tests: Assert all queries filter by teamId
    - Integration tests: Verify RLS policies work
    - E2E tests: Confirm users cannot see other tenants' data

11. **Security audit** by external firm.

12. **Implement audit logging** for all cross-tenant access attempts.

---

## 12. Tenant Isolation Scorecard

| Category | Score | Evidence |
|----------|-------|----------|
| Schema Design | 7/10 | 23/27 tables have teamId, good cascade deletes |
| API Filtering | 8/10 | 103 filtered queries, consistent pattern |
| Frontend Filtering | 1/10 | apiAuth() bug makes ALL routes vulnerable |
| Database Security (RLS) | 0/10 | Not implemented |
| Storage Isolation | 2/10 | Shared bucket, no namespacing |
| Authentication | 5/10 | JWT works but missing teamId claim |
| Documentation | 3/10 | Schema incident doc exists, no tenant docs |

**Overall Score**: **4/10** (Partially Implemented, Critical Bugs)

---

## Conclusion

**Verdict**: ❌ **NOT SAFE for multi-tenant production use**

The application has a **sound theoretical design** (teamId foreign keys, cascade deletes) but **critical implementation bugs** make it vulnerable to cross-tenant data leaks:

1. ✅ API backend filters correctly (103 queries)
2. ❌ Frontend routes DO NOT filter (teamId undefined)
3. ❌ No database-level protection (RLS)
4. ❌ Shared database for two separate apps
5. ❌ Properties table has no tenant isolation

**Immediate Risk**: User from Nextier can see Homeowner Advisor's leads/campaigns/inbox due to apiAuth() bug.

**Required Before Production**:
1. Fix apiAuth() to return teamId
2. Add teamId to properties table
3. Implement RLS
4. Separate databases OR comprehensive testing
5. Add tenant namespacing to Spaces

**Estimated Effort**: 40-60 hours for all fixes

---

**Audit Completed**: 2025-12-18
**Next Phase**: Data Flow Trace (End-to-End) - Phase 3

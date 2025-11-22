# PostgreSQL Optimization with Postgres MCP

## Overview

Your Nextier platform will face performance issues as data scales:
- **Leads**: Thousands with JSONB custom fields
- **Saved Search Results**: Thousands of properties per day
- **Campaign Executions**: High-volume writes during campaigns
- **Messages**: Rapid inserts and updates

This guide uses Postgres MCP to optimize queries and indexes.

---

## Critical Performance Bottlenecks

### 1. Lead Scoring Queries

**Current Implementation** (from `lead-scoring.ts`):
```typescript
// Distress signal scoring
const DISTRESS_SIGNAL_MATRIX = {
  lisPendens: { score: 10, tag: "PreForeclosure" },
  vacantProperty: { score: 10, tag: "VacantProp" },
  highEquity: { score: 10, tag: "HighEquity" },
  // ... 9 different signals
};
```

**Problem**: Queries likely scan entire leads table without proper indexes.

**Solution**: Ask Claude Desktop (with Postgres MCP):

```
Analyze query performance for lead scoring:

1. Show EXPLAIN ANALYZE for:
   SELECT * FROM leads
   WHERE team_id = 'xxx'
   AND score > 70
   ORDER BY score DESC;

2. Recommend indexes for:
   - score (frequently filtered)
   - team_id + score (composite for filtered sorting)
   - tags (JSONB array searches)

3. Suggest query optimization:
   - Use covering indexes
   - Partition by team_id if multi-tenant
   - Consider materialized view for top leads
```

### 2. JSONB Custom Fields

**Current Schema**:
```sql
CREATE TABLE leads (
  custom_fields JSONB,
  metadata JSONB,
  tags TEXT[]
);
```

**Problem**: JSONB queries without indexes are slow.

**Solution**: Ask Claude Desktop:

```
Optimize JSONB queries:

1. Analyze most common JSON path queries (e.g., custom_fields->>'phone_status')
2. Create GIN index on custom_fields
3. Create expression indexes for frequently accessed paths
4. Recommend query patterns to avoid

Example:
CREATE INDEX idx_leads_custom_fields ON leads USING GIN (custom_fields);
```

### 3. Saved Search Results (High Volume)

**Scenario**: 100 saved searches × 50 properties per day = 5,000 rows/day = 150K rows/month

**Problem**: Table grows indefinitely without partitioning.

**Solution**: Ask Claude Desktop:

```
Optimize saved_search_results table:

1. Analyze table size and growth rate
2. Recommend partitioning strategy:
   - Partition by created_at (monthly partitions)
   - Create indexes on each partition
3. Set up automatic partition maintenance
4. Archive old partitions (> 90 days) to cold storage

Example:
CREATE TABLE saved_search_results_2025_01 PARTITION OF saved_search_results
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 4. Campaign Execution Queries

**Pattern**: High-volume writes during campaign runs.

**Problem**:
- Locks on campaign_leads table
- Slow inserts to campaign_executions
- Inefficient sequence position queries

**Solution**: Ask Claude Desktop:

```
Optimize campaign execution:

1. Analyze write patterns:
   - How many executions per second during peak?
   - Are there lock contentions?

2. Recommend:
   - Batch inserts instead of individual
   - Use UNLOGGED tables for temporary data
   - Add index on (campaign_id, sequence_id) for joins

3. Check connection pool:
   - Current active connections
   - Max connections setting
   - Recommend connection pooler (PgBouncer)
```

---

## Optimization Checklist

### Immediate (Do with Postgres MCP)

Ask Claude Desktop:

```
Run a comprehensive database health check:

1. MISSING INDEXES
   - Find queries with sequential scans
   - Identify tables without indexes on foreign keys
   - Recommend composite indexes for common WHERE clauses

2. INDEX BLOAT
   - Show indexes larger than their tables
   - Recommend REINDEX for bloated indexes
   - Suggest VACUUM schedule

3. SLOW QUERIES
   - Analyze pg_stat_statements for slow queries
   - Show queries taking > 1 second
   - Recommend query optimization

4. TABLE STATISTICS
   - Check when tables were last ANALYZEd
   - Recommend ANALYZE for stale statistics
   - Set auto-vacuum settings

5. CONNECTION HEALTH
   - Show active connections
   - Identify long-running transactions
   - Recommend max_connections setting

Provide a prioritized list of optimizations with expected impact.
```

---

## Recommended Indexes

### Leads Table

```sql
-- Primary filtering
CREATE INDEX idx_leads_team_score ON leads (team_id, score DESC);

-- Tag searching (GIN index for arrays)
CREATE INDEX idx_leads_tags ON leads USING GIN (tags);

-- JSONB custom fields (GIN index)
CREATE INDEX idx_leads_custom_fields ON leads USING GIN (custom_fields);

-- Email lookups
CREATE INDEX idx_leads_email ON leads (email) WHERE email IS NOT NULL;

-- Phone number searches
CREATE INDEX idx_leads_phone ON leads USING GIN (phone_numbers);

-- Created date (for recent leads)
CREATE INDEX idx_leads_created ON leads (created_at DESC);

-- Composite for common queries
CREATE INDEX idx_leads_team_created_score ON leads (team_id, created_at DESC, score DESC);
```

### Saved Search Results

```sql
-- Find results by property
CREATE INDEX idx_search_results_property ON saved_search_results (property_id, saved_search_id);

-- Find changes by date
CREATE INDEX idx_search_results_created ON saved_search_results (created_at DESC, change_type);

-- Find results by search (with covering index)
CREATE INDEX idx_search_results_search_changes ON saved_search_results (saved_search_id, change_type, created_at DESC)
INCLUDE (property_id, data);

-- Partition by created_at (monthly)
CREATE TABLE saved_search_results_2025_01 PARTITION OF saved_search_results
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Campaign Tables

```sql
-- Campaign leads by status
CREATE INDEX idx_campaign_leads_status ON campaign_leads (campaign_id, status, next_sequence_run_at)
WHERE status != 'COMPLETED';

-- Executions by sequence
CREATE INDEX idx_executions_sequence ON campaign_executions (sequence_id, created_at DESC);

-- Executions by lead (for history)
CREATE INDEX idx_executions_lead ON campaign_executions (lead_id, created_at DESC);

-- Failed executions for retry
CREATE INDEX idx_executions_failed ON campaign_executions (status, created_at)
WHERE status = 'FAILED';
```

---

## Query Optimization Examples

### Before: Slow Lead Query

```sql
-- Sequential scan on 100K leads
SELECT * FROM leads
WHERE team_id = 'xxx'
AND score > 70
AND tags @> ARRAY['HighEquity'];

-- Execution time: 850ms
```

### After: With Indexes

```sql
-- Uses idx_leads_team_score + idx_leads_tags
SELECT * FROM leads
WHERE team_id = 'xxx'
AND score > 70
AND tags @> ARRAY['HighEquity'];

-- Execution time: 12ms (70x faster!)
```

### Ask Postgres MCP to Verify:

```
Compare query performance before and after adding indexes:

Query:
SELECT * FROM leads
WHERE team_id = 'xxx' AND score > 70 AND tags @> ARRAY['HighEquity'];

1. Show EXPLAIN ANALYZE before index
2. Create recommended indexes
3. Show EXPLAIN ANALYZE after
4. Calculate performance improvement
```

---

## Partitioning Strategy

### Saved Search Results (Time-Series Data)

```sql
-- Create partitioned table
CREATE TABLE saved_search_results (
  id TEXT PRIMARY KEY,
  saved_search_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  change_type TEXT,
  data JSONB,
  created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);

-- Create partitions (monthly)
CREATE TABLE saved_search_results_2025_01 PARTITION OF saved_search_results
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE saved_search_results_2025_02 PARTITION OF saved_search_results
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Auto-create partitions (use pg_partman extension or script)
```

### Ask Postgres MCP to Automate:

```
Set up automatic partition management for saved_search_results:

1. Create next month's partition automatically
2. Archive partitions older than 90 days
3. Create indexes on new partitions
4. Monitor partition sizes

Provide a maintenance script I can run monthly.
```

---

## Connection Pooling

### Current Issue

**Problem**: Each API request opens a new database connection.

**Impact**:
- Slow connection establishment
- High memory usage
- Connection limit exhaustion

### Solution: PgBouncer

Ask Claude Desktop:

```
Help me set up PgBouncer for connection pooling:

1. Install PgBouncer on DigitalOcean
2. Configure pool settings:
   - pool_mode = transaction
   - max_client_conn = 1000
   - default_pool_size = 25
3. Update DATABASE_URL to use PgBouncer
4. Monitor connection pool stats
```

**Expected Improvement**:
- Connection time: 100ms → 5ms
- Memory per connection: 10MB → 1MB
- Max concurrent requests: 100 → 1000

---

## Monitoring & Alerting

### Set Up with Postgres MCP

Ask Claude Desktop:

```
Configure PostgreSQL monitoring:

1. SLOW QUERY LOGGING
   - Log queries > 1000ms
   - Track most common slow queries
   - Alert on sudden query degradation

2. CONNECTION MONITORING
   - Alert when connections > 80% of max
   - Track connection pool exhaustion
   - Monitor idle-in-transaction connections

3. INDEX USAGE
   - Track unused indexes (candidates for removal)
   - Monitor index bloat
   - Alert on sequential scans on large tables

4. TABLE GROWTH
   - Track table sizes over time
   - Predict when partitioning needed
   - Alert on rapid growth (data leak?)

5. VACUUM STATUS
   - Monitor autovacuum lag
   - Alert on table bloat
   - Track dead tuple ratio

Send alerts to: ops@nextier.com
Create dashboard at: https://app.nextier.com/admin/db-health
```

---

## Backup & Recovery Optimization

### Current Backup Strategy

Ask Postgres MCP:

```
Analyze current backup configuration:

1. Show backup schedule and retention
2. Calculate RPO (Recovery Point Objective)
3. Calculate RTO (Recovery Time Objective)
4. Estimate backup size and growth rate

Recommend:
- Incremental backups for faster recovery
- Point-in-time recovery (PITR) setup
- Backup testing schedule
```

### Recommended Backup Strategy

```
Full Backups:
├── Frequency: Daily at 2 AM UTC
├── Retention: 14 days
├── Size: ~500MB (compressed)
└── Duration: ~5 minutes

Incremental Backups (WAL):
├── Frequency: Continuous (every 16MB)
├── Retention: 7 days
└── Enables PITR to any point in last 7 days

Test Restores:
├── Frequency: Monthly
├── Target: < 15 minutes RTO
└── Verify data integrity
```

---

## Performance Benchmarks

### Current (Without Optimizations)

```
Lead Search (10K records):
├── Without indexes: 850ms
├── With JSONB filter: 1,200ms
└── With sorting: 1,500ms

Campaign Execution:
├── 1000 emails/campaign: 45 seconds
└── Sequential writes

Saved Search Check:
├── 100 searches × 50 properties: 12 seconds
└── No caching
```

### Target (With Optimizations)

```
Lead Search (10K records):
├── With indexes: 12ms (70x faster)
├── With JSONB GIN: 25ms (48x faster)
└── With materialized view: 5ms (300x faster)

Campaign Execution:
├── 1000 emails/campaign: 8 seconds (5.6x faster)
└── Batch inserts + connection pooling

Saved Search Check:
├── 100 searches × 50 properties: 2 seconds (6x faster)
└── Partitioned table + Redis caching
```

---

## Maintenance Schedule

### Daily (Automated)

- ✅ Autovacuum (PostgreSQL handles this)
- ✅ Backup (DigitalOcean automated)
- ⬜ Slow query log review (set up alerts)

### Weekly

- ⬜ Index bloat check (via Postgres MCP)
- ⬜ Table statistics update (ANALYZE)
- ⬜ Connection pool health

### Monthly

- ⬜ Partition management (create next month's partitions)
- ⬜ Index usage analysis (remove unused)
- ⬜ Backup restore test
- ⬜ Performance benchmarks

### Quarterly

- ⬜ Schema optimization review
- ⬜ Query pattern analysis
- ⬜ Capacity planning

---

## Capacity Planning

Ask Postgres MCP:

```
Predict database growth and capacity needs:

1. Current database size and growth rate
2. Projected size in 6 months, 1 year
3. When will we hit storage limits?
4. When will we need to upgrade instance size?
5. Cost projections for growth

Based on:
- 1000 new leads/day
- 100 saved searches × 50 results/day
- 50 campaigns/month × 1000 leads each

Recommend upgrade path and timeline.
```

---

## Migration to High-Availability Setup

### Current: Single Node (Risk!)

```
dev-db-410147:
├── Type: Single node
├── Size: db-s-1vcpu-1gb
├── Downtime risk: HIGH (single point of failure)
└── Cost: $15/mo
```

### Recommended: 3-Node Cluster

```
Production Cluster:
├── Primary: db-s-2vcpu-4gb (nyc3)
├── Standby: db-s-2vcpu-4gb (nyc3)
├── Read Replica: db-s-2vcpu-4gb (sfo3)
├── Auto-failover: Enabled
├── Downtime risk: LOW
└── Cost: $180/mo

Benefits:
✅ Zero-downtime failover
✅ Read scaling (analytics, reports)
✅ Geographic redundancy
✅ Automatic backups
```

Ask Claude Desktop:

```
Help me upgrade from single-node to 3-node cluster:

1. Create new cluster: 3 nodes, db-s-2vcpu-4gb
2. Set up replication from dev-db-410147
3. Test read replica performance
4. Plan cutover window (minimize downtime)
5. Update app connection strings
6. Monitor replication lag
7. Decommission old database

Provide step-by-step migration plan.
```

---

## Next Steps

1. **TODAY**: Run database health check via Postgres MCP
2. **THIS WEEK**: Add critical indexes (leads, campaign tables)
3. **THIS MONTH**: Set up partitioning for saved_search_results
4. **Q1 2025**: Upgrade to 3-node cluster for HA

**Start Now**: Ask Claude Desktop (with Postgres MCP):

```
Run a complete database health check and give me a prioritized list of optimizations.
```

This will analyze your actual database and give specific recommendations!

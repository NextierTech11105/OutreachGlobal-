# Object Bucket Naming Standards

**Version:** 1.0
**Date:** December 19, 2025
**Status:** Draft

---

## Overview

This document defines naming conventions for DigitalOcean Spaces object storage buckets used in the OutreachGlobal platform. Consistent naming ensures multi-tenant isolation, pipeline traceability, and clean lifecycle management.

---

## 1. BUCKET STRUCTURE

### Root Bucket
```
outreachglobal-{environment}
```

| Environment | Bucket Name |
|-------------|-------------|
| Production | `outreachglobal-prod` |
| Staging | `outreachglobal-staging` |
| Development | `outreachglobal-dev` |

### Prefix Hierarchy
```
/{tenant_id}/{domain}/{resource_type}/{date}/{filename}
```

---

## 2. PATH NAMING CONVENTIONS

### 2.1 Import Files (CSV Uploads)
```
/{tenant_id}/imports/{YYYY-MM-DD}/{import_id}_{original_filename}

Examples:
/tenant_01JEX7P8N9K3M5R/imports/2025-12-19/import_01JEX7QWK_ny-businesses.csv
/tenant_01JEX7P8N9K3M5R/imports/2025-12-19/import_01JEX7QWK_contacts-batch.csv
```

### 2.2 Pipeline Artifacts
```
/{tenant_id}/pipelines/{run_id}/artifacts/{artifact_type}_{timestamp}.json

Examples:
/tenant_01JEX7P8N9K3M5R/pipelines/run_01JEX8A2B3C/artifacts/enriched_1702987200.json
/tenant_01JEX7P8N9K3M5R/pipelines/run_01JEX8A2B3C/artifacts/skip_traced_1702987200.json
/tenant_01JEX7P8N9K3M5R/pipelines/run_01JEX8A2B3C/artifacts/scored_1702987200.json
```

### 2.3 Sector Buckets (Lead Groups)
```
/{tenant_id}/sectors/{sector_id}/leads_{export_date}.json
/{tenant_id}/sectors/{sector_id}/enriched_{export_date}.json

Examples:
/tenant_01JEX7P8N9K3M5R/sectors/sector_01JEX9B4C/leads_2025-12-19.json
/tenant_01JEX7P8N9K3M5R/sectors/sector_01JEX9B4C/enriched_2025-12-19.json
```

### 2.4 Message Templates
```
/{tenant_id}/templates/{template_type}/{template_id}.json

Examples:
/tenant_01JEX7P8N9K3M5R/templates/sms/template_01JEX9C5D.json
/tenant_01JEX7P8N9K3M5R/templates/email/template_01JEX9C6E.json
/tenant_01JEX7P8N9K3M5R/templates/voicemail/template_01JEX9C7F.json
```

### 2.5 Call Recordings
```
/{tenant_id}/recordings/{YYYY-MM}/{call_id}.mp3

Examples:
/tenant_01JEX7P8N9K3M5R/recordings/2025-12/call_01JEXAB12.mp3
/tenant_01JEX7P8N9K3M5R/recordings/2025-12/call_01JEXAB13.mp3
```

### 2.6 Reports & Exports
```
/{tenant_id}/reports/{report_type}/{YYYY-MM-DD}_{report_id}.{format}

Examples:
/tenant_01JEX7P8N9K3M5R/reports/campaign-performance/2025-12-19_rpt_01JEXBC23.pdf
/tenant_01JEX7P8N9K3M5R/reports/lead-export/2025-12-19_rpt_01JEXBC24.csv
/tenant_01JEX7P8N9K3M5R/reports/analytics/2025-12-19_rpt_01JEXBC25.json
```

### 2.7 AI/LLM Artifacts
```
/{tenant_id}/ai/{worker_type}/{session_id}/context.json
/{tenant_id}/ai/{worker_type}/{session_id}/response.json

Examples:
/tenant_01JEX7P8N9K3M5R/ai/gianna/sess_01JEXCD34/context.json
/tenant_01JEX7P8N9K3M5R/ai/luci/sess_01JEXCD35/orchestration.json
/tenant_01JEX7P8N9K3M5R/ai/sdr/sess_01JEXCD36/response.json
```

### 2.8 Webhook Payloads (Audit Trail)
```
/{tenant_id}/webhooks/{provider}/{YYYY-MM-DD}/{event_id}.json

Examples:
/tenant_01JEX7P8N9K3M5R/webhooks/signalhouse/2025-12-19/evt_01JEXDE45.json
/tenant_01JEX7P8N9K3M5R/webhooks/twilio/2025-12-19/evt_01JEXDE46.json
/tenant_01JEX7P8N9K3M5R/webhooks/stripe/2025-12-19/evt_01JEXDE47.json
```

---

## 3. ID PREFIX STANDARDS

All IDs in paths use ULID format with type prefixes:

| Resource Type | Prefix | Example |
|---------------|--------|---------|
| Tenant | `tenant_` | `tenant_01JEX7P8N9K3M5R2V4W6X8Y` |
| Import | `import_` | `import_01JEX7QWK8M3N5P7R` |
| Pipeline Run | `run_` | `run_01JEX8A2B3C4D5E6F7G` |
| Sector | `sector_` | `sector_01JEX9B4C5D6E7F8G` |
| Template | `template_` | `template_01JEX9C5D6E7F8G9` |
| Call | `call_` | `call_01JEXAB123456789` |
| Report | `rpt_` | `rpt_01JEXBC234567890` |
| Session | `sess_` | `sess_01JEXCD345678901` |
| Event | `evt_` | `evt_01JEXDE456789012` |
| Lead | `lead_` | `lead_01JEXEF567890123` |
| Block | `block_` | `block_01JEXFG678901234` |
| Artifact | `art_` | `art_01JEXGH789012345` |

---

## 4. FILE NAMING RULES

### 4.1 General Rules
- **Lowercase only** - All path components use lowercase
- **Underscores for spaces** - Use `_` not `-` for word separation in filenames
- **Hyphens for dates** - Use `YYYY-MM-DD` format
- **No special characters** - Only `a-z`, `0-9`, `_`, `-`, `.`
- **Max path length** - 256 characters total

### 4.2 Filename Format
```
{type}_{id}_{descriptor}.{extension}

Examples:
enriched_01JEXAB12_apollo.json
skip_traced_01JEXAB12_realestate.json
scored_01JEXAB12_final.json
```

### 4.3 Timestamp Format
When timestamps are needed in filenames:
```
{type}_{unix_timestamp}.{extension}

Examples:
enriched_1702987200.json     # Unix timestamp
backup_1702987200.json
```

---

## 5. ACCESS PATTERNS

### 5.1 Tenant Isolation
Every path MUST start with `/{tenant_id}/`. This enables:
- Bucket policies per tenant
- Easy tenant data export/deletion
- GDPR compliance

### 5.2 Lifecycle Rules
```yaml
# Auto-delete rules by path prefix
rules:
  - prefix: "*/webhooks/"
    expiration_days: 90

  - prefix: "*/recordings/"
    expiration_days: 365
    transition_to_glacier_days: 30

  - prefix: "*/pipelines/*/artifacts/"
    expiration_days: 30

  - prefix: "*/reports/"
    expiration_days: 730  # 2 years
```

### 5.3 Common Access Patterns
```typescript
// List all imports for a tenant
prefix: `${tenantId}/imports/`

// List all pipeline runs
prefix: `${tenantId}/pipelines/`

// Get specific run artifacts
prefix: `${tenantId}/pipelines/${runId}/artifacts/`

// List recordings by month
prefix: `${tenantId}/recordings/2025-12/`
```

---

## 6. PRESIGNED URL PATTERNS

### 6.1 Upload URLs
```typescript
// Generate presigned upload URL
const uploadKey = `${tenantId}/imports/${today}/${importId}_${sanitizedFilename}`;
const presignedUrl = await generatePresignedUpload(uploadKey, {
  expiresIn: 3600, // 1 hour
  maxSize: 100 * 1024 * 1024, // 100MB
  contentType: 'text/csv'
});
```

### 6.2 Download URLs
```typescript
// Generate presigned download URL
const downloadKey = `${tenantId}/reports/lead-export/${date}_${reportId}.csv`;
const presignedUrl = await generatePresignedDownload(downloadKey, {
  expiresIn: 86400, // 24 hours
  filename: `lead-export-${date}.csv`
});
```

---

## 7. MIGRATION PATH

### Current State (Legacy)
```
/buckets/{bucketId}/sectors/{sectorId}/...
/uploads/{userId}/...
```

### Target State
```
/{tenant_id}/sectors/{sector_id}/...
/{tenant_id}/imports/{date}/{import_id}_...
```

### Migration Script Pattern
```typescript
async function migrateBucketPath(oldPath: string, tenantId: string): string {
  // Extract components from old path
  const parts = oldPath.split('/');

  // Map to new structure
  if (parts[1] === 'buckets') {
    const sectorId = parts[3];
    return `${tenantId}/sectors/${sectorId}/${parts.slice(4).join('/')}`;
  }

  if (parts[1] === 'uploads') {
    const filename = parts[parts.length - 1];
    const today = new Date().toISOString().split('T')[0];
    return `${tenantId}/imports/${today}/${generateId('import')}_${filename}`;
  }

  return oldPath;
}
```

---

## 8. VALIDATION FUNCTION

```typescript
import { z } from 'zod';

const BucketPathSchema = z.string().regex(
  /^tenant_[0-9A-Z]{21,26}\/[a-z]+\/[a-z0-9_\-\/\.]+$/,
  'Invalid bucket path format'
);

const PathPrefixes = [
  'imports',
  'pipelines',
  'sectors',
  'templates',
  'recordings',
  'reports',
  'ai',
  'webhooks',
] as const;

export function validateBucketPath(path: string): boolean {
  try {
    BucketPathSchema.parse(path);

    const parts = path.split('/');
    const domain = parts[1];

    if (!PathPrefixes.includes(domain as any)) {
      throw new Error(`Invalid domain: ${domain}`);
    }

    return true;
  } catch (e) {
    console.error('Invalid bucket path:', path, e);
    return false;
  }
}

export function buildBucketPath(
  tenantId: string,
  domain: typeof PathPrefixes[number],
  ...segments: string[]
): string {
  const path = [tenantId, domain, ...segments].join('/');

  if (!validateBucketPath(path)) {
    throw new Error(`Generated invalid path: ${path}`);
  }

  return path;
}
```

---

## 9. EXAMPLES BY USE CASE

### Import CSV Flow
```
User uploads "ny-businesses.csv"
→ /tenant_01JEX7P8/imports/2025-12-19/import_01JEX8QW_ny-businesses.csv

LUCI processes import
→ /tenant_01JEX7P8/pipelines/run_01JEX8AB/artifacts/parsed_1702987200.json
→ /tenant_01JEX7P8/pipelines/run_01JEX8AB/artifacts/enriched_1702987201.json
→ /tenant_01JEX7P8/pipelines/run_01JEX8AB/artifacts/skip_traced_1702987202.json
→ /tenant_01JEX7P8/pipelines/run_01JEX8AB/artifacts/scored_1702987203.json

Leads assigned to sector
→ /tenant_01JEX7P8/sectors/sector_01JEX9BC/leads_2025-12-19.json
```

### SMS Campaign Flow
```
Campaign starts
→ /tenant_01JEX7P8/ai/gianna/sess_01JEXCD/context.json

Inbound message received
→ /tenant_01JEX7P8/webhooks/signalhouse/2025-12-19/evt_01JEXDE.json

AI response generated
→ /tenant_01JEX7P8/ai/gianna/sess_01JEXCD/response.json
```

### Call Recording Flow
```
Outbound call made
→ /tenant_01JEX7P8/recordings/2025-12/call_01JEXEF.mp3

Call transcribed
→ /tenant_01JEX7P8/ai/transcription/sess_01JEXFG/transcript.json
```

---

*Document generated for OutreachGlobal Platform Architecture*

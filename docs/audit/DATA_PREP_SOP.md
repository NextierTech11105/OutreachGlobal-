# Data Prep SOP: USDataBiz → Outreach-Ready

## Purpose

Transform raw USDataBiz CSV records into outreach-ready leads with:
- Normalized fields
- Deduplicated identities
- Validated contact info
- Outreach eligibility flags

---

## A. Raw Ingest Schema (USDataBiz CSV)

### Required Fields

| Field | Type | Description | Immutable |
|-------|------|-------------|-----------|
| `company_name` | string | Business legal name | YES |
| `first_name` | string | Contact first name | YES |
| `last_name` | string | Contact last name | YES |
| `phone` | string | Primary phone number | NO |
| `email` | string | Primary email | NO |
| `address` | string | Street address | YES |
| `city` | string | City | YES |
| `state` | string | State (name or abbrev) | YES |
| `zip` | string | ZIP code | YES |

### Optional Fields

| Field | Type | Description | Immutable |
|-------|------|-------------|-----------|
| `dba` | string | Doing Business As name | YES |
| `title` | string | Job title | NO |
| `street2` | string | Address line 2 | YES |
| `county` | string | County name | YES |
| `website` | string | Company website | NO |
| `employees` | int | Employee count | NO |
| `revenue` | int | Annual revenue | NO |
| `year_founded` | int | Year established | YES |
| `sic_code` | string | 4-digit SIC code | YES |
| `sic_description` | string | SIC description | YES |
| `naics_code` | string | 6-digit NAICS code | YES |

### Immutability Rules

- **Immutable (YES)**: Original source data, never modified
- **Mutable (NO)**: Can be updated via enrichment or user action

---

## B. Normalization Rules

### normalizePhone()

**File**: `apps/front/src/lib/etl/normalizers.ts`

```typescript
function normalizePhone(phone: string): string | null {
  // 1. Strip all non-digits
  const digits = phone.replace(/\D/g, '');

  // 2. Handle country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1); // Remove leading 1
  }

  // 3. Validate length
  if (digits.length !== 10) {
    return null; // Invalid
  }

  return digits;
}
```

**Examples**:
- `(555) 123-4567` → `5551234567`
- `+1-555-123-4567` → `5551234567`
- `555-1234` → `null` (invalid)

### normalizeEmail()

```typescript
function normalizeEmail(email: string): string | null {
  // 1. Lowercase and trim
  const normalized = email.toLowerCase().trim();

  // 2. Validate format
  if (!EMAIL_REGEX.test(normalized)) {
    return null;
  }

  // 3. Gmail dot-insensitivity
  if (normalized.includes('@gmail.com')) {
    const [local, domain] = normalized.split('@');
    return local.replace(/\./g, '') + '@' + domain;
  }

  return normalized;
}
```

**Examples**:
- `John.Doe@Gmail.com` → `johndoe@gmail.com`
- `USER@COMPANY.COM` → `user@company.com`

### normalizeCompanyName()

```typescript
function normalizeCompanyName(name: string): string {
  return name
    .toUpperCase()
    .trim()
    // Remove legal suffixes
    .replace(/\b(LLC|INC|CORP|CO|LTD|LP|LLP|PLLC|PC|PA)\b\.?/g, '')
    // Remove "THE" prefix
    .replace(/^THE\s+/g, '')
    // Remove punctuation
    .replace(/[^\w\s]/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
```

**Examples**:
- `ABC Plumbing, LLC` → `ABC PLUMBING`
- `The Smith Group Inc.` → `SMITH GROUP`

### normalizeName()

```typescript
function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .trim()
    // Remove titles
    .replace(/^(MR|MRS|MS|DR|PROF)\.?\s+/g, '')
    // Standardize suffixes
    .replace(/\bJUNIOR\b/g, 'JR')
    .replace(/\bSENIOR\b/g, 'SR')
    .replace(/\b(II|III|IV)\b/g, (m) => m)
    .trim();
}
```

### normalizeState()

```typescript
const STATE_MAP = {
  'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ',
  // ... full map
};

function normalizeState(state: string): string | null {
  const upper = state.toUpperCase().trim();

  // Already 2-letter?
  if (upper.length === 2) {
    return Object.values(STATE_MAP).includes(upper) ? upper : null;
  }

  // Full name?
  return STATE_MAP[upper] || null;
}
```

### normalizeZip()

```typescript
function normalizeZip(zip: string): string | null {
  const digits = zip.replace(/\D/g, '');

  // 5-digit or 9-digit
  if (digits.length === 5) return digits;
  if (digits.length === 9) return digits.slice(0, 5);

  return null;
}
```

### normalizeSIC()

```typescript
function normalizeSIC(sic: string): string | null {
  const digits = sic.replace(/\D/g, '');

  // Pad to 4 digits
  if (digits.length <= 4) {
    return digits.padStart(4, '0');
  }

  return null;
}
```

---

## C. Deduplication & Merge Rules

### Dedup Keys (Priority Order)

| Priority | Key | Match Rule | Confidence |
|----------|-----|------------|------------|
| 1 | `normalized_phone` | Exact 10-digit match | 0.95 |
| 2 | `normalized_email` | Exact match (Gmail normalized) | 0.90 |
| 3 | `name + company` | Last name prefix (3 chars) + normalized company | 0.70 |
| 4 | `name + address` | Full name + normalized address | 0.60 |

### Merge Precedence

When merging two personas:

| Field | Precedence Rule |
|-------|-----------------|
| `firstName` | Keep more complete (longer, not abbreviated) |
| `lastName` | Keep non-null, prefer SkipTrace source |
| `phone` | Keep mobile over landline |
| `email` | Keep business over personal |
| `address` | Keep most recent (by createdAt) |
| `title` | Keep non-null |
| `confidenceScore` | Sum scores (capped at 1.0) |

### Conflict Resolution

```typescript
function resolveMergeConflict(field: string, value1: any, value2: any, meta1: Meta, meta2: Meta): any {
  // Rule 1: Non-null wins over null
  if (value1 && !value2) return value1;
  if (value2 && !value1) return value2;

  // Rule 2: Higher source priority wins
  const sourcePriority = ['skiptrace', 'apollo', 'b2b_upload', 'manual'];
  const p1 = sourcePriority.indexOf(meta1.source);
  const p2 = sourcePriority.indexOf(meta2.source);
  if (p1 < p2) return value1;
  if (p2 < p1) return value2;

  // Rule 3: More recent wins
  return meta1.updatedAt > meta2.updatedAt ? value1 : value2;
}
```

### Audit Trail (persona_merge_history)

| Column | Type | Description |
|--------|------|-------------|
| `id` | ULID | Merge record ID |
| `survivorId` | FK | Persona that remains |
| `mergedId` | FK | Persona that was merged |
| `matchScore` | float | Confidence of match (0-1) |
| `matchDetails` | JSON | Which keys matched |
| `mergedBy` | string | 'auto' or user ID |
| `createdAt` | timestamp | When merge occurred |

---

## D. Outreach Readiness Flags

### Canonical Flag Schema

| Flag | Type | Logic |
|------|------|-------|
| `is_sms_ready` | boolean | `has_valid_mobile AND NOT do_not_contact` |
| `has_valid_mobile` | boolean | `persona_phones.phoneType = 'mobile' AND isValid = true` |
| `consent_status` | enum | `'unknown' \| 'implicit' \| 'explicit' \| 'revoked'` |
| `do_not_contact` | boolean | `In suppression_list OR consent_status = 'revoked'` |
| `campaign_eligible` | boolean | `score >= 60 AND (has_valid_mobile OR has_valid_email)` |

### Flag Derivation SQL

```sql
-- Compute outreach readiness flags
SELECT
  l.id,
  l.team_id,

  -- has_valid_mobile
  EXISTS (
    SELECT 1 FROM persona_phones pp
    WHERE pp.persona_id = l.persona_id
    AND pp.phone_type = 'mobile'
    AND pp.is_valid = true
  ) AS has_valid_mobile,

  -- do_not_contact
  EXISTS (
    SELECT 1 FROM suppression_list sl
    WHERE sl.phone_number = l.phone
    OR sl.email = l.email
  ) AS do_not_contact,

  -- is_sms_ready
  (has_valid_mobile AND NOT do_not_contact) AS is_sms_ready,

  -- campaign_eligible
  (
    l.score >= 60
    AND (has_valid_mobile OR l.email IS NOT NULL)
    AND NOT do_not_contact
  ) AS campaign_eligible

FROM leads l;
```

### Consent Status Values

| Status | Meaning | Trigger |
|--------|---------|---------|
| `unknown` | No consent record exists | Default |
| `implicit` | Inbound contact initiated by lead | Lead texted first |
| `explicit` | Written consent obtained | Consent form signed |
| `revoked` | Lead opted out | STOP received |

---

## E. SOP Checklist

### Pre-Ingestion Checklist

- [ ] CSV has required columns (company_name, first_name, last_name, phone OR email)
- [ ] File encoding is UTF-8
- [ ] File size < 100MB (or use batch upload)
- [ ] No duplicate rows in source file

### During Ingestion

- [ ] All phone numbers normalized to 10 digits
- [ ] All emails lowercased and validated
- [ ] All states converted to 2-letter codes
- [ ] All SIC codes padded to 4 digits
- [ ] Source file reference stored

### Post-Ingestion Validation

- [ ] No orphan personas (all have at least one contact method)
- [ ] No duplicate normalized phones
- [ ] All businesses have at least one persona linked
- [ ] Merge history logged for any auto-dedup

### Pre-Campaign Checklist

- [ ] All leads have `is_sms_ready = true` OR valid alternative
- [ ] No leads with `do_not_contact = true`
- [ ] Consent status reviewed for compliance
- [ ] Lead scores calculated
- [ ] Tags applied

---

## F. Canonical Entity Schema

### businesses

```sql
CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,

  -- Identity
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  dba TEXT,

  -- Classification
  sic_code CHAR(4),
  sic_description TEXT,
  naics_code CHAR(6),
  sector TEXT,
  sub_sector TEXT,

  -- Contact
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Location
  street TEXT,
  street2 TEXT,
  city TEXT,
  state CHAR(2),
  zip CHAR(5),
  county TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Metrics
  employee_count INTEGER,
  annual_revenue BIGINT,
  year_founded INTEGER,

  -- Status
  is_active BOOLEAN DEFAULT true,
  apollo_enriched BOOLEAN DEFAULT false,
  apollo_enriched_at TIMESTAMP,

  -- Source
  source_file TEXT,
  source_record_id TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,

  -- Indexes
  UNIQUE (team_id, normalized_name)
);

CREATE INDEX idx_businesses_team ON businesses(team_id);
CREATE INDEX idx_businesses_sic ON businesses(sic_code);
CREATE INDEX idx_businesses_state ON businesses(state);
```

### personas

```sql
CREATE TABLE personas (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,

  -- Name
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
  suffix TEXT,
  full_name TEXT,

  -- Normalized (for dedup)
  normalized_first_name TEXT,
  normalized_last_name TEXT,

  -- Demographics
  age INTEGER,
  date_of_birth DATE,
  gender TEXT,

  -- Matching
  confidence_score DECIMAL(3, 2) DEFAULT 0.50,
  merged_from_ids TEXT[],

  -- Source
  primary_source TEXT, -- 'business', 'property', 'skiptrace', 'apollo'

  -- Enrichment
  skip_trace_completed BOOLEAN DEFAULT false,
  apollo_completed BOOLEAN DEFAULT false,
  last_enriched_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,

  -- Indexes
  UNIQUE (team_id, normalized_first_name, normalized_last_name) -- soft dedup
);

CREATE INDEX idx_personas_team ON personas(team_id);
CREATE INDEX idx_personas_name ON personas(normalized_last_name, normalized_first_name);
```

### persona_phones

```sql
CREATE TABLE persona_phones (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  persona_id TEXT REFERENCES personas(id),

  -- Phone
  phone_number TEXT NOT NULL,
  normalized_number CHAR(10) NOT NULL,
  phone_type TEXT, -- 'mobile', 'landline', 'voip'

  -- Validation
  is_valid BOOLEAN,
  is_connected BOOLEAN,
  is_do_not_call BOOLEAN DEFAULT false,

  -- Source
  source TEXT, -- 'b2b', 'skiptrace', 'manual'
  score DECIMAL(3, 2),
  is_primary BOOLEAN DEFAULT false,

  -- Verification
  last_verified_at TIMESTAMP,
  verification_source TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,

  -- Indexes
  UNIQUE (team_id, normalized_number)
);

CREATE INDEX idx_persona_phones_team ON persona_phones(team_id);
CREATE INDEX idx_persona_phones_persona ON persona_phones(persona_id);
CREATE INDEX idx_persona_phones_number ON persona_phones(normalized_number);
```

---

## G. Validation SQL

### Find leads missing contact info

```sql
SELECT l.id, l.name, l.phone, l.email
FROM leads l
WHERE l.team_id = :teamId
AND l.phone IS NULL
AND l.email IS NULL;
```

### Find duplicate phones

```sql
SELECT normalized_number, COUNT(*) as count, array_agg(persona_id)
FROM persona_phones
WHERE team_id = :teamId
GROUP BY normalized_number
HAVING COUNT(*) > 1;
```

### Find unmerged duplicates

```sql
SELECT
  p1.id AS persona1,
  p2.id AS persona2,
  p1.normalized_first_name,
  p1.normalized_last_name
FROM personas p1
JOIN personas p2 ON
  p1.normalized_last_name = p2.normalized_last_name
  AND p1.normalized_first_name = p2.normalized_first_name
  AND p1.id < p2.id
WHERE p1.team_id = :teamId
AND p1.team_id = p2.team_id
AND p1.merged_from_ids IS NULL
AND p2.merged_from_ids IS NULL;
```

### Outreach readiness summary

```sql
SELECT
  COUNT(*) AS total_leads,
  SUM(CASE WHEN is_sms_ready THEN 1 ELSE 0 END) AS sms_ready,
  SUM(CASE WHEN has_valid_mobile THEN 1 ELSE 0 END) AS with_mobile,
  SUM(CASE WHEN do_not_contact THEN 1 ELSE 0 END) AS dnc,
  SUM(CASE WHEN campaign_eligible THEN 1 ELSE 0 END) AS eligible
FROM leads_readiness_view
WHERE team_id = :teamId;
```

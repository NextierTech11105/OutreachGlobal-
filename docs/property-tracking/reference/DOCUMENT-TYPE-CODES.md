# Document Type Codes Reference

## Overview

Filter property searches based on how properties were transacted. Find different deed types, liens, trustee relationships, and more.

Use these codes in the `document_type_code` field on Property Search.

---

## Critical Event Detection Deed Types

### Estate/Probate Deeds (CRITICAL PRIORITY)
```typescript
const ESTATE_DEED_CODES = [
  "DTDT",  // AFFIDAVIT OF DEATH
  "DTEX",  // EXECUTORS DEED
  "DTPR",  // PERSONAL REPRESENTATIVE DEED
  "DTAD",  // ADMINISTRATORS DEED
  "DTDB",  // DEED OF DISTRIBUTION
  "DTDJ",  // AFFIDAVIT OF DEATH OF JOINT TENANT
  "DTDG",  // DEED OF GUARDIAN
];
```

**Why Critical:** Estate deeds indicate motivated sellers (inherited properties, family liquidation).

### Distress Sales (CRITICAL PRIORITY)
```typescript
const DISTRESS_DEED_CODES = [
  "DTFC",  // FORECLOSURE
  "DTSD",  // SHERIFFS DEED
  "DTDL",  // DEED IN LIEU OF FORECLOSURE
  "DTRF",  // REFEREE'S DEED (NY Foreclosure)
  "DTDS",  // DISTRESS SALE
  "DTRD",  // REDEMPTION DEED
  "DTRS",  // REO SALE (REO OUT)
  "DTDX",  // TAX DEED
];
```

**Why Critical:** Indicates financial distress, foreclosure, or urgent sale need.

### Legal/Court Deeds (HIGH PRIORITY)
```typescript
const LEGAL_DEED_CODES = [
  "DTLA",  // LEGAL ACTION/COURT ORDER
  "DTCM",  // COMMISSIONERS DEED
  "DTMD",  // SPECIAL MASTER DEED
  "DTRC",  // RECEIVERS DEED
  "DTCF",  // COMMITTEE, STRICT FORECLOSURE, SHERIFF, OR REDEMPTION DEEDS
  "DTCE",  // COMMITTEE
];
```

---

## All Document Type Codes

### Standard Deeds

| Code | Type | Description |
|------|------|-------------|
| **DTWD** | Warranty Deed | Standard property transfer with guarantees |
| **DTGD** | Grant Deed | Transfer with limited warranties |
| **DTQC** | Quit Claim Deed | Transfer without warranties |
| **DTSW** | Special Warranty Deed | Limited warranty deed |
| **DTLW** | Limited Warranty Deed | Deed with limited guarantees |
| **DTBS** | Bargain And Sale Deed | Simple transfer deed |
| **DTDE** | Deed | Generic deed type |

### Intrafamily & Gift Deeds

| Code | Type | Description |
|------|------|-------------|
| **DTIT** | Intrafamily Transfer | Transfer between family members |
| **DTGF** | Gift Deed | Property gifted (no sale) |
| **DTSV** | Survivorship Deed | Transfer upon death to surviving owner |
| **DTJT** | Joint Tenancy Deed | Joint ownership transfer |
| **DTES** | Life Estate | Transfer with life estate rights |

### Correction & Re-recording

| Code | Type | Description |
|------|------|-------------|
| **DTCR** | Correction Deed | Corrects errors in previous deed |
| **DTRR** | Re-Recorded Document | Document recorded again |
| **DTCV** | Conveyance | General property transfer |

### Death-Related Deeds (Estate)

| Code | Type | Description |
|------|------|-------------|
| **DTDD** | Transfer On Death Deed | Automatic transfer upon death |
| **DTBD** | Beneficiary Deed | Transfer to beneficiary upon death |
| **DTDT** | Affidavit Of Death | Proof of death for transfer |
| **DTEX** | Executors Deed | Executor transferring estate property |
| **DTPR** | Personal Representative Deed | Estate representative transfer |
| **DTAD** | Administrators Deed | Estate administrator transfer |
| **DTDB** | Deed Of Distribution | Distribution of estate property |
| **DTDJ** | Affidavit Of Death Of Joint Tenant | Joint tenant death transfer |
| **DTDG** | Deed Of Guardian | Guardian transferring property |
| **DTST** | Affidavit Death Of Trustee/Successor Trustee | Trustee death transfer |
| **DTAT** | Affidavit Of Trust Or Trust Agreement | Trust-related transfer |

### Trustee & Fiduciary Deeds

| Code | Type | Description |
|------|------|-------------|
| **DTTD** | Trustees Deed | Trustee transferring trust property |
| **DTFD** | Fiduciary Deed | Fiduciary transferring property |
| **DTCO** | Conservators Deed | Conservator transferring property |

### Foreclosure & Distress

| Code | Type | Description |
|------|------|-------------|
| **DTFC** | Foreclosure | Foreclosure sale transfer |
| **DTSD** | Sheriffs Deed | Sheriff sale transfer |
| **DTDL** | Deed In Lieu Of Foreclosure | Voluntary foreclosure avoidance |
| **DTRF** | Referee's Deed | NY foreclosure sale deed |
| **DTDS** | Distress Sale | Sale under distress |
| **DTRD** | Redemption Deed | Property redeemed from foreclosure |
| **DTRS** | REO Sale (REO Out) | Bank-owned property sale |
| **DTDX** | Tax Deed | Tax sale transfer |

### Legal/Court Deeds

| Code | Type | Description |
|------|------|-------------|
| **DTLA** | Legal Action/Court Order | Court-ordered transfer |
| **DTCM** | Commissioners Deed | Commissioner sale deed |
| **DTMD** | Special Master Deed | Special master sale |
| **DTRC** | Receivers Deed | Receiver transferring property |
| **DTCF** | Committee/Strict Foreclosure | NY legal transfer |
| **DTCE** | Committee | Committee transfer |

### Sales & Contracts

| Code | Type | Description |
|------|------|-------------|
| **DTCH** | Cash Sale Deed | Cash purchase transfer |
| **DTCS** | Contract Sale | Contract-based sale |
| **DTLD** | Land Contract | Land contract sale |
| **DTAG** | Agreement Of Sale | Sale agreement |
| **DTSA** | Sub Agreement Of Sale | Sub-agreement sale |
| **DTCN** | Cancellation Of Agreement Of Sale | Sale cancellation |
| **DTAR** | Assignment Of Agreement Of Sale | Sale agreement assignment |
| **DTAA** | Assignment Of Sub Agreement Of Sale | Sub-agreement assignment |
| **DTRA** | Release/Satis. Of Agrem. Of Sale (Fee Property) | Sale agreement release |

### Lease-Related

| Code | Type | Description |
|------|------|-------------|
| **DTLE** | Lease | Property lease |
| **DTGR** | Ground Lease | Ground lease agreement |
| **DTCL** | Commercial Lease | Commercial property lease |
| **DTSL** | Sub Lease | Sublease agreement |
| **DTSC** | Sub Commercial Lease | Commercial sublease |
| **DTLH** | Assignment Of Lease (Leasehold Sale) | Leasehold transfer |
| **DTCA** | Commissioners Assignment Of Lease | Commissioner lease assignment |
| **DTAB** | Assignment Of Sub Lease | Sublease assignment |
| **DTAC** | Assignment Of Commercial Lease | Commercial lease assignment |
| **DTAU** | Assignment Of Sub Commercial Lease | Commercial sublease assignment |
| **DTLC** | Leasehold Conv. With Agreem. Of Sale (Fee Purchase) | Leasehold conversion |
| **DTLS** | Leasehold Conv. W/An Agreement Of Sale | Leasehold sale conversion |
| **DTRL** | Release/Satis. Of Agrem. Of Sale (Leasehold) | Leasehold release |

### Corporation & Entity Deeds

| Code | Type | Description |
|------|------|-------------|
| **DTCP** | Corporation Deed | Corporation transfer |
| **DTPD** | Partnership Deed | Partnership transfer |
| **DTID** | Individual Deed | Individual transfer |

### Miscellaneous

| Code | Type | Description |
|------|------|-------------|
| **DTOT** | Other | Uncategorized deed type |
| **DTCD** | Condominium Deed | Condominium transfer |
| **DTAF** | Affidavit | General affidavit |
| **DTCT** | Certificate Of Transfer | Transfer certificate |
| **DTFP** | Certificate Of Purchase | Purchase certificate |
| **DTTR** | Deed Of Trust | Trust deed |
| **DTAH** | Assessor Sales History | Sales history record |
| **DTLT** | Land Court | Land court transfer |
| **DTEC** | Exchange | Property exchange |
| **DTDC** | Declaration | Declaration document |
| **DTMN** | Municipal | Municipal transfer |
| **DTPA** | Public Action | Public action transfer |
| **DTXX** | Transaction History Record | History record |
| **XXXX** | Unknown | Unknown deed type |

### Mortgage-Related

| Code | Type | Description |
|------|------|-------------|
| **DVTL** | Vendors Lien | Vendor's lien |
| **DTVL** | Venders Lien | Vendor's lien (alt spelling) |
| **DTMO** | Loan Modification | Loan modification |
| **DTMX** | Loan Modification, Consolidation And Extension | Complex loan modification |
| **DTR1** | Loan 1 (Only) Is A Reverse Mortgage | Reverse mortgage on loan 1 |
| **DTR2** | Loan 2 (Only) Is A Reverse Mortgage | Reverse mortgage on loan 2 |
| **DTR3** | Loan 3 (Only) Is A Reverse Mortgage | Reverse mortgage on loan 3 |
| **DTR4** | Loans 1 And 2 Are Both Reverse Mortgages | Multiple reverse mortgages |
| **DTDP** | Dual Purpose Document | Multi-purpose document |
| **DTAL** | Quit Claim Arm's Length For NE States | Northeast quit claim |

---

## Usage in API

### Single Code
```json
{
  "state": "NY",
  "document_type_code": "DTEX"
}
```

### Multiple Codes (Array)
```json
{
  "state": "NY",
  "document_type_code": ["DTDT", "DTEX", "DTPR", "DTAD"]
}
```

### Estate Deed Search (Motivated Sellers)
```json
{
  "state": "NY",
  "county": "Nassau",
  "document_type_code": ["DTDT", "DTEX", "DTPR", "DTAD", "DTDB"],
  "yearsOwned": 5,
  "propertyType": "Multi-Family"
}
```

### Distress Sale Search
```json
{
  "state": "FL",
  "county": "Miami-Dade",
  "document_type_code": ["DTFC", "DTSD", "DTDL", "DTDS"],
  "preForeclosure": true
}
```

---

## Event Detection Logic

### Detecting Estate Deeds
```typescript
function detectEstateDeed(documentTypeCode: string): boolean {
  const estateCodes = ["DTDT", "DTEX", "DTPR", "DTAD", "DTDB", "DTDJ", "DTDG"];
  return estateCodes.includes(documentTypeCode);
}

// In tracking system
if (detectEstateDeed(newData.documentTypeCode)) {
  event = "estate_deed";
  priority = "CRITICAL";
  campaignTrigger = true;
  message = "We specialize in helping families liquidate inherited properties...";
}
```

### Detecting Foreclosure
```typescript
function detectForeclosure(documentTypeCode: string): boolean {
  const foreclosureCodes = ["DTFC", "DTSD", "DTDL", "DTRF", "DTDS"];
  return foreclosureCodes.includes(documentTypeCode);
}
```

---

## Integration with Property Tracking

These document type codes are stored in the `signals` JSONB field:

```json
{
  "propertyId": "prop_123",
  "signals": {
    "deedType": "DTEX",
    "deedTypeDescription": "Executors Deed",
    "lastSaleDate": "2024-11-15",
    "documentRecordingDate": "2024-11-20"
  },
  "signalHistory": [
    {
      "date": "2024-11-20",
      "events": ["estate_deed"],
      "signals": {
        "deedType": "DTEX"
      }
    }
  ]
}
```

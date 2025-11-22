# Property Use Codes Reference

## Overview

Property use codes define the county-level designation for how a property is used across residential and commercial classifications.

**Property Types:** SFR, MFR, LAND, CONDO, MOBILE, OTHER

---

## Single-Family Residential (SFR)

```typescript
const SFR_CODES = [
  376,  // PATIO HOME
  380,  // RESIDENTIAL (GENERAL/SINGLE)
  382,  // ROW HOUSE
  383,  // RURAL RESIDENCE
  385,  // SINGLE FAMILY RESIDENCE
  386,  // TOWNHOUSE
];
```

---

## Land (LAND)

```typescript
const LAND_CODES = [
  389,  // VACANT LAND
  390,  // ZERO LOT LINE (RESIDENTIAL)
  392,  // AGRICULTURAL (UNIMPROVED) - VACANT LAND
  398,  // MULTI-FAMILY - VACANT LAND
  401,  // RESIDENTIAL - VACANT LAND
  409,  // VACANT LAND - EXEMPT
  447,  // TINY HOUSE
  453,  // VACANT LAND - DESTROYED/UNINHABITABLE IMPROVEMENT
  462,  // VACANT LAND - UNSPECIFIED IMPROVEMENT
];
```

**Note:** Some land parcels are `lotInfo.landUse: "Residential"` and some are `lotInfo.landUse: "Commercial"`

---

## Multi-Family Residential (MFR)

```typescript
const MFR_CODES = [
  357,  // GARDEN APT, COURT APT (5+ UNITS)
  358,  // HIGH-RISE APARTMENTS
  359,  // APARTMENT HOUSE (100+ UNITS)
  360,  // APARTMENTS (GENERIC)
  361,  // APARTMENT HOUSE (5+ UNITS)
  369,  // DUPLEX (2 UNITS, ANY COMBINATION)
  372,  // MULTI-FAMILY DWELLINGS (GENERIC, ANY COMBINATION)
  378,  // QUADPLEX (4 UNITS, ANY COMBINATION)
  381,  // RESIDENTIAL INCOME (GENERAL/MULTI-FAMILY)
  388,  // TRIPLEX (3 UNITS, ANY COMBINATION)
];
```

**Note:** Some multi-family is `lotInfo.landUse: "Residential"` and some are `lotInfo.landUse: "Commercial"`. Unit count often dictates this but can vary by county and zoning laws.

---

## Condo (CONDO)

```typescript
const CONDO_CODES = [
  201,  // CONDOMINIUMS (INDUSTRIAL)
  364,  // CLUSTER HOME
  366,  // CONDOMINIUM
];
```

---

## Mobile Homes (MOBILE)

```typescript
const MOBILE_CODES = [
  371,  // MANUFACTURED, MODULAR, PRE-FABRICATED HOMES
  373,  // MOBILE HOME
];
```

---

## Commercial Property Types (OTHER)

### Multi-Unit Residential

```typescript
const MULTI_UNIT_CODES = [
  369,  // DUPLEX (2 UNITS, ANY COMBINATION)
  378,  // QUADPLEX (4 UNITS, ANY COMBINATION)
  388,  // TRIPLEX (3 UNITS, ANY COMBINATION)
];
```

### Offices

```typescript
const OFFICE_CODES = [
  136,  // COMMERCIAL OFFICE (GENERAL)
  140,  // STORE/OFFICE (MIXED USE)
  169,  // OFFICE BUILDING
  170,  // OFFICE BUILDING (MULTI-STORY)
  171,  // COMMERCIAL OFFICE/RESIDENTIAL (MIXED USE)
  184,  // SKYSCRAPER/HIGH-RISE (COMMERCIAL OFFICES)
];
```

### Storage Facilities

```typescript
const STORAGE_CODES = [
  229,  // MINI-WAREHOUSE, STORAGE
  238,  // WAREHOUSE, STORAGE
  448,  // RESIDENTIAL STORAGE SPACE
];
```

### Food & Beverage

```typescript
const FOOD_BEVERAGE_CODES = [
  128,  // BAKERY
  129,  // BAR, TAVERN
  146,  // DRIVE-THRU RESTAURANT, FAST FOOD
  148,  // RESTAURANT
  151,  // GROCERY, SUPERMARKET
  166,  // NIGHTCLUB (COCKTAIL LOUNGE)
  189,  // TAKE-OUT RESTAURANT (FOOD PREPARATION)
  203,  // DISTILLERY, BREWERY, BOTTLING
  449,  // ROADSIDE MARKET
];
```

### Storefronts/Retail

```typescript
const RETAIL_CODES = [
  124,  // CONVENIENCE STORE (7-11)
  125,  // APPLIANCE STORE
  127,  // VEHICLE SALES, VEHICLE RENTALS
  141,  // DEPARTMENT STORE
  158,  // LIQUOR STORE
  167,  // NEIGHBORHOOD: SHOPPING CENTER, STRIP CENTER
  168,  // NURSERY, GREENHOUSE, FLORIST
  178,  // RETAIL STORES (PERSONAL SERVICES)
  179,  // REGIONAL: SHOPPING CENTER, MALL (W/ANCHOR)
  183,  // COMMUNITY: SHOPPING CENTER, MINI-MALL
  187,  // STORES & APARTMENTS
  188,  // STORE, RETAIL OUTLET
  194,  // WHOLESALE OUTLET, DISCOUNT STORE
  307,  // HISTORICAL RETAIL
  459,  // CANNABIS DISPENSARY
];
```

### Services (Blue Collar Target)

```typescript
const BLUE_COLLAR_SERVICES = [
  126,  // AUTO REPAIR, GARAGE
  142,  // DENTAL BUILDING
  145,  // DRUG STORE, PHARMACY
  147,  // DRY CLEANER
  156,  // KENNEL
  157,  // LAUNDROMAT (SELF-SERVICE)
  173,  // PRINTER - RETAIL
  175,  // DAY CARE, PRE-SCHOOL (COMMERCIAL)
  177,  // PROFESSIONAL BUILDING
  180,  // GAS STATION
  185,  // SERVICE STATION W/CONVENIENCE STORE
  186,  // SERVICE STATION (FULL SERVICE)
  190,  // TRUCK STOP (FUEL AND DINER)
  191,  // SERVICE SHOP (TV, RADIO, ELECTRIC, PLUMBING)
  192,  // VETERINARY, ANIMAL HOSPITAL
  193,  // CAR WASH
  204,  // DUMP SITE
  296,  // GYM, HEALTH SPA
  311,  // MARINA, BOAT SLIPS
  312,  // MEDICAL CLINIC
  412,  // PET BOARDING & GROOMING
  458,  // CAR WASH - AUTOMATED
  464,  // BARBER/HAIR SALON
];
```

### Lodging

```typescript
const LODGING_CODES = [
  131,  // BED & BREAKFAST
  153,  // HOTEL/MOTEL
  154,  // HOTEL-RESORT
  155,  // HOTEL
  163,  // MOTEL
  299,  // HISTORICAL TRANSIENT LODGING
];
```

### Farms

```typescript
const FARM_CODES = [
  101,  // DAIRY FARM
  103,  // FARM, CROPS
  104,  // FEEDLOTS
  105,  // FARM (IRRIGATED OR DRY)
  106,  // HORTICULTURE, ORNAMENTAL
  107,  // IRRIGATION, FLOOD CONTROL
  108,  // LIVESTOCK, ANIMALS
  109,  // MISCELLANEOUS STRUCTURES - RANCH, FARM FIXTURES
  110,  // ORCHARD (FRUIT, NUT)
  111,  // ORCHARDS, GROVES
  112,  // PASTURE
  113,  // POULTRY FARM
  114,  // RANCH
  117,  // RANGE LAND (GRAZING)
  118,  // AGRICULTURAL/RURAL (GENERAL)
  120,  // TIMBERLAND, FOREST, TREES
  121,  // VINEYARD
  122,  // WELL SITE (AGRICULTURAL)
  423,  // BARNDOMINIUM
  446,  // CROPS (HARVESTED)
  450,  // CANNABIS GROW FACILITY
  466,  // LIVESTOCK (ANIMALS, FISH, BIRDS, ETC.)
];
```

---

## Count Query

Get counts of any search **before** you run it. Quickly compare counts across different searches **without spending credits**.

### Examples

**Get total properties in a city:**
```json
{
  "count": true,
  "city": "Arlington",
  "state": "VA"
}
```

**Get count with property type filter:**
```json
{
  "count": true,
  "city": "Arlington",
  "state": "VA",
  "property_type": "SFR"
}
```

**Get count with event filter:**
```json
{
  "count": true,
  "city": "Arlington",
  "state": "VA",
  "pre_foreclosure": true,
  "notice_type": "NOD"
}
```

**IMPORTANT:** When `count: true` is specified, the credit spend is **0 credits**.

---

## Usage in API

### Single Code
```json
{
  "state": "NY",
  "property_use_code": 126
}
```

### Multiple Codes (Array)
```json
{
  "state": "NY",
  "property_use_code": [126, 180, 191, 193]
}
```

### Blue Collar Business Search
```json
{
  "state": "NY",
  "county": "Nassau",
  "property_use_code": [126, 180, 191, 193, 296, 312, 412, 464],
  "yearsOwned": 5,
  "absenteeOwner": true
}
```

This searches for:
- Auto repair (126)
- Gas stations (180)
- Service shops (191)
- Car washes (193)
- Gyms (296)
- Medical clinics (312)
- Pet boarding (412)
- Barber/hair salons (464)

---

## Deprecated Codes (as of October 2024)

The following codes have been deprecated and should not be used:

103, 111, 146, 160, 161, 164, 165, 181, 187, 222, 223, 241, 242, 243, 244, 245, 247, 254, 309, 341, 349, 365, 366, 367, 375, 379, 392, 397, 405, 417, 424, 426, 428, 430, 442, 443, 454, 457

---

## New Codes (as of October 2024)

```
1010  RESIDENTIAL COMMON AREA (CONDO/PUD/ETC.)
1023  ACCESSORY DWELLING UNIT (ADU)
1114  RESIDENTIAL CONDOMINIUM DEVELOPMENT (ASSOCIATION ASSESSMENT)
2013  Fast Food Restaurant / Drive-thru
6003  Mining facility (oil; gas; mineral, precious metals)
7004  CROP LAND, FIELD CROPS, ROW CROPS (ALL SOIL CLASSES)
7014  GROVE (AGRICULTURAL)
8008  Rural/Agricultural-Vacant Land
8501  STATE BOARD OF EQUALIZATION - SPECIAL ASSESSMENTS
9001  Native American Lands / American Indian Lands
```

---

## Complete Code List

[See full list of 466+ codes in RealEstate API documentation]

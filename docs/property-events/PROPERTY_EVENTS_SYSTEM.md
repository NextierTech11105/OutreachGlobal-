# Property Events System

## Overview

The Property Events System automatically monitors saved searches, detects property status changes, updates records, adds notes, and triggers auto-labeling/tagging.

---

## Event Categories

### 1. LISTING EVENTS

#### Property Listed (MLS)
**Event:** Property appears on MLS
**Trigger:** Property status changes from "Off Market" → "Listed"
**Auto-Tag:** `listed`, `mls-active`
**Note:** "Property listed on MLS for $XXX,XXX on [DATE]"
**Actions:**
- Update property status
- Add listing price to record
- Tag as "Hot Lead" if listed below market value
- Alert: Send notification to team if property was being tracked

#### Property Delisted
**Event:** Property removed from MLS
**Trigger:** Property status changes from "Listed" → "Off Market"
**Auto-Tag:** `delisted`, `off-market`
**Note:** "Property delisted from MLS on [DATE]. Previous list price: $XXX,XXX"
**Actions:**
- Update property status
- Mark as potential opportunity (didn't sell)
- Trigger "Failed Listing" campaign

#### Price Drop
**Event:** Listing price reduced
**Trigger:** Listing price decreases by >5%
**Auto-Tag:** `price-drop`, `motivated-seller`
**Note:** "Price reduced from $XXX,XXX to $XXX,XXX (-X%) on [DATE]"
**Actions:**
- Update listing price
- Increase deal score by +15 points
- Tag as "Hot Lead"
- Alert: Send immediate notification
- Trigger "Price Drop Follow-up" campaign

---

### 2. SALE EVENTS

#### Property Sold
**Event:** Property sale completed
**Trigger:** Deed transfer recorded
**Auto-Tag:** `sold`, `closed`, `recent-sale`
**Note:** "Property sold for $XXX,XXX on [DATE]. Sale price [above/below] list by X%"
**Actions:**
- Update property status
- Record sale price
- Update owner information
- Add to "Recently Sold" list
- Track for flip opportunity (if sold to investor)

#### Sold Last 12 Months
**Event:** Property sold within past year
**Trigger:** Sale date < 12 months ago
**Auto-Tag:** `recent-acquisition`, `new-owner`
**Note:** "Property sold X months ago for $XXX,XXX"
**Actions:**
- Tag for investor targeting
- Monitor for quick flip
- Potential wholesale opportunity

---

### 3. DISTRESS EVENTS

#### Pre-Foreclosure
**Event:** Notice of Default filed
**Trigger:** Pre-foreclosure filing detected
**Auto-Tag:** `pre-foreclosure`, `distress`, `hot-lead`
**Note:** "Pre-foreclosure filed on [DATE]. Loan amount: $XXX,XXX"
**Actions:**
- Update property status
- Set deal score to 90+
- Tag as "Hot Lead"
- Alert: Immediate notification
- Trigger "Pre-Foreclosure Assistance" campaign
- Track auction date

#### Foreclosure
**Event:** Foreclosure filing
**Trigger:** Foreclosure notice recorded
**Auto-Tag:** `foreclosure`, `bank-owned`, `urgent`
**Note:** "Foreclosure filed on [DATE]. Auction date: [DATE]"
**Actions:**
- Update property status
- Set deal score to 95
- Tag as "Urgent - Hot Lead"
- Alert: Immediate notification
- Trigger "Foreclosure Buy" campaign
- Track auction date and reserve price

#### Lis Pendens Filed
**Event:** Lawsuit filed affecting property
**Trigger:** Lis Pendens recorded
**Auto-Tag:** `lis-pendens`, `legal-issue`, `distress`
**Note:** "Lis Pendens filed on [DATE]. Type: [Foreclosure/Divorce/Other]"
**Actions:**
- Update property status
- Increase deal score by +10
- Tag as "Legal Distress"
- Monitor for resolution

#### Auction Scheduled
**Event:** Property scheduled for auction
**Trigger:** Auction date set
**Auto-Tag:** `auction`, `foreclosure-auction`, `time-sensitive`
**Note:** "Auction scheduled for [DATE] at [TIME]. Opening bid: $XXX,XXX"
**Actions:**
- Update property status
- Set deal score to 98
- Tag as "Time Sensitive"
- Alert: Daily reminders until auction
- Track auction results

---

### 4. VACANCY EVENTS

#### Property Vacant
**Event:** Property becomes vacant
**Trigger:** Utility shutoff, mail forwarding, or vacancy detection
**Auto-Tag:** `vacant`, `unoccupied`, `motivated-seller`
**Note:** "Property vacant as of [DATE]. Utilities: [Active/Inactive]"
**Actions:**
- Update property status
- Increase deal score by +10
- Tag as "Vacant - Motivated Seller"
- Trigger "Vacant Property" campaign
- Monitor for code violations

#### Long-Term Vacant
**Event:** Property vacant >6 months
**Trigger:** Vacancy duration > 180 days
**Auto-Tag:** `long-term-vacant`, `abandoned`, `hot-opportunity`
**Note:** "Property vacant for X months. High motivation likely"
**Actions:**
- Set deal score to 85
- Tag as "Hot Opportunity"
- Trigger "Abandoned Property" campaign

---

### 5. OWNERSHIP EVENTS

#### Owner Change
**Event:** Property ownership transferred
**Trigger:** New deed recorded
**Auto-Tag:** `new-owner`, `ownership-change`
**Note:** "Ownership transferred to [NEW OWNER] on [DATE]"
**Actions:**
- Update owner information
- Reset tracking data
- Check if new owner is investor/corporate
- Update absentee/out-of-state status

#### Absentee Owner Detected
**Event:** Mailing address ≠ property address
**Trigger:** Tax record shows different mailing address
**Auto-Tag:** `absentee-owner`, `investor-likely`
**Note:** "Absentee owner detected. Property in [CITY], owner in [CITY]"
**Actions:**
- Update owner type
- Increase deal score by +10
- Tag as "Absentee"

#### Out-of-State Owner
**Event:** Owner in different state
**Trigger:** Owner state ≠ property state
**Auto-Tag:** `out-of-state`, `remote-owner`
**Note:** "Out-of-state owner. Property in [STATE], owner in [STATE]"
**Actions:**
- Update owner type
- Increase deal score by +5
- Tag as "Out-of-State"

---

### 6. FINANCIAL EVENTS

#### Tax Delinquency
**Event:** Property taxes unpaid
**Trigger:** Tax delinquency filed
**Auto-Tag:** `tax-delinquent`, `financial-distress`
**Note:** "Tax delinquency: $XX,XXX unpaid for [YEAR]"
**Actions:**
- Update property status
- Increase deal score by +15
- Tag as "Tax Lien"
- Trigger "Tax Sale" campaign

#### Tax Lien Filed
**Event:** Tax lien recorded
**Trigger:** Tax lien filing detected
**Auto-Tag:** `tax-lien`, `distress`, `motivated`
**Note:** "Tax lien filed on [DATE]. Amount: $XX,XXX"
**Actions:**
- Update property status
- Set deal score to 90
- Tag as "Tax Lien - Hot Lead"

#### Bankruptcy Filed
**Event:** Owner files bankruptcy
**Trigger:** Bankruptcy filing detected
**Auto-Tag:** `bankruptcy`, `financial-distress`, `legal`
**Note:** "Bankruptcy filed on [DATE]. Chapter [7/13]"
**Actions:**
- Update property status
- Set deal score to 95
- Tag as "Bankruptcy - Urgent"
- Monitor bankruptcy proceedings

---

### 7. PROBATE & ESTATE EVENTS

#### Probate Filed
**Event:** Estate/probate case filed
**Trigger:** Probate court filing
**Auto-Tag:** `probate`, `estate`, `motivated-heir`
**Note:** "Probate case filed on [DATE]. Estate value: $XXX,XXX"
**Actions:**
- Update property status
- Set deal score to 85
- Tag as "Probate Lead"
- Trigger "Probate Assistance" campaign
- Track probate case number

#### Inherited Property
**Event:** Property inherited
**Trigger:** Deed transfer via inheritance
**Auto-Tag:** `inherited`, `estate-sale`, `motivated`
**Note:** "Property inherited on [DATE] by [HEIR NAME]"
**Actions:**
- Update owner information
- Set deal score to 80
- Tag as "Inherited Property"
- Trigger "Heir Relief" campaign

#### Estate Sale
**Event:** Estate liquidation sale
**Trigger:** Estate sale listing or executor deed
**Auto-Tag:** `estate-sale`, `quick-sale`, `motivated`
**Note:** "Estate sale on [DATE]. Quick sale likely"
**Actions:**
- Set deal score to 90
- Tag as "Estate Sale - Hot"
- Trigger "Fast Close" campaign

---

### 8. CODE & VIOLATION EVENTS

#### Code Violation
**Event:** Building code violation issued
**Trigger:** Code violation filed
**Auto-Tag:** `code-violation`, `distress`, `repair-needed`
**Note:** "Code violation on [DATE]: [DESCRIPTION]"
**Actions:**
- Update property status
- Increase deal score by +10
- Tag as "Code Violation"

#### Condemnation Notice
**Event:** Property condemned
**Trigger:** Condemnation notice filed
**Auto-Tag:** `condemned`, `urgent`, `major-distress`
**Note:** "Property condemned on [DATE]. Reason: [REASON]"
**Actions:**
- Set deal score to 100
- Tag as "Condemned - Urgent"
- Alert: Immediate notification

---

### 9. EQUITY EVENTS

#### High Equity Detected
**Event:** Equity % > 50%
**Trigger:** Equity calculation update
**Auto-Tag:** `high-equity`, `equity-rich`
**Note:** "High equity property: X% equity ($XXX,XXX)"
**Actions:**
- Update equity metrics
- Increase deal score by +20
- Tag as "High Equity"

#### Free & Clear
**Event:** No mortgage/liens
**Trigger:** Loan payoff or zero liens
**Auto-Tag:** `free-clear`, `no-debt`, `cash-buyer-likely`
**Note:** "Property free & clear. No liens or mortgages"
**Actions:**
- Update equity status
- Increase deal score by +30
- Tag as "Free & Clear - Premium"

---

### 10. INVESTOR EVENTS

#### Portfolio Expansion
**Event:** Owner acquires additional property
**Trigger:** New property added to owner's portfolio
**Auto-Tag:** `active-investor`, `portfolio-growth`
**Note:** "Owner acquired property #X. Total portfolio: X properties"
**Actions:**
- Update portfolio count
- Tag as "Active Investor"
- Trigger "Investor Partnership" campaign

#### Portfolio Liquidation
**Event:** Owner sells multiple properties
**Trigger:** Multiple sales from same owner
**Auto-Tag:** `portfolio-liquidation`, `investor-exit`
**Note:** "Owner selling portfolio. X properties sold in Y months"
**Actions:**
- Tag as "Portfolio Sale"
- Trigger "Bulk Buy" campaign

---

## Event Processing Workflow

```
1. DETECT EVENT
   └─> RealEstateAPI webhook or daily batch job

2. VALIDATE EVENT
   └─> Confirm event is new/changed

3. UPDATE RECORD
   └─> Update property status, dates, amounts

4. ADD NOTE
   └─> Auto-generate note with event details

5. AUTO-TAG
   └─> Apply event-specific tags

6. CALCULATE DEAL SCORE
   └─> Recalculate score based on new event

7. TRIGGER ALERTS
   └─> Notify team if high-priority event

8. TRIGGER CAMPAIGNS
   └─> Launch automated outreach if applicable

9. LOG TO OBJECT STORAGE
   └─> Store event history in S3/Spaces

10. MONITOR
    └─> Track property ID for future events
```

---

## Implementation

### Database Schema

```typescript
interface PropertyEvent {
  id: string;
  propertyId: string;
  eventType: PropertyEventType;
  eventDate: Date;
  detectedAt: Date;

  // Event Data
  metadata: {
    previousValue?: any;
    newValue?: any;
    amount?: number;
    percentage?: number;
    [key: string]: any;
  };

  // Actions Taken
  tagsAdded: string[];
  noteGenerated: string;
  dealScoreChange: number;
  alertsSent: string[];
  campaignsTriggered: string[];

  // Source
  source: 'RealEstateAPI' | 'Manual' | 'Webhook';
  webhookId?: string;
}

enum PropertyEventType {
  // Listing
  PROPERTY_LISTED = 'property_listed',
  PROPERTY_DELISTED = 'property_delisted',
  PRICE_DROP = 'price_drop',

  // Sale
  PROPERTY_SOLD = 'property_sold',
  RECENT_SALE = 'recent_sale',

  // Distress
  PRE_FORECLOSURE = 'pre_foreclosure',
  FORECLOSURE = 'foreclosure',
  LIS_PENDENS = 'lis_pendens',
  AUCTION_SCHEDULED = 'auction_scheduled',

  // Vacancy
  VACANT = 'vacant',
  LONG_TERM_VACANT = 'long_term_vacant',

  // Ownership
  OWNER_CHANGE = 'owner_change',
  ABSENTEE_DETECTED = 'absentee_detected',
  OUT_OF_STATE = 'out_of_state',

  // Financial
  TAX_DELINQUENT = 'tax_delinquent',
  TAX_LIEN = 'tax_lien',
  BANKRUPTCY = 'bankruptcy',

  // Probate
  PROBATE_FILED = 'probate_filed',
  INHERITED = 'inherited',
  ESTATE_SALE = 'estate_sale',

  // Code
  CODE_VIOLATION = 'code_violation',
  CONDEMNED = 'condemned',

  // Equity
  HIGH_EQUITY = 'high_equity',
  FREE_CLEAR = 'free_clear',

  // Investor
  PORTFOLIO_EXPANSION = 'portfolio_expansion',
  PORTFOLIO_LIQUIDATION = 'portfolio_liquidation',
}
```

### Event Handler

```typescript
async function handlePropertyEvent(
  propertyId: string,
  eventType: PropertyEventType,
  eventData: any
) {
  // 1. Update Property Record
  const property = await updatePropertyStatus(propertyId, eventType, eventData);

  // 2. Generate Note
  const note = generateEventNote(eventType, eventData);
  await addPropertyNote(propertyId, note);

  // 3. Auto-Tag
  const tags = getEventTags(eventType);
  await addPropertyTags(propertyId, tags);

  // 4. Update Deal Score
  const scoreChange = calculateScoreChange(eventType, eventData);
  await updateDealScore(propertyId, scoreChange);

  // 5. Send Alerts
  if (isHighPriorityEvent(eventType)) {
    await sendTeamAlert(propertyId, eventType, eventData);
  }

  // 6. Trigger Campaigns
  const campaigns = getCampaignTriggers(eventType);
  for (const campaign of campaigns) {
    await triggerCampaign(propertyId, campaign);
  }

  // 7. Log Event
  await logEventToObjectStorage(propertyId, eventType, eventData);

  // 8. Store Event Record
  await createPropertyEvent({
    propertyId,
    eventType,
    eventDate: eventData.date,
    detectedAt: new Date(),
    metadata: eventData,
    tagsAdded: tags,
    noteGenerated: note,
    dealScoreChange: scoreChange,
    alertsSent: [],
    campaignsTriggered: campaigns,
    source: 'RealEstateAPI',
  });
}
```

---

## Daily Batch Job

```typescript
// Run daily at 6 AM
async function runDailyEventMonitoring() {
  // 1. Get all saved searches
  const savedSearches = await getSavedSearches();

  for (const search of savedSearches) {
    // 2. Check for updates
    const updates = await checkSavedSearchUpdates(search.id);

    // 3. Process each property update
    for (const update of updates) {
      // Detect what changed
      const events = detectPropertyEvents(update.previous, update.current);

      // Handle each event
      for (const event of events) {
        await handlePropertyEvent(
          update.propertyId,
          event.type,
          event.data
        );
      }
    }
  }
}
```

---

## API Webhooks

RealEstateAPI can send webhooks for real-time events:

```typescript
@Post('webhooks/realestate-events')
async handleRealEstateWebhook(@Body() webhook: RealEstateWebhook) {
  const { propertyId, eventType, eventData } = webhook;

  await handlePropertyEvent(propertyId, eventType, eventData);

  return { success: true };
}
```

---

## Object Storage Structure

```
s3://nextier-property-events/
├── searches/
│   └── {searchId}/
│       ├── initial-results.json
│       └── updates/
│           ├── 2025-01-15.json
│           ├── 2025-01-16.json
│           └── 2025-01-17.json
├── properties/
│   └── {propertyId}/
│       ├── history.json
│       ├── events/
│       │   ├── 2025-01-15-listed.json
│       │   ├── 2025-01-20-price-drop.json
│       │   └── 2025-02-01-sold.json
│       └── notes.json
└── campaigns/
    └── {campaignId}/
        ├── properties.json
        └── results.json
```

---

## Campaign Triggers

| Event Type | Campaign Triggered |
|-----------|-------------------|
| Pre-Foreclosure | "We Can Help - Foreclosure Assistance" |
| Price Drop | "Quick Close Offer" |
| Probate Filed | "Estate Relief Program" |
| Tax Delinquent | "Pay Taxes + Buy" |
| Vacant | "Vacant Property Cash Offer" |
| Delisted | "Failed Listing - We Pay Cash" |
| Inherited | "Heir Relief - Fast Cash" |

---

## Priority Levels

**URGENT** (Immediate alert + SMS):
- Condemned
- Foreclosure
- Auction Scheduled

**HIGH** (Email alert within 1 hour):
- Pre-Foreclosure
- Probate Filed
- Bankruptcy
- Tax Lien

**MEDIUM** (Daily digest):
- Price Drop
- Delisted
- Code Violation

**LOW** (Weekly summary):
- Absentee Detected
- High Equity
- Portfolio Expansion

---

## Next Steps

1. **Backend**: Create `PropertyEventService`
2. **Models**: Add `PropertyEvent` model
3. **Webhooks**: Set up RealEstateAPI webhook endpoint
4. **Batch Job**: Create daily monitoring cron
5. **Object Storage**: Configure S3/Spaces buckets
6. **Alerts**: Integrate with notification system
7. **Campaigns**: Link events to campaign triggers
8. **UI**: Build event timeline in property detail view

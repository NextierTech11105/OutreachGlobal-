# Property Events - Quick Reference

## Event Tags Lookup

| Event | Auto-Tags Applied | Deal Score Impact |
|-------|-------------------|-------------------|
| **Property Listed** | `listed`, `mls-active` | No change |
| **Property Delisted** | `delisted`, `off-market` | +5 (potential opportunity) |
| **Price Drop** | `price-drop`, `motivated-seller` | +15 |
| **Property Sold** | `sold`, `closed`, `recent-sale` | -10 (no longer available) |
| **Sold Last 12 Months** | `recent-acquisition`, `new-owner` | +5 |
| **Pre-Foreclosure** | `pre-foreclosure`, `distress`, `hot-lead` | +25 |
| **Foreclosure** | `foreclosure`, `bank-owned`, `urgent` | +30 |
| **Lis Pendens** | `lis-pendens`, `legal-issue`, `distress` | +10 |
| **Auction Scheduled** | `auction`, `foreclosure-auction`, `time-sensitive` | +35 |
| **Vacant** | `vacant`, `unoccupied`, `motivated-seller` | +10 |
| **Long-Term Vacant** | `long-term-vacant`, `abandoned`, `hot-opportunity` | +20 |
| **Owner Change** | `new-owner`, `ownership-change` | Reset |
| **Absentee Owner** | `absentee-owner`, `investor-likely` | +10 |
| **Out-of-State Owner** | `out-of-state`, `remote-owner` | +5 |
| **Tax Delinquent** | `tax-delinquent`, `financial-distress` | +15 |
| **Tax Lien** | `tax-lien`, `distress`, `motivated` | +25 |
| **Bankruptcy** | `bankruptcy`, `financial-distress`, `legal` | +30 |
| **Probate Filed** | `probate`, `estate`, `motivated-heir` | +20 |
| **Inherited Property** | `inherited`, `estate-sale`, `motivated` | +15 |
| **Estate Sale** | `estate-sale`, `quick-sale`, `motivated` | +25 |
| **Code Violation** | `code-violation`, `distress`, `repair-needed` | +10 |
| **Condemned** | `condemned`, `urgent`, `major-distress` | +40 |
| **High Equity** | `high-equity`, `equity-rich` | +20 |
| **Free & Clear** | `free-clear`, `no-debt`, `cash-buyer-likely` | +30 |
| **Portfolio Expansion** | `active-investor`, `portfolio-growth` | +5 |
| **Portfolio Liquidation** | `portfolio-liquidation`, `investor-exit` | +15 |

---

## Tag Categories

### Motivation Level
- `hot-lead` - Highest motivation
- `motivated-seller` - High motivation
- `motivated` - Moderate motivation

### Distress Signals
- `distress` - General distress
- `financial-distress` - Money problems
- `major-distress` - Severe distress
- `urgent` - Time-sensitive distress

### Property Status
- `listed` - On MLS
- `off-market` - Not listed
- `sold` - Recently sold
- `vacant` - Empty property
- `abandoned` - Long-term vacant

### Owner Type
- `absentee-owner` - Owner doesn't live there
- `out-of-state` - Owner in different state
- `new-owner` - Recently acquired
- `investor-likely` - Probably an investor
- `active-investor` - Confirmed investor

### Financial
- `high-equity` - 50%+ equity
- `free-clear` - No liens/mortgage
- `tax-delinquent` - Unpaid taxes
- `tax-lien` - Tax lien filed

### Legal
- `lis-pendens` - Lawsuit filed
- `legal-issue` - Legal problem
- `legal` - General legal category

### Foreclosure
- `pre-foreclosure` - Notice of Default
- `foreclosure` - Foreclosure filed
- `auction` - Scheduled for auction
- `bank-owned` - REO property

### Estate
- `probate` - Probate case
- `inherited` - Inherited property
- `estate-sale` - Estate liquidation
- `motivated-heir` - Heir wants to sell

### Other
- `code-violation` - Building code issue
- `condemned` - Property condemned
- `price-drop` - Price reduced
- `time-sensitive` - Act quickly

---

## Alert Priority Levels

### URGENT (Immediate SMS + Email)
```
- Condemned
- Foreclosure
- Auction Scheduled
```

### HIGH (Email within 1 hour)
```
- Pre-Foreclosure
- Probate Filed
- Bankruptcy
- Tax Lien
- Price Drop >10%
```

### MEDIUM (Daily digest email)
```
- Price Drop <10%
- Delisted
- Code Violation
- Vacant
```

### LOW (Weekly summary)
```
- Absentee Detected
- High Equity
- Portfolio Expansion
- Out-of-State Owner
```

---

## Campaign Trigger Matrix

| Event | Campaign Name | Message Theme |
|-------|--------------|---------------|
| Pre-Foreclosure | "Foreclosure Help" | We can buy before auction |
| Foreclosure | "Fast Close" | Cash offer in 48 hours |
| Price Drop | "Quick Offer" | We saw your price drop |
| Delisted | "Failed Listing" | We buy houses that didn't sell |
| Probate | "Estate Relief" | Help heirs liquidate estate |
| Inherited | "Heir Assistance" | We buy inherited properties |
| Vacant | "Vacant Property" | Don't let it sit empty |
| Tax Delinquent | "Tax Help" | We pay back taxes |
| Auction | "Pre-Auction Buy" | Cash before auction date |

---

## Integration Checklist

- [ ] Set up RealEstateAPI webhooks
- [ ] Create PropertyEvent model
- [ ] Build event handler service
- [ ] Configure S3/Spaces for event storage
- [ ] Set up daily batch monitoring job
- [ ] Link events to campaign triggers
- [ ] Build alert notification system
- [ ] Add event timeline to property detail UI
- [ ] Create event dashboard for team
- [ ] Set up event analytics/reporting

---

## Example Usage

### Detecting a Price Drop Event

```typescript
const previous = { listPrice: 500000 };
const current = { listPrice: 450000 };

const priceDrop = (previous.listPrice - current.listPrice) / previous.listPrice;

if (priceDrop >= 0.05) {
  // Price dropped 10%!
  await handlePropertyEvent(propertyId, PropertyEventType.PRICE_DROP, {
    previousPrice: previous.listPrice,
    newPrice: current.listPrice,
    percentage: priceDrop * 100,
    date: new Date(),
  });

  // This will:
  // 1. Add tags: "price-drop", "motivated-seller"
  // 2. Generate note: "Price reduced from $500,000 to $450,000 (-10%) on 2025-01-21"
  // 3. Increase deal score by +15
  // 4. Send HIGH priority alert
  // 5. Trigger "Quick Offer" campaign
}
```

---

## Monitoring Flow

```
Daily 6 AM:
1. Fetch all saved searches
2. Check each for updates (RealEstateAPI)
3. Compare previous snapshot to current
4. Detect changed fields
5. Trigger appropriate events
6. Update property records
7. Send alerts
8. Launch campaigns
9. Store event history in S3
```

---

## Data Retention

- **Property Events**: Kept forever (audit trail)
- **Daily Snapshots**: Kept for 90 days
- **Alert History**: Kept for 1 year
- **Campaign Results**: Kept forever
- **Object Storage**: Lifecycle to Glacier after 1 year

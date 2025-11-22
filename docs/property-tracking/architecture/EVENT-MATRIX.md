# Event Matrix - All Trackable Property Events

## Overview

The Event Matrix defines all trackable property events, their priorities, and campaign triggers.

## Event Categories

### 1. Ownership Events
| Event | Priority | Trigger Campaign | Description |
|-------|----------|------------------|-------------|
| `property_sold` | CRITICAL | No | Property sold to new owner |
| `ownership_change` | HIGH | Yes (SMS) | Ownership changed (non-sale) |
| `deed_transfer` | HIGH | Yes (SMS) | Deed transferred |
| `estate_deed` | CRITICAL | Yes (SMS) | **Estate/probate deed - HIGHLY MOTIVATED SELLER** |

**Estate Deed Detection:**
```typescript
if (newData.deedType?.toLowerCase().includes("estate") ||
    newData.deedType?.toLowerCase().includes("probate")) {
  event = "estate_deed"
  priority = "CRITICAL"
  message = "We specialize in helping families liquidate inherited properties..."
}
```

### 2. Listing Events
| Event | Priority | Trigger Campaign | Description |
|-------|----------|------------------|-------------|
| `mls_listed` | CRITICAL | Yes (SMS) | Property listed on MLS - ACTIVE SELLER |
| `mls_delisted` | HIGH | Yes (SMS) | Property delisted from MLS - FAILED LISTING |
| `price_reduction` | CRITICAL | Yes (SMS) | MLS price reduced - MOTIVATED SELLER |
| `price_increase` | LOW | No | MLS price increased |

### 3. Distress Events
| Event | Priority | Trigger Campaign | Description |
|-------|----------|------------------|-------------|
| `pre_foreclosure` | CRITICAL | Yes (SMS) | **Pre-foreclosure notice filed - URGENT DISTRESS** |
| `foreclosure_started` | CRITICAL | Yes (SMS) | Foreclosure proceedings started |
| `foreclosure_cleared` | MEDIUM | No | Foreclosure cleared/resolved |
| `lis_pendens_filed` | HIGH | Yes (SMS) | Lis Pendens filed - Legal action pending |
| `tax_lien_filed` | HIGH | Yes (SMS) | Tax lien filed - Financial distress |
| `bankruptcy_filed` | CRITICAL | Yes (SMS) | Bankruptcy filed - URGENT OPPORTUNITY |
| `auction_cancelled` | HIGH | Yes (SMS) | **Auction cancelled - Seller desperate** |

**Pre-Foreclosure Detection:**
```typescript
if (!oldData.preForeclosure && newData.preForeclosure) {
  event = "pre_foreclosure"
  priority = "CRITICAL"
  message = "We noticed your property received a pre-foreclosure notice.
             We can help you avoid foreclosure..."
}
```

**Auction Cancellation Detection:**
```typescript
if (oldData.auctionStatus === "scheduled" &&
    newData.auctionStatus === "cancelled") {
  event = "auction_cancelled"
  priority = "HIGH"
  message = "We saw your auction was cancelled. Are you still looking to sell?"
}
```

### 4. Occupancy Events
| Event | Priority | Trigger Campaign | Description |
|-------|----------|------------------|-------------|
| `became_vacant` | HIGH | Yes (SMS) | Property became vacant |
| `became_occupied` | LOW | No | Property became occupied |
| `became_absentee` | MEDIUM | Yes (Email) | Owner became absentee |

### 5. Value Events
| Event | Priority | Trigger Campaign | Description |
|-------|----------|------------------|-------------|
| `equity_increase` | MEDIUM | No | Equity increased by 10%+ |
| `equity_decrease` | HIGH | Yes (SMS) | Equity decreased by 10%+ - Potential distress |
| `high_equity_reached` | HIGH | Yes (Email) | High equity reached (60%+) |
| `value_increase` | LOW | No | Property value increased |
| `value_decrease` | MEDIUM | No | Property value decreased |

### 6. Portfolio Events
| Event | Priority | Trigger Campaign | Description |
|-------|----------|------------------|-------------|
| `investor_buying` | HIGH | Yes (Email) | Investor actively buying - Portfolio buyer |
| `investor_selling` | CRITICAL | Yes (SMS) | Investor actively selling - Portfolio liquidation |
| `portfolio_expanded` | MEDIUM | No | Investor portfolio expanded |
| `portfolio_shrunk` | HIGH | Yes (SMS) | Investor portfolio shrinking - Liquidating |

### 7. Time-Based Events
| Event | Priority | Trigger Campaign | Description |
|-------|----------|------------------|-------------|
| `long_term_owner` | MEDIUM | Yes (Direct Mail) | Owner held property 5+ years |
| `very_long_term_owner` | HIGH | Yes (Direct Mail) | Owner held property 10+ years - Retirement |
| `recent_purchase` | LOW | No | Property recently purchased (< 1 year) |

## Event Detection Logic

### Field Comparison
```typescript
function detectEvents(oldData: PropertyData, newData: PropertyData): Event[] {
  const events: Event[] = [];

  // Compare each trackable field
  if (oldData.deedType !== newData.deedType) {
    if (newData.deedType?.includes("estate")) {
      events.push("estate_deed");
    } else {
      events.push("deed_transfer");
    }
  }

  if (!oldData.preForeclosure && newData.preForeclosure) {
    events.push("pre_foreclosure");
  }

  if (oldData.auctionStatus !== newData.auctionStatus) {
    if (newData.auctionStatus === "cancelled") {
      events.push("auction_cancelled");
    }
  }

  return events;
}
```

## Campaign Triggers

### Critical Events (Immediate SMS)
```
estate_deed → "We help families liquidate inherited properties..."
pre_foreclosure → "Avoid foreclosure. Let's discuss your options..."
mls_listed → "I saw your listing. We can close faster than traditional buyers..."
price_reduction → "I noticed you reduced the price. Willing to negotiate?"
auction_cancelled → "Your auction was cancelled. Are you still looking to sell?"
```

### High Priority (Same-Day SMS)
```
lis_pendens_filed → "Legal action pending. We can help resolve this quickly..."
tax_lien_filed → "Tax issues? We buy properties with liens..."
became_vacant → "Property vacant? We buy as-is, no repairs needed..."
```

### Medium Priority (Email)
```
high_equity_reached → "You have significant equity. Time to cash out?"
became_absentee → "Managing remotely? We buy from out-of-state owners..."
```

## Business Rules

### 5-Year Ownership Minimum
```typescript
if (property.yearsOwned < 5) {
  return []; // Don't track or campaign on recently sold
}
```

### Event Prioritization
```typescript
const priorityOrder = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4
};

// Send highest priority event first
events.sort((a, b) =>
  priorityOrder[EVENT_MATRIX[a].priority] -
  priorityOrder[EVENT_MATRIX[b].priority]
);
```

## Tracking Frequency

- **Daily:** All saved searches run at midnight
- **Real-time:** (Future) Webhook integration for instant notifications
- **Weekly:** Portfolio summary reports

## Storage Format

### saved_search_results Table
```sql
{
  "property_id": "prop_123",
  "signals": {
    "preForeclosure": true,
    "auctionStatus": "cancelled",
    "deedType": "estate"
  },
  "signal_history": [
    {
      "date": "2025-01-15",
      "events": ["pre_foreclosure"],
      "signals": { "preForeclosure": true }
    },
    {
      "date": "2025-01-20",
      "events": ["auction_cancelled"],
      "signals": { "auctionStatus": "cancelled" }
    },
    {
      "date": "2025-01-22",
      "events": ["estate_deed"],
      "signals": { "deedType": "estate" }
    }
  ]
}
```

## Machine Learning Integration

### Feature Extraction
```typescript
const features = {
  // Event flags
  has_estate_deed: property.deedType?.includes("estate"),
  has_pre_foreclosure: property.preForeclosure,
  has_auction_cancelled: property.auctionStatus === "cancelled",

  // Time features
  days_since_last_sale: calculateDays(property.lastSaleDate),
  days_since_mortgage: calculateDays(property.lastMortgageDate),

  // Value features
  equity_percent: property.equityPercent,
  estimated_value: property.estimatedValue,

  // Event count
  total_events: property.signalHistory.length,
  critical_events: property.signalHistory.filter(e =>
    EVENT_MATRIX[e.event].priority === "CRITICAL"
  ).length
};
```

### Conversion Prediction
Use event history to predict campaign conversion:
- Properties with estate deeds: 15% conversion
- Pre-foreclosure + vacant: 25% conversion
- Auction cancelled + high equity: 20% conversion

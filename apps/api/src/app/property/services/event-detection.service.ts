import { Injectable, Logger } from "@nestjs/common";

/**
 * EVENT MATRIX - All trackable property events
 */
export enum PropertyEvent {
  // OWNERSHIP EVENTS
  PROPERTY_SOLD = "property_sold",
  OWNERSHIP_CHANGE = "ownership_change",
  DEED_TRANSFER = "deed_transfer",
  ESTATE_DEED = "estate_deed", // Probate/inheritance

  // LISTING EVENTS
  MLS_LISTED = "mls_listed",
  MLS_DELISTED = "mls_delisted",
  PRICE_REDUCTION = "price_reduction",
  PRICE_INCREASE = "price_increase",

  // DISTRESS EVENTS
  PRE_FORECLOSURE = "pre_foreclosure",
  FORECLOSURE_STARTED = "foreclosure_started",
  FORECLOSURE_CLEARED = "foreclosure_cleared",
  LIS_PENDENS_FILED = "lis_pendens_filed",
  TAX_LIEN_FILED = "tax_lien_filed",
  BANKRUPTCY_FILED = "bankruptcy_filed",

  // OCCUPANCY EVENTS
  BECAME_VACANT = "became_vacant",
  BECAME_OCCUPIED = "became_occupied",
  BECAME_ABSENTEE = "became_absentee",

  // VALUE EVENTS
  EQUITY_INCREASE = "equity_increase", // +10% equity
  EQUITY_DECREASE = "equity_decrease", // -10% equity
  HIGH_EQUITY_REACHED = "high_equity_reached", // 60%+ equity
  VALUE_INCREASE = "value_increase",
  VALUE_DECREASE = "value_decrease",

  // PORTFOLIO EVENTS
  INVESTOR_BUYING = "investor_buying", // Purchased property in last 12 months
  INVESTOR_SELLING = "investor_selling", // Sold property in last 12 months
  PORTFOLIO_EXPANDED = "portfolio_expanded",
  PORTFOLIO_SHRUNK = "portfolio_shrunk",

  // TIME-BASED EVENTS
  LONG_TERM_OWNER = "long_term_owner", // 5+ years
  VERY_LONG_TERM_OWNER = "very_long_term_owner", // 10+ years
  RECENT_PURCHASE = "recent_purchase", // < 1 year
}

/**
 * Event metadata for tracking and actions
 */
export interface EventMetadata {
  event: PropertyEvent;
  priority: "low" | "medium" | "high" | "critical";
  category: "ownership" | "listing" | "distress" | "occupancy" | "value" | "portfolio" | "time";
  triggerCampaign: boolean;
  campaignType?: "sms" | "email" | "call" | "direct_mail";
  description: string;
}

/**
 * EVENT MATRIX CONFIGURATION
 */
export const EVENT_MATRIX: Record<PropertyEvent, EventMetadata> = {
  // OWNERSHIP EVENTS
  [PropertyEvent.PROPERTY_SOLD]: {
    event: PropertyEvent.PROPERTY_SOLD,
    priority: "critical",
    category: "ownership",
    triggerCampaign: false, // Already sold, no campaign
    description: "Property sold to new owner",
  },
  [PropertyEvent.OWNERSHIP_CHANGE]: {
    event: PropertyEvent.OWNERSHIP_CHANGE,
    priority: "high",
    category: "ownership",
    triggerCampaign: true,
    campaignType: "sms",
    description: "Ownership changed (non-sale transfer)",
  },
  [PropertyEvent.DEED_TRANSFER]: {
    event: PropertyEvent.DEED_TRANSFER,
    priority: "high",
    category: "ownership",
    triggerCampaign: true,
    campaignType: "sms",
    description: "Deed transferred",
  },
  [PropertyEvent.ESTATE_DEED]: {
    event: PropertyEvent.ESTATE_DEED,
    priority: "critical",
    category: "ownership",
    triggerCampaign: true,
    campaignType: "sms",
    description: "Estate/probate deed transfer - HIGHLY MOTIVATED SELLER",
  },

  // LISTING EVENTS
  [PropertyEvent.MLS_LISTED]: {
    event: PropertyEvent.MLS_LISTED,
    priority: "critical",
    category: "listing",
    triggerCampaign: true,
    campaignType: "sms",
    description: "Property listed on MLS - ACTIVE SELLER",
  },
  [PropertyEvent.MLS_DELISTED]: {
    event: PropertyEvent.MLS_DELISTED,
    priority: "high",
    category: "listing",
    triggerCampaign: true,
    campaignType: "sms",
    description: "Property delisted from MLS - FAILED LISTING",
  },
  [PropertyEvent.PRICE_REDUCTION]: {
    event: PropertyEvent.PRICE_REDUCTION,
    priority: "critical",
    category: "listing",
    triggerCampaign: true,
    campaignType: "sms",
    description: "MLS price reduced - MOTIVATED SELLER",
  },
  [PropertyEvent.PRICE_INCREASE]: {
    event: PropertyEvent.PRICE_INCREASE,
    priority: "low",
    category: "listing",
    triggerCampaign: false,
    description: "MLS price increased",
  },

  // DISTRESS EVENTS
  [PropertyEvent.PRE_FORECLOSURE]: {
    event: PropertyEvent.PRE_FORECLOSURE,
    priority: "critical",
    category: "distress",
    triggerCampaign: true,
    campaignType: "sms",
    description: "Pre-foreclosure notice filed - URGENT DISTRESS",
  },
  [PropertyEvent.FORECLOSURE_STARTED]: {
    event: PropertyEvent.FORECLOSURE_STARTED,
    priority: "critical",
    category: "distress",
    triggerCampaign: true,
    campaignType: "sms",
    description: "Foreclosure proceedings started",
  },
  [PropertyEvent.FORECLOSURE_CLEARED]: {
    event: PropertyEvent.FORECLOSURE_CLEARED,
    priority: "medium",
    category: "distress",
    triggerCampaign: false,
    description: "Foreclosure cleared/resolved",
  },
  [PropertyEvent.LIS_PENDENS_FILED]: {
    event: PropertyEvent.LIS_PENDENS_FILED,
    priority: "high",
    category: "distress",
    triggerCampaign: true,
    campaignType: "sms",
    description: "Lis Pendens filed - Legal action pending",
  },
  [PropertyEvent.TAX_LIEN_FILED]: {
    event: PropertyEvent.TAX_LIEN_FILED,
    priority: "high",
    category: "distress",
    triggerCampaign: true,
    campaignType: "sms",
    description: "Tax lien filed - Financial distress",
  },
  [PropertyEvent.BANKRUPTCY_FILED]: {
    event: PropertyEvent.BANKRUPTCY_FILED,
    priority: "critical",
    category: "distress",
    triggerCampaign: true,
    campaignType: "sms",
    description: "Bankruptcy filed - URGENT OPPORTUNITY",
  },

  // OCCUPANCY EVENTS
  [PropertyEvent.BECAME_VACANT]: {
    event: PropertyEvent.BECAME_VACANT,
    priority: "high",
    category: "occupancy",
    triggerCampaign: true,
    campaignType: "sms",
    description: "Property became vacant",
  },
  [PropertyEvent.BECAME_OCCUPIED]: {
    event: PropertyEvent.BECAME_OCCUPIED,
    priority: "low",
    category: "occupancy",
    triggerCampaign: false,
    description: "Property became occupied",
  },
  [PropertyEvent.BECAME_ABSENTEE]: {
    event: PropertyEvent.BECAME_ABSENTEE,
    priority: "medium",
    category: "occupancy",
    triggerCampaign: true,
    campaignType: "email",
    description: "Owner became absentee",
  },

  // VALUE EVENTS
  [PropertyEvent.EQUITY_INCREASE]: {
    event: PropertyEvent.EQUITY_INCREASE,
    priority: "medium",
    category: "value",
    triggerCampaign: false,
    description: "Equity increased by 10%+",
  },
  [PropertyEvent.EQUITY_DECREASE]: {
    event: PropertyEvent.EQUITY_DECREASE,
    priority: "high",
    category: "value",
    triggerCampaign: true,
    campaignType: "sms",
    description: "Equity decreased by 10%+ - Potential distress",
  },
  [PropertyEvent.HIGH_EQUITY_REACHED]: {
    event: PropertyEvent.HIGH_EQUITY_REACHED,
    priority: "high",
    category: "value",
    triggerCampaign: true,
    campaignType: "email",
    description: "High equity reached (60%+)",
  },
  [PropertyEvent.VALUE_INCREASE]: {
    event: PropertyEvent.VALUE_INCREASE,
    priority: "low",
    category: "value",
    triggerCampaign: false,
    description: "Property value increased",
  },
  [PropertyEvent.VALUE_DECREASE]: {
    event: PropertyEvent.VALUE_DECREASE,
    priority: "medium",
    category: "value",
    triggerCampaign: false,
    description: "Property value decreased",
  },

  // PORTFOLIO EVENTS
  [PropertyEvent.INVESTOR_BUYING]: {
    event: PropertyEvent.INVESTOR_BUYING,
    priority: "high",
    category: "portfolio",
    triggerCampaign: true,
    campaignType: "email",
    description: "Investor actively buying - Portfolio buyer",
  },
  [PropertyEvent.INVESTOR_SELLING]: {
    event: PropertyEvent.INVESTOR_SELLING,
    priority: "critical",
    category: "portfolio",
    triggerCampaign: true,
    campaignType: "sms",
    description: "Investor actively selling - Portfolio liquidation",
  },
  [PropertyEvent.PORTFOLIO_EXPANDED]: {
    event: PropertyEvent.PORTFOLIO_EXPANDED,
    priority: "medium",
    category: "portfolio",
    triggerCampaign: false,
    description: "Investor portfolio expanded",
  },
  [PropertyEvent.PORTFOLIO_SHRUNK]: {
    event: PropertyEvent.PORTFOLIO_SHRUNK,
    priority: "high",
    category: "portfolio",
    triggerCampaign: true,
    campaignType: "sms",
    description: "Investor portfolio shrinking - Liquidating",
  },

  // TIME-BASED EVENTS
  [PropertyEvent.LONG_TERM_OWNER]: {
    event: PropertyEvent.LONG_TERM_OWNER,
    priority: "medium",
    category: "time",
    triggerCampaign: true,
    campaignType: "direct_mail",
    description: "Owner held property 5+ years",
  },
  [PropertyEvent.VERY_LONG_TERM_OWNER]: {
    event: PropertyEvent.VERY_LONG_TERM_OWNER,
    priority: "high",
    category: "time",
    triggerCampaign: true,
    campaignType: "direct_mail",
    description: "Owner held property 10+ years - Retirement/liquidation opportunity",
  },
  [PropertyEvent.RECENT_PURCHASE]: {
    event: PropertyEvent.RECENT_PURCHASE,
    priority: "low",
    category: "time",
    triggerCampaign: false,
    description: "Property recently purchased (< 1 year)",
  },
};

@Injectable()
export class EventDetectionService {
  private readonly logger = new Logger(EventDetectionService.name);

  /**
   * Detect events by comparing old vs new property data
   *
   * BUSINESS RULES:
   * - If property just sold (< 5 years ownership), DON'T pursue
   * - Only pursue properties with 5+ years ownership
   */
  detectEvents(
    oldData: Record<string, any>,
    newData: Record<string, any>,
  ): PropertyEvent[] {
    const events: PropertyEvent[] = [];

    // BUSINESS RULE: Skip if recently sold (< 5 years ownership)
    if (newData.yearsOwned && newData.yearsOwned < 5) {
      this.logger.log(
        `Property ${newData.propertyId} has < 5 years ownership. Skipping event detection.`,
      );
      return []; // Don't track or campaign on recently sold properties
    }

    // OWNERSHIP EVENTS
    if (oldData.ownerName !== newData.ownerName) {
      events.push(PropertyEvent.OWNERSHIP_CHANGE);

      // Check for estate deed
      if (newData.deedType?.toLowerCase().includes("estate") ||
          newData.deedType?.toLowerCase().includes("probate")) {
        events.push(PropertyEvent.ESTATE_DEED);
      }
    }

    if (oldData.lastSaleDate !== newData.lastSaleDate) {
      events.push(PropertyEvent.PROPERTY_SOLD);
    }

    // LISTING EVENTS
    if (!oldData.mlsListed && newData.mlsListed) {
      events.push(PropertyEvent.MLS_LISTED);
    }
    if (oldData.mlsListed && !newData.mlsListed) {
      events.push(PropertyEvent.MLS_DELISTED);
    }
    if (oldData.mlsPrice && newData.mlsPrice) {
      if (newData.mlsPrice < oldData.mlsPrice) {
        events.push(PropertyEvent.PRICE_REDUCTION);
      } else if (newData.mlsPrice > oldData.mlsPrice) {
        events.push(PropertyEvent.PRICE_INCREASE);
      }
    }

    // DISTRESS EVENTS
    if (!oldData.preForeclosure && newData.preForeclosure) {
      events.push(PropertyEvent.PRE_FORECLOSURE);
    }
    if (!oldData.foreclosure && newData.foreclosure) {
      events.push(PropertyEvent.FORECLOSURE_STARTED);
    }
    if (oldData.foreclosure && !newData.foreclosure) {
      events.push(PropertyEvent.FORECLOSURE_CLEARED);
    }
    if (!oldData.lisPendens && newData.lisPendens) {
      events.push(PropertyEvent.LIS_PENDENS_FILED);
    }
    if (!oldData.taxLien && newData.taxLien) {
      events.push(PropertyEvent.TAX_LIEN_FILED);
    }
    if (!oldData.bankruptcy && newData.bankruptcy) {
      events.push(PropertyEvent.BANKRUPTCY_FILED);
    }

    // OCCUPANCY EVENTS
    if (!oldData.vacant && newData.vacant) {
      events.push(PropertyEvent.BECAME_VACANT);
    }
    if (oldData.vacant && !newData.vacant) {
      events.push(PropertyEvent.BECAME_OCCUPIED);
    }
    if (!oldData.absenteeOwner && newData.absenteeOwner) {
      events.push(PropertyEvent.BECAME_ABSENTEE);
    }

    // VALUE EVENTS
    if (oldData.equityPercent && newData.equityPercent) {
      const equityChange = newData.equityPercent - oldData.equityPercent;
      if (equityChange >= 10) {
        events.push(PropertyEvent.EQUITY_INCREASE);
      } else if (equityChange <= -10) {
        events.push(PropertyEvent.EQUITY_DECREASE);
      }

      if (oldData.equityPercent < 60 && newData.equityPercent >= 60) {
        events.push(PropertyEvent.HIGH_EQUITY_REACHED);
      }
    }

    // PORTFOLIO EVENTS
    if (oldData.propertiesOwned && newData.propertiesOwned) {
      if (newData.propertiesOwned > oldData.propertiesOwned) {
        events.push(PropertyEvent.PORTFOLIO_EXPANDED);

        if (newData.portfolioPurchasedLast12 && newData.portfolioPurchasedLast12 > 0) {
          events.push(PropertyEvent.INVESTOR_BUYING);
        }
      } else if (newData.propertiesOwned < oldData.propertiesOwned) {
        events.push(PropertyEvent.PORTFOLIO_SHRUNK);
        events.push(PropertyEvent.INVESTOR_SELLING);
      }
    }

    // TIME-BASED EVENTS
    if (newData.yearsOwned >= 5 && (!oldData.yearsOwned || oldData.yearsOwned < 5)) {
      events.push(PropertyEvent.LONG_TERM_OWNER);
    }
    if (newData.yearsOwned >= 10 && (!oldData.yearsOwned || oldData.yearsOwned < 10)) {
      events.push(PropertyEvent.VERY_LONG_TERM_OWNER);
    }

    this.logger.log(`Detected ${events.length} events for property ${newData.propertyId}: ${events.join(", ")}`);
    return events;
  }

  /**
   * Get event metadata for a specific event
   */
  getEventMetadata(event: PropertyEvent): EventMetadata {
    return EVENT_MATRIX[event];
  }

  /**
   * Filter events by campaign trigger
   */
  getTriggeredEvents(events: PropertyEvent[]): PropertyEvent[] {
    return events.filter((event) => EVENT_MATRIX[event].triggerCampaign);
  }

  /**
   * Get critical events (highest priority)
   */
  getCriticalEvents(events: PropertyEvent[]): PropertyEvent[] {
    return events.filter((event) => EVENT_MATRIX[event].priority === "critical");
  }

  /**
   * Get events by category
   */
  getEventsByCategory(
    events: PropertyEvent[],
    category: EventMetadata["category"],
  ): PropertyEvent[] {
    return events.filter((event) => EVENT_MATRIX[event].category === category);
  }
}

import { Injectable } from "@nestjs/common";

/**
 * Lead Intelligence Service
 * Automatically tags, scores, and flags leads based on property data and contact quality
 */
@Injectable()
export class LeadIntelligenceService {
  /**
   * Auto-tag leads based on property characteristics
   */
  autoTag(propertyData: any, contactData: any): string[] {
    const tags: string[] = [];

    // ===== INVESTOR TAGS =====
    const propertiesOwned = propertyData.linkedProperties?.totalOwned || 0;
    if (propertiesOwned >= 10) {
      tags.push("Major Investor");
    } else if (propertiesOwned >= 5) {
      tags.push("Investor");
    } else if (propertiesOwned >= 2) {
      tags.push("Small Portfolio");
    }

    // ===== ACTIVE BUYER TAG =====
    const purchasedLast12 = propertyData.linkedProperties?.portfolioPurchasedLast12 || 0;
    if (purchasedLast12 >= 3) {
      tags.push("Very Active Buyer");
    } else if (purchasedLast12 >= 1) {
      tags.push("Active Buyer");
    }

    // ===== EQUITY TAGS =====
    const equityPercent = propertyData.equityPercent || 0;
    const estimatedEquity = propertyData.estimatedEquity || 0;

    if (equityPercent >= 80 || propertyData.freeClear) {
      tags.push("Free & Clear");
    } else if (equityPercent >= 50) {
      tags.push("High Equity");
    } else if (equityPercent >= 25) {
      tags.push("Moderate Equity");
    } else if (equityPercent < 0) {
      tags.push("Negative Equity");
    }

    if (estimatedEquity >= 1000000) {
      tags.push("$1M+ Equity");
    } else if (estimatedEquity >= 500000) {
      tags.push("$500K+ Equity");
    }

    // ===== PORTFOLIO VALUE TAGS =====
    const portfolioValue = propertyData.linkedProperties?.totalValue || 0;
    if (portfolioValue >= 10000000) {
      tags.push("$10M+ Portfolio");
    } else if (portfolioValue >= 5000000) {
      tags.push("$5M+ Portfolio");
    } else if (portfolioValue >= 1000000) {
      tags.push("$1M+ Portfolio");
    }

    // ===== PROPERTY VALUE TAGS =====
    const propertyValue = propertyData.estimatedValue || propertyData.assessedValue || 0;
    if (propertyValue >= 5000000) {
      tags.push("$5M+ Property");
    } else if (propertyValue >= 1000000) {
      tags.push("$1M+ Property");
    } else if (propertyValue >= 500000) {
      tags.push("$500K+ Property");
    }

    // ===== DISTRESS TAGS =====
    if (propertyData.preForeclosure) {
      tags.push("Pre-Foreclosure");
    }
    if (propertyData.foreclosure) {
      tags.push("Foreclosure");
    }
    if (propertyData.vacant) {
      tags.push("Vacant");
    }
    if (propertyData.taxLien) {
      tags.push("Tax Lien");
    }
    if (propertyData.preForeclosure || propertyData.foreclosure || propertyData.vacant) {
      tags.push("Distressed");
    }

    // ===== OWNER TYPE TAGS =====
    if (propertyData.absenteeOwner) {
      tags.push("Absentee Owner");
    }
    if (propertyData.outOfStateAbsenteeOwner) {
      tags.push("Out of State");
    }
    if (propertyData.corporateOwned) {
      tags.push("Corporate Owned");
    }

    // ===== PROPERTY TYPE TAGS =====
    if (propertyData.MFH5plus) {
      tags.push("Multi-Family 5+");
    } else if (propertyData.MFH2to4) {
      tags.push("Multi-Family 2-4");
    }

    const propertyType = propertyData.propertyType;
    if (propertyType === "SFR") tags.push("Single Family");
    if (propertyType === "CONDO") tags.push("Condo");
    if (propertyType === "MOBILE") tags.push("Mobile Home");
    if (propertyType === "LAND") tags.push("Land");

    // ===== TRANSACTION TAGS =====
    if (propertyData.cashBuyer) {
      tags.push("Cash Buyer");
    }
    if (propertyData.investorBuyer) {
      tags.push("Investor Purchase");
    }
    if (propertyData.assumable) {
      tags.push("Assumable Mortgage");
    }

    // ===== OWNERSHIP DURATION TAGS =====
    const yearsOwned = propertyData.ownerInfo?.ownershipLength || 0;
    if (yearsOwned >= 20) {
      tags.push("20+ Years Owned");
    } else if (yearsOwned >= 10) {
      tags.push("10+ Years Owned");
    } else if (yearsOwned <= 2) {
      tags.push("Recent Purchase");
    }

    // ===== CONTACT QUALITY TAGS =====
    if (contactData?.verifiedEmail) {
      tags.push("Verified Email");
    }
    if (contactData?.verifiedPhone) {
      tags.push("Verified Phone");
    }
    if (contactData?.hasMultiplePhones) {
      tags.push("Multiple Contacts");
    }

    return tags;
  }

  /**
   * Auto-score leads (0-100) based on opportunity quality
   */
  autoScore(propertyData: any, contactData: any): number {
    let score = 0;

    // ===== CONTACT QUALITY (0-25 points) =====
    if (contactData?.verifiedEmail) score += 10;
    if (contactData?.verifiedPhone) score += 10;
    if (contactData?.hasMultiplePhones) score += 5;

    // ===== EQUITY OPPORTUNITY (0-30 points) =====
    const equityPercent = propertyData.equityPercent || 0;
    if (equityPercent >= 80 || propertyData.freeClear) {
      score += 30; // Maximum equity score
    } else if (equityPercent >= 50) {
      score += 20;
    } else if (equityPercent >= 25) {
      score += 10;
    }

    // ===== PORTFOLIO SIZE (0-20 points) =====
    const propertiesOwned = propertyData.linkedProperties?.totalOwned || 0;
    if (propertiesOwned >= 10) {
      score += 20;
    } else if (propertiesOwned >= 5) {
      score += 15;
    } else if (propertiesOwned >= 2) {
      score += 10;
    }

    // ===== ACTIVE BUYER BONUS (0-15 points) =====
    const purchasedLast12 = propertyData.linkedProperties?.portfolioPurchasedLast12 || 0;
    if (purchasedLast12 >= 3) {
      score += 15;
    } else if (purchasedLast12 >= 1) {
      score += 10;
    }

    // ===== DISTRESS SIGNALS (0-20 points) =====
    if (propertyData.preForeclosure) score += 15;
    if (propertyData.foreclosure) score += 20;
    if (propertyData.vacant) score += 10;
    if (propertyData.taxLien) score += 10;

    // ===== PROPERTY VALUE (0-10 points) =====
    const propertyValue = propertyData.estimatedValue || propertyData.assessedValue || 0;
    if (propertyValue >= 5000000) {
      score += 10;
    } else if (propertyValue >= 1000000) {
      score += 8;
    } else if (propertyValue >= 500000) {
      score += 5;
    }

    // ===== OWNER TYPE BONUS (0-10 points) =====
    if (propertyData.absenteeOwner) score += 5;
    if (propertyData.outOfStateAbsenteeOwner) score += 8;
    if (propertyData.cashBuyer) score += 5;

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Auto-flag leads based on data quality and opportunity indicators
   */
  autoFlag(propertyData: any, contactData: any): Record<string, boolean> {
    const flags: Record<string, boolean> = {
      // Contact Quality Flags
      verifiedEmail: !!contactData?.verifiedEmail,
      verifiedPhone: !!contactData?.verifiedPhone,
      doNotCall: false, // User sets this manually
      emailBounced: false, // Email validation sets this

      // Lead Quality Flags (score-based)
      hotLead: false, // Will be set based on final score
      highValue: false,
      quickClose: false,

      // Property Flags
      hasEquity: (propertyData.equityPercent || 0) > 0,
      highEquity: (propertyData.equityPercent || 0) >= 50,
      freeClear: !!propertyData.freeClear,
      isInvestor: (propertyData.linkedProperties?.totalOwned || 0) >= 2,
      isActiveBuyer: (propertyData.linkedProperties?.portfolioPurchasedLast12 || 0) >= 1,

      // Opportunity Flags
      distressed: !!(propertyData.preForeclosure || propertyData.foreclosure || propertyData.vacant),
      preForeclosure: !!propertyData.preForeclosure,
      vacant: !!propertyData.vacant,
      absenteeOwner: !!propertyData.absenteeOwner,

      // Engagement Flags (set by user/system later)
      responded: false,
      scheduled: false,
      converted: false,
    };

    // Calculate derived flags
    const portfolioValue = propertyData.linkedProperties?.totalValue || 0;
    const propertyValue = propertyData.estimatedValue || propertyData.assessedValue || 0;

    flags.highValue = portfolioValue >= 5000000 || propertyValue >= 1000000;
    flags.quickClose = flags.distressed && flags.hasEquity && contactData?.verifiedPhone;

    // Hot lead if multiple positive indicators
    const positiveIndicators = [
      contactData?.verifiedEmail,
      contactData?.verifiedPhone,
      flags.highEquity,
      flags.isInvestor,
      flags.isActiveBuyer,
      flags.distressed,
      flags.highValue,
    ].filter(Boolean).length;

    flags.hotLead = positiveIndicators >= 4;

    return flags;
  }

  /**
   * Determine lead status based on property data
   */
  autoStatus(propertyData: any, contactData: any): string {
    // Priority-based status assignment
    if (propertyData.foreclosure) {
      return "urgent";
    }

    if (propertyData.preForeclosure || propertyData.vacant) {
      return "hot";
    }

    const propertiesOwned = propertyData.linkedProperties?.totalOwned || 0;
    const purchasedLast12 = propertyData.linkedProperties?.portfolioPurchasedLast12 || 0;

    if (propertiesOwned >= 5 || purchasedLast12 >= 2) {
      return "qualified";
    }

    if (contactData?.verifiedEmail && contactData?.verifiedPhone) {
      return "warm";
    }

    return "new";
  }
}

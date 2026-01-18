import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { plansTable } from "@/database/schema-alias";
import { sql } from "drizzle-orm";

@Injectable()
export class BillingSeeder {
  private readonly logger = new Logger(BillingSeeder.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  async run() {
    this.logger.log("Running billing seeder...");

    // Check if plans table exists and has data
    try {
      const existingPlans = await this.db.query.plans.findMany();
      if (existingPlans.length > 0) {
        this.logger.log(`Plans table already has ${existingPlans.length} plans, skipping seed`);
        return;
      }
    } catch (error: any) {
      // Table might not exist, try to create it via raw SQL
      this.logger.warn("Plans table check failed, attempting to create...");
      await this.createPlansTable();
    }

    // Seed default plans
    await this.seedPlans();
    this.logger.log("Billing seeder completed");
  }

  private async createPlansTable() {
    try {
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS plans (
          id VARCHAR(26) PRIMARY KEY,
          slug VARCHAR NOT NULL UNIQUE,
          name VARCHAR NOT NULL,
          description VARCHAR,
          price_monthly INTEGER NOT NULL,
          price_yearly INTEGER NOT NULL,
          setup_fee INTEGER DEFAULT 0,
          limits JSONB,
          features JSONB,
          is_active BOOLEAN DEFAULT true,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      this.logger.log("Plans table created");
    } catch (error: any) {
      this.logger.error("Failed to create plans table:", error.message);
      throw error;
    }
  }

  private async seedPlans() {
    const defaultPlans = [
      {
        slug: "starter",
        name: "Starter",
        priceMonthly: 9900,
        priceYearly: 99000,
        limits: {
          users: 3,
          leads: 5000,
          searches: 500,
          sms: 1000,
          skipTraces: 100,
          apiAccess: false,
          powerDialer: true,
          whiteLabel: false,
        },
        features: [
          { text: "Up to 5,000 leads", included: true },
          { text: "1,000 SMS/month", included: true },
          { text: "Power Dialer", included: true },
          { text: "3 Team Members", included: true },
        ],
        isActive: true,
        sortOrder: 1,
      },
      {
        slug: "pro",
        name: "Pro",
        priceMonthly: 19900,
        priceYearly: 199000,
        limits: {
          users: 10,
          leads: 25000,
          searches: 2500,
          sms: 5000,
          skipTraces: 500,
          apiAccess: true,
          powerDialer: true,
          whiteLabel: false,
        },
        features: [
          { text: "Up to 25,000 leads", included: true },
          { text: "5,000 SMS/month", included: true },
          { text: "Power Dialer", included: true },
          { text: "10 Team Members", included: true },
          { text: "API Access", included: true },
        ],
        isActive: true,
        sortOrder: 2,
      },
      {
        slug: "agency",
        name: "Agency",
        priceMonthly: 49900,
        priceYearly: 499000,
        limits: {
          users: 50,
          leads: 100000,
          searches: 10000,
          sms: 25000,
          skipTraces: 2500,
          apiAccess: true,
          powerDialer: true,
          whiteLabel: true,
        },
        features: [
          { text: "Up to 100,000 leads", included: true },
          { text: "25,000 SMS/month", included: true },
          { text: "Power Dialer", included: true },
          { text: "50 Team Members", included: true },
          { text: "API Access", included: true },
          { text: "White Label", included: true },
        ],
        isActive: true,
        sortOrder: 3,
      },
      // ═══════════════════════════════════════════════════════════════════════════
      // DIGITAL WORKFORCE - AI Agent Automation Package
      // ═══════════════════════════════════════════════════════════════════════════
      {
        slug: "digital-workforce",
        name: "Digital Workforce",
        priceMonthly: 99900, // $999/mo
        priceYearly: 999000, // $9,990/yr (2 months free)
        limits: {
          users: 100,
          leads: 500000,
          searches: 50000,
          sms: 100000, // 100K SMS/month
          skipTraces: 10000, // 10K enrichments/month
          apiAccess: true,
          powerDialer: true,
          whiteLabel: true,
          // AI Workers
          aiWorkers: ["GIANNA", "CATHY", "SABRINA", "NEVA"],
          workerAutonomy: true,
          leadScoringAI: true,
          // Lead Gen Pipeline
          tracerfyAccess: true, // $0.02/lead skip trace
          trestleScoring: true, // $0.03/lead contactability
          signalHouse10DLC: true, // 10DLC compliant SMS
          campaignBuilder: true,
          // Business Intelligence
          sectorBuckets: true,
          dealSourcing: true,
          businessBrokering: true,
        },
        features: [
          { text: "AI Workforce (GIANNA, CATHY, SABRINA)", included: true },
          { text: "500K leads/month capacity", included: true },
          { text: "100K SMS/month", included: true },
          { text: "10K enrichments/month ($0.05/lead)", included: true },
          { text: "10DLC Compliant SMS", included: true },
          { text: "Trestle Contactability Scoring", included: true },
          { text: "Campaign Builder + Templates", included: true },
          { text: "Sector Buckets (Lead Gen)", included: true },
          { text: "Business Brokering Module", included: true },
          { text: "Full White Label", included: true },
          { text: "Dedicated Support", included: true },
        ],
        isActive: true,
        sortOrder: 4,
      },
      {
        slug: "enterprise",
        name: "Enterprise",
        priceMonthly: 0, // Custom pricing
        priceYearly: 0,
        limits: {
          users: -1, // Unlimited
          leads: -1,
          searches: -1,
          sms: -1,
          skipTraces: -1,
          apiAccess: true,
          powerDialer: true,
          whiteLabel: true,
          aiWorkers: ["GIANNA", "CATHY", "SABRINA", "NEVA", "CUSTOM"],
          workerAutonomy: true,
          leadScoringAI: true,
          tracerfyAccess: true,
          trestleScoring: true,
          signalHouse10DLC: true,
          campaignBuilder: true,
          sectorBuckets: true,
          dealSourcing: true,
          businessBrokering: true,
          customAgents: true,
          dedicatedInfra: true,
        },
        features: [
          { text: "Everything in Digital Workforce", included: true },
          { text: "Unlimited leads & SMS", included: true },
          { text: "Custom AI Agents", included: true },
          { text: "Dedicated Infrastructure", included: true },
          { text: "SLA & Priority Support", included: true },
          { text: "Custom Integrations", included: true },
        ],
        isActive: true,
        sortOrder: 5,
      },
    ];

    for (const plan of defaultPlans) {
      try {
        await this.db.insert(plansTable).values(plan).onConflictDoNothing();
        this.logger.log(`Seeded plan: ${plan.name}`);
      } catch (error: any) {
        this.logger.error(`Failed to seed plan ${plan.name}:`, error.message);
      }
    }
  }
}

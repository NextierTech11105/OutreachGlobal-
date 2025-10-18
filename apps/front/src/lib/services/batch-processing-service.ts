import { db } from "@/lib/db";
import { batchJobs, batchJobItems, leads, properties } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getErrorMessage } from "@/lib/monitoring";
import { twilioService } from "./twilio-service";
import { realEstateApi } from "./real-estate-api";

// Batch size for processing items
const BATCH_SIZE = 50;

class BatchProcessingService {
  /**
   * Process a CSV import batch job
   */
  async processCsvImportBatch(jobId: number) {
    const job = await db.query.batchJobs.findFirst({
      where: eq(batchJobs.id, jobId),
    });

    if (!job) {
      throw new Error(`Batch job ${jobId} not found`);
    }

    // Get all items for this job
    const items = await db.query.batchJobItems.findMany({
      where: eq(batchJobItems.batchJobId, jobId),
    });

    if (items.length === 0) {
      return { processed: 0, message: "No items to process" };
    }

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    // Process in batches to avoid memory issues
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batchItems = items.slice(i, i + BATCH_SIZE);

      // Process each item in the batch
      for (const item of batchItems) {
        try {
          if (item.status === "completed" || item.status === "failed") {
            skipped++;
            continue;
          }

          // Update item status to processing
          await db
            .update(batchJobItems)
            .set({
              status: "processing",
              startedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(batchJobItems.id, item.id));

          // Parse the data
          const data = JSON.parse(item.data || "{}");

          // Process based on the target entity
          if (job.targetEntity === "leads") {
            await this.processLeadImport(data);
          } else if (job.targetEntity === "properties") {
            await this.processPropertyImport(data);
          } else {
            throw new Error(`Unsupported target entity: ${job.targetEntity}`);
          }

          // Update item status to completed
          await db
            .update(batchJobItems)
            .set({
              status: "completed",
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(batchJobItems.id, item.id));

          processed++;
        } catch (error) {
          console.error(`Error processing item ${item.id}:`, error);

          // Update item status to failed
          await db
            .update(batchJobItems)
            .set({
              status: "failed",
              completedAt: new Date(),
              updatedAt: new Date(),
              error: getErrorMessage(error),
            })
            .where(eq(batchJobItems.id, item.id));

          failed++;
        }
      }
    }

    return {
      processed,
      failed,
      skipped,
      total: items.length,
    };
  }

  /**
   * Process a lead verification batch job
   */
  async processLeadVerificationBatch(jobId: number) {
    const job = await db.query.batchJobs.findFirst({
      where: eq(batchJobs.id, jobId),
    });

    if (!job) {
      throw new Error(`Batch job ${jobId} not found`);
    }

    // Get all items for this job
    const items = await db.query.batchJobItems.findMany({
      where: eq(batchJobItems.batchJobId, jobId),
    });

    if (items.length === 0) {
      return { processed: 0, message: "No items to process" };
    }

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    // Process in batches to avoid memory issues
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batchItems = items.slice(i, i + BATCH_SIZE);

      // Process each item in the batch
      for (const item of batchItems) {
        try {
          if (item.status === "completed" || item.status === "failed") {
            skipped++;
            continue;
          }

          // Update item status to processing
          await db
            .update(batchJobItems)
            .set({
              status: "processing",
              startedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(batchJobItems.id, item.id));

          // Parse the data
          const data = JSON.parse(item.data || "{}");

          // Verify lead data using external service
          const verificationResult = await realEstateApi.verifyLeadData(data);

          // Update the lead with verification results
          if (data.leadId) {
            await db
              .update(leads)
              .set({
                verificationStatus: verificationResult.status,
                verificationData: JSON.stringify(verificationResult),
                updatedAt: new Date(),
              })
              .where(eq(leads.id, data.leadId));
          }

          // Update item status to completed
          await db
            .update(batchJobItems)
            .set({
              status: "completed",
              completedAt: new Date(),
              updatedAt: new Date(),
              result: JSON.stringify(verificationResult),
            })
            .where(eq(batchJobItems.id, item.id));

          processed++;
        } catch (error) {
          console.error(`Error processing item ${item.id}:`, error);

          // Update item status to failed
          await db
            .update(batchJobItems)
            .set({
              status: "failed",
              completedAt: new Date(),
              updatedAt: new Date(),
              error: getErrorMessage(error),
            })
            .where(eq(batchJobItems.id, item.id));

          failed++;
        }
      }
    }

    return {
      processed,
      failed,
      skipped,
      total: items.length,
    };
  }

  /**
   * Process a campaign send batch job
   */
  async processCampaignSendBatch(jobId: number) {
    const job = await db.query.batchJobs.findFirst({
      where: eq(batchJobs.id, jobId),
    });

    if (!job) {
      throw new Error(`Batch job ${jobId} not found`);
    }

    // Get all items for this job
    const items = await db.query.batchJobItems.findMany({
      where: eq(batchJobItems.batchJobId, jobId),
    });

    if (items.length === 0) {
      return { processed: 0, message: "No items to process" };
    }

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    // Process in batches to avoid memory issues
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batchItems = items.slice(i, i + BATCH_SIZE);

      // Process each item in the batch
      for (const item of batchItems) {
        try {
          if (item.status === "completed" || item.status === "failed") {
            skipped++;
            continue;
          }

          // Update item status to processing
          await db
            .update(batchJobItems)
            .set({
              status: "processing",
              startedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(batchJobItems.id, item.id));

          // Parse the data
          const data = JSON.parse(item.data || "{}");

          // Send message based on channel type
          let result;
          if (data.channel === "sms") {
            result = await twilioService.sendSMS(data.to, data.message);
          } else if (data.channel === "voice") {
            result = await twilioService.makeCall(data.to, data.from);
          } else {
            throw new Error(`Unsupported channel: ${data.channel}`);
          }

          // Update item status to completed
          await db
            .update(batchJobItems)
            .set({
              status: "completed",
              completedAt: new Date(),
              updatedAt: new Date(),
              result: JSON.stringify(result),
            })
            .where(eq(batchJobItems.id, item.id));

          processed++;
        } catch (error) {
          console.error(`Error processing item ${item.id}:`, error);

          // Update item status to failed
          await db
            .update(batchJobItems)
            .set({
              status: "failed",
              completedAt: new Date(),
              updatedAt: new Date(),
              error: getErrorMessage(error),
            })
            .where(eq(batchJobItems.id, item.id));

          failed++;
        }
      }
    }

    return {
      processed,
      failed,
      skipped,
      total: items.length,
    };
  }

  /**
   * Process a data enrichment batch job
   */
  async processDataEnrichmentBatch(jobId: number) {
    const job = await db.query.batchJobs.findFirst({
      where: eq(batchJobs.id, jobId),
    });

    if (!job) {
      throw new Error(`Batch job ${jobId} not found`);
    }

    // Get all items for this job
    const items = await db.query.batchJobItems.findMany({
      where: eq(batchJobItems.batchJobId, jobId),
    });

    if (items.length === 0) {
      return { processed: 0, message: "No items to process" };
    }

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    // Process in batches to avoid memory issues
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batchItems = items.slice(i, i + BATCH_SIZE);

      // Process each item in the batch
      for (const item of batchItems) {
        try {
          if (item.status === "completed" || item.status === "failed") {
            skipped++;
            continue;
          }

          // Update item status to processing
          await db
            .update(batchJobItems)
            .set({
              status: "processing",
              startedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(batchJobItems.id, item.id));

          // Parse the data
          const data = JSON.parse(item.data || "{}");

          // Enrich data based on the target entity
          let enrichmentResult;
          if (job.targetEntity === "leads") {
            enrichmentResult = await realEstateApi.enrichLeadData(data);

            // Update the lead with enriched data
            if (data.leadId) {
              await db
                .update(leads)
                .set({
                  enrichmentStatus: "completed",
                  enrichmentData: JSON.stringify(enrichmentResult),
                  updatedAt: new Date(),
                })
                .where(eq(leads.id, data.leadId));
            }
          } else if (job.targetEntity === "properties") {
            enrichmentResult = await realEstateApi.enrichPropertyData(data);

            // Update the property with enriched data
            if (data.propertyId) {
              await db
                .update(properties)
                .set({
                  enrichmentStatus: "completed",
                  enrichmentData: JSON.stringify(enrichmentResult),
                  updatedAt: new Date(),
                })
                .where(eq(properties.id, data.propertyId));
            }
          } else {
            throw new Error(`Unsupported target entity: ${job.targetEntity}`);
          }

          // Update item status to completed
          await db
            .update(batchJobItems)
            .set({
              status: "completed",
              completedAt: new Date(),
              updatedAt: new Date(),
              result: JSON.stringify(enrichmentResult),
            })
            .where(eq(batchJobItems.id, item.id));

          processed++;
        } catch (error) {
          console.error(`Error processing item ${item.id}:`, error);

          // Update item status to failed
          await db
            .update(batchJobItems)
            .set({
              status: "failed",
              completedAt: new Date(),
              updatedAt: new Date(),
              error: getErrorMessage(error),
            })
            .where(eq(batchJobItems.id, item.id));

          failed++;
        }
      }
    }

    return {
      processed,
      failed,
      skipped,
      total: items.length,
    };
  }

  /**
   * Process a lead import
   */
  private async processLeadImport(data: any) {
    // Validate required fields
    if (!data.email && !data.phone) {
      throw new Error("Either email or phone is required for lead import");
    }

    // Check if lead already exists
    const existingLead = await db.query.leads.findFirst({
      where: or(
        data.email ? eq(leads.email, data.email) : undefined,
        data.phone ? eq(leads.phone, data.phone) : undefined,
      ),
    });

    if (existingLead) {
      // Update existing lead
      await db
        .update(leads)
        .set({
          firstName: data.firstName || existingLead.firstName,
          lastName: data.lastName || existingLead.lastName,
          email: data.email || existingLead.email,
          phone: data.phone || existingLead.phone,
          address: data.address || existingLead.address,
          city: data.city || existingLead.city,
          state: data.state || existingLead.state,
          zipCode: data.zipCode || existingLead.zipCode,
          source: data.source || existingLead.source,
          status: data.status || existingLead.status,
          tags: data.tags || existingLead.tags,
          notes: data.notes
            ? `${existingLead.notes || ""}\n${data.notes}`
            : existingLead.notes,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, existingLead.id));

      return { action: "updated", leadId: existingLead.id };
    } else {
      // Create new lead
      const result = await db.insert(leads).values({
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        source: data.source || "csv_import",
        status: data.status || "new",
        tags: data.tags || null,
        notes: data.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { action: "created", leadId: result.insertId };
    }
  }

  /**
   * Process a property import
   */
  private async processPropertyImport(data: any) {
    // Validate required fields
    if (!data.address) {
      throw new Error("Address is required for property import");
    }

    // Check if property already exists
    const existingProperty = await db.query.properties.findFirst({
      where: and(
        eq(properties.address, data.address),
        data.city ? eq(properties.city, data.city) : undefined,
        data.state ? eq(properties.state, data.state) : undefined,
        data.zipCode ? eq(properties.zipCode, data.zipCode) : undefined,
      ),
    });

    if (existingProperty) {
      // Update existing property
      await db
        .update(properties)
        .set({
          propertyType: data.propertyType || existingProperty.propertyType,
          bedrooms: data.bedrooms || existingProperty.bedrooms,
          bathrooms: data.bathrooms || existingProperty.bathrooms,
          squareFeet: data.squareFeet || existingProperty.squareFeet,
          lotSize: data.lotSize || existingProperty.lotSize,
          yearBuilt: data.yearBuilt || existingProperty.yearBuilt,
          lastSaleDate: data.lastSaleDate || existingProperty.lastSaleDate,
          lastSalePrice: data.lastSalePrice || existingProperty.lastSalePrice,
          estimatedValue:
            data.estimatedValue || existingProperty.estimatedValue,
          ownerName: data.ownerName || existingProperty.ownerName,
          ownerPhone: data.ownerPhone || existingProperty.ownerPhone,
          ownerEmail: data.ownerEmail || existingProperty.ownerEmail,
          notes: data.notes
            ? `${existingProperty.notes || ""}\n${data.notes}`
            : existingProperty.notes,
          updatedAt: new Date(),
        })
        .where(eq(properties.id, existingProperty.id));

      return { action: "updated", propertyId: existingProperty.id };
    } else {
      // Create new property
      const result = await db.insert(properties).values({
        address: data.address,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        propertyType: data.propertyType || null,
        bedrooms: data.bedrooms || null,
        bathrooms: data.bathrooms || null,
        squareFeet: data.squareFeet || null,
        lotSize: data.lotSize || null,
        yearBuilt: data.yearBuilt || null,
        lastSaleDate: data.lastSaleDate || null,
        lastSalePrice: data.lastSalePrice || null,
        estimatedValue: data.estimatedValue || null,
        ownerName: data.ownerName || null,
        ownerPhone: data.ownerPhone || null,
        ownerEmail: data.ownerEmail || null,
        notes: data.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { action: "created", propertyId: result.insertId };
    }
  }
}

export const batchProcessingService = new BatchProcessingService();

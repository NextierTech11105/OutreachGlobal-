import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

interface SavedSearchResult {
  searchId: string;
  searchName: string;
  properties: any[];
  added: number;
  updated: number;
  deleted: number;
  processedAt: Date;
}

@Injectable()
export class SavedSearchAutomationService {
  private readonly realEstateApiKey: string;
  private readonly skipTraceApiKey: string;
  private readonly spacesEndpoint: string;
  private readonly spacesKey: string;
  private readonly spacesSecret: string;
  private readonly dailyLimit = 2000;

  constructor(private config: ConfigService) {
    this.realEstateApiKey = config.get("REALESTATE_API_KEY") || "";
    this.skipTraceApiKey = config.get("REALESTATE_SKIPTRACE_KEY") || "";
    this.spacesEndpoint = config.get("DO_SPACES_ENDPOINT") || "";
    this.spacesKey = config.get("DO_SPACES_KEY") || "";
    this.spacesSecret = config.get("DO_SPACES_SECRET") || "";
  }

  async processSavedSearch(searchId: string, searchName: string): Promise<SavedSearchResult> {
    // Get updates from RealEstateAPI
    const updates = await this.getSavedSearchUpdates(searchId);

    // Limit to 2k per day
    const limited = updates.slice(0, this.dailyLimit);

    // Skip trace in batches
    const enriched = await this.bulkSkipTrace(limited);

    // Store in DigitalOcean Spaces
    await this.storeInObjectStorage(searchId, enriched);

    return {
      searchId,
      searchName,
      properties: enriched,
      added: updates.filter(p => p.status === 'added').length,
      updated: updates.filter(p => p.status === 'updated').length,
      deleted: updates.filter(p => p.status === 'deleted').length,
      processedAt: new Date(),
    };
  }

  private async getSavedSearchUpdates(searchId: string) {
    const { data } = await axios.post(
      'https://api.realestateapi.com/v1/PropertyPortfolio/SavedSearch',
      { search_id: searchId },
      {
        headers: {
          'x-api-key': this.realEstateApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return data.data || [];
  }

  private async bulkSkipTrace(properties: any[]) {
    const enriched: any[] = [];

    // Process in batches of 5
    for (let i = 0; i < properties.length; i += 5) {
      const batch = properties.slice(i, i + 5);

      const results = await Promise.allSettled(
        batch.map(prop => this.skipTraceSingle(prop))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          enriched.push(result.value);
        }
      });

      // Rate limit
      if (i + 5 < properties.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return enriched;
  }

  private async skipTraceSingle(property: any) {
    const mailAddress = property.mailAddress || property.address;

    const { data } = await axios.post(
      'https://api.realestateapi.com/v1/SkipTrace',
      {
        mail_address: mailAddress.street || mailAddress.address,
        mail_city: mailAddress.city,
        mail_state: mailAddress.state,
        mail_zip: mailAddress.zip,
        first_name: property.owner1FirstName,
        last_name: property.owner1LastName,
      },
      {
        headers: {
          'x-api-key': this.skipTraceApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      propertyId: property.id || property.propertyId,
      address: property.address,
      owner: `${property.owner1FirstName} ${property.owner1LastName}`,
      phones: data.phones || [],
      emails: data.emails || [],
      estimatedValue: property.estimatedValue,
      equityPercent: property.equityPercent,
      enrichedAt: new Date(),
    };
  }

  private async storeInObjectStorage(searchId: string, data: any[]) {
    // Store in DigitalOcean Spaces
    const key = `saved-searches/${searchId}/${new Date().toISOString()}.json`;

    // TODO: Implement S3 upload to DigitalOcean Spaces
    // This will use AWS SDK S3 compatible client

    return key;
  }

  async monitorPropertyEvents(propertyIds: string[]) {
    // Monitor properties for events (Listed, Sold, Vacant, etc.)
    const events: any[] = [];

    for (const propertyId of propertyIds) {
      const propertyEvents = await this.detectPropertyEvents(propertyId);
      events.push(...propertyEvents);
    }

    return events;
  }

  private async detectPropertyEvents(propertyId: string) {
    // Get current property data
    const { data } = await axios.post(
      `https://api.realestateapi.com/v2/PropertyDetail/${propertyId}`,
      {},
      {
        headers: {
          'x-api-key': this.realEstateApiKey,
        },
      }
    );

    // Compare with previous snapshot to detect events
    const events: Array<{ type: string; propertyId: string; date: Date }> = [];

    if (data.mlsListed && !data.wasListedBefore) {
      events.push({ type: 'LISTED', propertyId, date: new Date() });
    }

    if (data.sold && !data.wasSoldBefore) {
      events.push({ type: 'SOLD', propertyId, date: new Date() });
    }

    if (data.vacant && !data.wasVacantBefore) {
      events.push({ type: 'VACANT', propertyId, date: new Date() });
    }

    return events;
  }
}

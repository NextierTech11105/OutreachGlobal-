import { Injectable } from "@nestjs/common";
import { Dataloaders } from "./types/dataloader.type";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import DataLoader from "dataloader";
import { asc, inArray } from "drizzle-orm";
import { AiSdrAvatarSelect } from "../sdr/models/ai-sdr-avatar.model";
import { LeadSelect } from "../lead/models/lead.model";
import { UserSelect } from "../user/models/user.model";
import { DialerContactSelect } from "../power-dialer/models/dialer-contact.model";
import { PropertySelect } from "../property/models/property.model";

@Injectable()
export class DataloaderService {
  constructor(@InjectDB() private db: DrizzleClient) {}

  getLoaders(): Dataloaders {
    return {
      aiSdrAvatar: this.getAiSdrAvatar(),
      campaignSequences: this.getCampaignSequences(),
      lead: this.getLead(),
      user: this.getUser(),
      dialerContact: this.getDialerContact(),
      property: this.getProperty(),
      leadPhoneNumbers: this.getLeadPhoneNumbers(),
    };
  }

  private getAiSdrAvatar() {
    return new DataLoader(async (keys) => {
      const result = await this.db.query.aiSdrAvatars.findMany({
        where: (t) => inArray(t.id, keys as string[]),
      });

      return keys.map((key) => {
        return result.find((item) => item.id === key) as AiSdrAvatarSelect;
      });
    });
  }

  private getCampaignSequences() {
    return new DataLoader(async (keys) => {
      const result = await this.db.query.campaignSequences.findMany({
        where: (t) => inArray(t.campaignId, keys as string[]),
        orderBy: (t) => asc(t.position),
      });

      return keys.map((key) => {
        return result.filter((item) => item.campaignId === key);
      });
    });
  }

  private getLead() {
    return new DataLoader(async (keys) => {
      const result = await this.db.query.leads.findMany({
        where: (t) => inArray(t.id, keys as string[]),
      });

      return keys.map((key) => {
        return result.find((item) => item.id === key) as LeadSelect;
      });
    });
  }

  private getUser() {
    return new DataLoader(async (keys) => {
      const result = await this.db.query.users.findMany({
        where: (t) => inArray(t.id, keys as string[]),
      });

      return keys.map((key) => {
        return result.find((item) => item.id === key) as UserSelect;
      });
    });
  }

  private getDialerContact() {
    return new DataLoader(async (keys) => {
      const result = await this.db.query.dialerContacts.findMany({
        where: (t) => inArray(t.id, keys as string[]),
      });

      return keys.map((key) => {
        return result.find((item) => item.id === key) as DialerContactSelect;
      });
    });
  }

  private getProperty() {
    return new DataLoader(async (keys) => {
      const result = await this.db.query.properties.findMany({
        where: (t) => inArray(t.id, keys as string[]),
      });

      return keys.map((key) => {
        return result.find((item) => item.id === key) as PropertySelect;
      });
    });
  }

  private getLeadPhoneNumbers() {
    return new DataLoader(async (keys) => {
      const result = await this.db.query.leadPhoneNumbers.findMany({
        where: (t) => inArray(t.leadId, keys as string[]),
      });

      return keys.map((key) => {
        return result.filter((item) => item.leadId === key);
      });
    });
  }
}

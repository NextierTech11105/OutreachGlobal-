import { Injectable } from "@nestjs/common";
import { Dataloaders } from "./types/dataloader.type";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import DataLoader from "dataloader";
import { and, asc, eq, inArray } from "drizzle-orm";
import { AiSdrAvatarSelect } from "../sdr/models/ai-sdr-avatar.model";
import { LeadSelect } from "../lead/models/lead.model";
import { UserSelect } from "../user/models/user.model";
import { DialerContactSelect } from "../power-dialer/models/dialer-contact.model";
import { PropertySelect } from "../property/models/property.model";

@Injectable()
export class DataloaderService {
  constructor(@InjectDB() private db: DrizzleClient) {}

  getLoaders(teamId?: string): Dataloaders {
    return {
      aiSdrAvatar: this.getAiSdrAvatar(teamId),
      campaignSequences: this.getCampaignSequences(teamId),
      lead: this.getLead(teamId),
      user: this.getUser(),
      dialerContact: this.getDialerContact(teamId),
      property: this.getProperty(teamId),
      leadPhoneNumbers: this.getLeadPhoneNumbers(teamId),
    };
  }

  private getAiSdrAvatar(teamId?: string) {
    return new DataLoader(async (keys) => {
      const result = await this.db.query.aiSdrAvatars.findMany({
        where: (t) =>
          teamId
            ? and(eq(t.teamId, teamId), inArray(t.id, keys as string[]))
            : inArray(t.id, keys as string[]),
      });

      return keys.map((key) => {
        return result.find((item) => item.id === key) as AiSdrAvatarSelect;
      });
    });
  }

  private getCampaignSequences(teamId?: string) {
    return new DataLoader(async (keys) => {
      if (teamId) {
        const campaigns = await this.db.query.campaigns.findMany({
          where: (t) =>
            and(eq(t.teamId, teamId), inArray(t.id, keys as string[])),
          with: {
            sequences: {
              orderBy: (t) => asc(t.position),
            },
          },
        });
        return keys.map((key) => {
          const campaign = campaigns.find((c) => c.id === key);
          return campaign?.sequences || [];
        });
      }
      const result = await this.db.query.campaignSequences.findMany({
        where: (t) => inArray(t.campaignId, keys as string[]),
        orderBy: (t) => asc(t.position),
      });

      return keys.map((key) => {
        return result.filter((item) => item.campaignId === key);
      });
    });
  }

  private getLead(teamId?: string) {
    return new DataLoader(async (keys) => {
      const result = await this.db.query.leads.findMany({
        where: (t) =>
          teamId
            ? and(eq(t.teamId, teamId), inArray(t.id, keys as string[]))
            : inArray(t.id, keys as string[]),
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

  private getDialerContact(teamId?: string) {
    return new DataLoader(async (keys) => {
      if (teamId) {
        const teamDialers = await this.db.query.powerDialers.findMany({
          where: (t) => eq(t.teamId, teamId),
          columns: { id: true },
        });
        const dialerIds = teamDialers.map((d) => d.id);
        const result = await this.db.query.dialerContacts.findMany({
          where: (t) =>
            and(
              inArray(t.id, keys as string[]),
              inArray(t.powerDialerId, dialerIds),
            ),
        });
        return keys.map((key) => {
          return result.find((item) => item.id === key) as DialerContactSelect;
        });
      }
      const result = await this.db.query.dialerContacts.findMany({
        where: (t) => inArray(t.id, keys as string[]),
      });

      return keys.map((key) => {
        return result.find((item) => item.id === key) as DialerContactSelect;
      });
    });
  }

  private getProperty(teamId?: string) {
    return new DataLoader(async (keys) => {
      const result = await this.db.query.properties.findMany({
        where: (t) =>
          teamId
            ? and(eq(t.teamId, teamId), inArray(t.id, keys as string[]))
            : inArray(t.id, keys as string[]),
      });

      return keys.map((key) => {
        return result.find((item) => item.id === key) as PropertySelect;
      });
    });
  }

  private getLeadPhoneNumbers(teamId?: string) {
    return new DataLoader(async (keys) => {
      if (teamId) {
        const leads = await this.db.query.leads.findMany({
          where: (t) =>
            and(eq(t.teamId, teamId), inArray(t.id, keys as string[])),
          with: {
            phoneNumbers: true,
          },
        });
        return keys.map((key) => {
          const lead = leads.find((l) => l.id === key);
          return lead?.phoneNumbers || [];
        });
      }
      const result = await this.db.query.leadPhoneNumbers.findMany({
        where: (t) => inArray(t.leadId, keys as string[]),
      });

      return keys.map((key) => {
        return result.filter((item) => item.leadId === key);
      });
    });
  }
}

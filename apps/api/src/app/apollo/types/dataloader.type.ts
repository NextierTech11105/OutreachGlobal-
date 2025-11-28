import type { AiSdrAvatarSelect } from "@/app/sdr/models/ai-sdr-avatar.model";
import type Dataloader from "dataloader";
import type { CampaignSequenceSelect } from "@/app/campaign/models/campaign-sequence.model";
import type { LeadSelect } from "@/app/lead/models/lead.model";
import type { UserSelect } from "@/app/user/models/user.model";
import type { DialerContactSelect } from "@/app/power-dialer/models/dialer-contact.model";
import type { PropertySelect } from "@/app/property/models/property.model";
import type { LeadPhoneNumberSelect } from "@/app/lead/models/lead-phone-number.model";

export interface Dataloaders {
  aiSdrAvatar: Dataloader<string, AiSdrAvatarSelect>;
  campaignSequences: Dataloader<string, CampaignSequenceSelect[]>;
  lead: Dataloader<string, LeadSelect>;
  user: Dataloader<string, UserSelect>;
  dialerContact: Dataloader<string, DialerContactSelect>;
  property: Dataloader<string, PropertySelect>;
  leadPhoneNumbers: Dataloader<string, LeadPhoneNumberSelect[]>;
}

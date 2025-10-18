import { TimestampModel } from "@/app/apollo/base-model";
import { StringField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { Maybe, MaybeString } from "@/app/apollo/types/maybe.type";
import { aiSdrAvatars } from "@/database/schema/ai-sdr-avatars.schema";
import { Field, ObjectType } from "@nestjs/graphql";
import { AiSdrFaq } from "../objects/ai-sdr-faq.object";

export type AiSdrAvatarSelect = typeof aiSdrAvatars.$inferSelect;
export type AiSdrAvatarInsert = typeof aiSdrAvatars.$inferInsert;

@ObjectType()
export class AiSdrAvatar extends TimestampModel implements AiSdrAvatarSelect {
  teamId: string;

  @StringField()
  name: string;

  @StringField({ nullable: true })
  description: MaybeString;

  @StringField()
  personality: string;

  @StringField()
  voiceType: string;

  @StringField({ nullable: true })
  avatarUri: MaybeString;

  @Field(() => Boolean)
  active: boolean;

  @StringField()
  industry: string;

  @StringField()
  mission: string;

  @StringField()
  goal: string;

  @Field(() => [String])
  roles: string[];

  @Field(() => [String])
  tags: string[];

  @Field(() => [AiSdrFaq], { defaultValue: [] })
  faqs: AiSdrFaq[];
}

@ObjectType()
export class AiSdrAvatarEdge extends WithEdge(AiSdrAvatar) {}

@ObjectType()
export class AiSdrAvatarConnection extends WithConnection(AiSdrAvatarEdge) {}

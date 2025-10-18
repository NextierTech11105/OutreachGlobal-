import { Field, ObjectType } from "@nestjs/graphql";
import { AiSdrAvatar } from "../models/ai-sdr-avatar.model";

@ObjectType()
export class CreateAiSdrAvatarPayload {
  @Field(() => AiSdrAvatar)
  avatar: AiSdrAvatar;
}

@ObjectType()
export class UpdateAiSdrAvatarPayload {
  @Field(() => AiSdrAvatar)
  avatar: AiSdrAvatar;
}

@ObjectType()
export class DeleteAiSdrAvatarPayload {
  @Field(() => String)
  id: string;
}

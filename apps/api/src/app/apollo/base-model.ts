import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType({ isAbstract: true })
export class Model {
  @Field(() => ID)
  id: string;
}

@ObjectType({ isAbstract: true })
export class TimestampModel {
  @Field(() => ID)
  id: string;

  @Field()
  createdAt: Date;

  @Field(() => Date, { nullable: true })
  updatedAt: Date | null;
}

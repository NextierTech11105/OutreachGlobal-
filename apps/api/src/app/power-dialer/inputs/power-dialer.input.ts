import { Field, InputType } from "@nestjs/graphql";
import { CreatePowerDialerDto } from "@nextier/dto";

@InputType({ isAbstract: true })
export class PowerDialerInput implements CreatePowerDialerDto {
  @Field()
  title: string;
}

@InputType()
export class CreatePowerDialerInput extends PowerDialerInput {}

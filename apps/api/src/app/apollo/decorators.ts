import {
  Field,
  FieldOptions,
  Float,
  ID,
  Int,
  ResolveField,
  ResolveFieldOptions,
} from "@nestjs/graphql";
import { JSONScalar } from "./scalars/json.scalar";

export const IntField = (options?: FieldOptions) => Field(() => Int, options);
export const ResolveIntField = (options?: ResolveFieldOptions) =>
  ResolveField(() => Int, options);

/** use this if type of ObjectType is not explicitly only for single type, e.g `string | null` */
export const StringField = (options?: FieldOptions) =>
  Field(() => String, options);

export const FloatField = (options?: FieldOptions) =>
  Field(() => Float, options);

export const DateField = (options?: FieldOptions) => Field(() => Date, options);

export const IdField = (options?: FieldOptions) => Field(() => ID, options);

export const BooleanField = (options?: FieldOptions) =>
  Field(() => Boolean, options);

export const JSONField = (options?: FieldOptions) =>
  Field(() => JSONScalar, options);

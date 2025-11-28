import { Field, ObjectType } from "@nestjs/graphql";
import { Type } from "@nestjs/common";
import { PageInfo } from "./objects/page-info.object";

export interface ObjectConnection<T> {
  edges: T[];
  pageInfo: PageInfo;
}

export interface ObjectEdge<T> {
  cursor: string;
  node: T;
}

export function WithConnection<T extends ObjectEdge<any>>(
  classRef: Type<T>,
): Type<ObjectConnection<T>> {
  @ObjectType({ isAbstract: true })
  class ConnectionHost {
    @Field(() => [classRef], { defaultValue: [] })
    edges: T[];

    @Field(() => PageInfo)
    pageInfo: PageInfo;
  }

  return ConnectionHost;
}

export function WithEdge<T>(classRef: Type<T>): Type<ObjectEdge<T>> {
  @ObjectType({ isAbstract: true })
  class EdgeHost {
    @Field()
    cursor: string;

    @Field(() => classRef)
    node: T;
  }

  return EdgeHost;
}

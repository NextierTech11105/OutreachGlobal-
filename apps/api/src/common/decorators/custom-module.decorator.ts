import { Module, type ModuleMetadata, type Provider } from "@nestjs/common";
import { registerRunners } from "../utils/register-runners";

export interface CustomModuleMetadata extends ModuleMetadata {
  /** Graphql resolvers */
  resolvers?: Provider[];
  /** database repositories / entity manager */
  repositories?: Provider[];
  /** bull processors */
  consumers?: Provider[];

  runners?: Provider[];

  schedules?: Provider[];

  seeders?: Provider[];

  policies?: Provider[];

  // cqrs
  commands?: Provider[];
  events?: Provider[];
  sagas?: Provider[];
}

/**
 * This custom module decorator do nothing but add extra parameters for graphql resolver, database repositories and queue consumers / processor as providers.
 *
 * The goal is to make it easier to manage between each providers type
 */
export const CustomModule = ({
  resolvers,
  repositories,
  consumers,
  runners,
  schedules,
  seeders = [],
  policies,
  commands = [],
  events = [],
  sagas = [],
  ...metadata
}: CustomModuleMetadata) => {
  const providers: Provider[] = metadata.providers ?? [];
  if (repositories?.length) {
    providers.push(...repositories);
  }

  if (resolvers?.length) {
    providers.push(...resolvers);
  }

  if (consumers?.length) {
    providers.push(...consumers);
  }

  if (runners?.length) {
    providers.push(...registerRunners(...runners));
  }

  if (schedules?.length) {
    providers.push(...schedules);
  }

  if (seeders?.length) {
    providers.push(...seeders);
  }

  if (policies?.length) {
    providers.push(...policies);
  }

  if (commands?.length) {
    providers.push(...commands);
  }

  if (events?.length) {
    providers.push(...events);
  }

  if (sagas?.length) {
    providers.push(...sagas);
  }

  return Module({ ...metadata, providers });
};

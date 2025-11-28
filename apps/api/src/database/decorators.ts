import { DEFAULT_DB_PROVIDER_NAME } from "@haorama/drizzle-postgres-nestjs";
import { Inject } from "@nestjs/common";

export const InjectDB = () => Inject(DEFAULT_DB_PROVIDER_NAME);

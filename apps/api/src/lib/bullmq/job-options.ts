import { JobsOptions } from "bullmq";

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
  removeOnComplete: 100,
  removeOnFail: 50,
};

export const PROCESSOR_OPTIONS = {
  concurrency: 5,
  lockDuration: 30000,
};

export const JOB_TIMEOUT_MS = 60000;

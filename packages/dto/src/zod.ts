import { z } from "zod/v4";

z.config({
  customError: (issue) => {
    const title =
      (issue.inst as any)?.meta?.()?.title ||
      issue.path?.[issue.path?.length - 1];
    const origin = issue.origin;
    if (issue.code === "too_small") {
      if (origin === "string") {
        return `${title} must be at least ${issue.minimum} characters`;
      }
      return `${title} must be at least ${issue.minimum}`;
    }

    if (issue.code === "too_big") {
      if (origin === "string") {
        return `${title} must be at most ${issue.maximum} characters`;
      }
      return `${title} must be at most ${issue.maximum}`;
    }

    if (issue.format === "email") {
      return `${title} must be a valid email address`;
    }

    return issue.message;
  },
});

export function preNullish<T extends z.ZodType>(type: T) {
  return z.preprocess((value) => {
    if (typeof value === "string" && value === "") {
      return null;
    }
    return value;
  }, z.nullish(type));
}

export { z };

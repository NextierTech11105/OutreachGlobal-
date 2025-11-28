import { type FieldError } from "react-hook-form";
import { ZodResolver } from "../types/use-form.type";
import { ZodError } from "zod/v4";

type FieldErrors = Record<string, FieldError>;

export const zodResolver: ZodResolver = (schema, options) => async (values) => {
  try {
    const output = schema.parse(values);
    return {
      errors: {} as FieldErrors,
      values: output as any,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      console.log(error.issues);
      const errors = error.issues.reduce((acc, issue) => {
        const path = issue.path.join(".");
        acc[path] = {
          message: issue.message,
        } as any;
        return acc;
      }, {} as FieldErrors);

      return {
        errors,
        values: {} as any,
      };
    }

    return {
      errors: {} as FieldErrors,
      values: {} as any,
    };
  }
};

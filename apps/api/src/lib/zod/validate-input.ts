import { UnprocessableEntityException } from "@nestjs/common";
import { z } from "@nextier/dto";

export function parseSchema<
  T extends z.ZodObject,
  O extends Record<string, any>,
>(schema: T, data: O) {
  try {
    const values = schema.parse(data);
    return values;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const inputErrors = error.issues.map((issue) => ({
        field: issue.path[0],
        message: issue.message,
      }));

      throw new UnprocessableEntityException({
        message: "invalid data",
        code: "BAD_USER_INPUT",
        inputErrors,
      });
    }

    throw new UnprocessableEntityException({
      message: "invalid data",
      code: "BAD_USER_INPUT",
    });
  }
}

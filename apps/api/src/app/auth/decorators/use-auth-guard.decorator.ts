import { applyDecorators, UseGuards } from "@nestjs/common";
import { AuthGuard, RolesGuard } from "../guards";
import { Roles } from "./roles.decorator";

export const UseAuthGuard = (roles?: string[]) => {
  const decorators = [UseGuards(AuthGuard, RolesGuard)];
  if (roles?.length) {
    decorators.push(Roles(...roles));
  }
  return applyDecorators(...decorators);
};

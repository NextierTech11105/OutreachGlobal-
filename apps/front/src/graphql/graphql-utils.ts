import type { CursorPaginationState } from "./types";

export function createDefaultCursor(
  defaultValue?: CursorPaginationState,
): CursorPaginationState {
  return {
    first: 10,
    last: null,
    after: null,
    before: null,
    ...defaultValue,
  };
}

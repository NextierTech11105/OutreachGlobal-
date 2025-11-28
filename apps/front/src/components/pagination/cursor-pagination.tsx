"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CursorPaginationState, PageInfo } from "@/graphql/types";
import { Button } from "../ui/button";

export type CursorChangeEvent = (cursorState: CursorPaginationState) => void;

export interface CursorPaginationProps {
  data: Partial<PageInfo>;
  className?: string;
  onPageChange?: CursorChangeEvent;
  limit?: number;
  variant?: "table-footer" | "default";
  hideResult?: boolean;
}

export const CursorPagination: React.FC<CursorPaginationProps> = ({
  data,
  onPageChange,
  className,
  limit = 10,
  variant = "default",
  hideResult = false,
}) => {
  const handleNext = () => {
    onPageChange?.({
      after: data?.endCursor,
      first: limit,
      before: null,
      last: null,
    });
  };

  const handlePrevious = () => {
    onPageChange?.({
      before: data?.startCursor,
      last: limit,
      after: null,
      first: null,
    });
  };

  return (
    <div
      className={cn(
        "flex justify-between items-center",
        variant === "table-footer" && "px-3 py-2",
        className,
      )}
    >
      <div className="text-sm text-muted-foreground gap-x-1 flex flex-row">
        {!hideResult && (
          <>
            <span>{data.total?.toLocaleString("en-US")}</span>
            <span>results</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={!data.hasPrevPage}
        >
          <ArrowLeftIcon size={20} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!data.hasNextPage}
        >
          <ArrowRightIcon size={20} />
        </Button>
      </div>
    </div>
  );
};

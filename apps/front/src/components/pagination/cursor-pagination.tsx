"use client";

import { ArrowLeftIcon, ArrowRightIcon, ChevronsLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { sf } from "@/lib/utils/safe-format";
import { CursorPaginationState, PageInfo } from "@/graphql/types";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";

export type CursorChangeEvent = (cursorState: CursorPaginationState) => void;

export interface CursorPaginationProps {
  data: Partial<PageInfo>;
  className?: string;
  onPageChange?: CursorChangeEvent;
  limit?: number;
  variant?: "table-footer" | "default";
  hideResult?: boolean;
  showPageInfo?: boolean;
}

export const CursorPagination: React.FC<CursorPaginationProps> = ({
  data,
  onPageChange,
  className,
  limit = 10,
  variant = "default",
  hideResult = false,
  showPageInfo = true,
}) => {
  // Track current page based on cursor navigation
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = data.total ? Math.ceil(data.total / limit) : 0;

  // Reset page when limit changes
  useEffect(() => {
    setCurrentPage(1);
  }, [limit]);

  const handleNext = () => {
    setCurrentPage((p) => Math.min(p + 1, totalPages));
    onPageChange?.({
      after: data?.endCursor,
      first: limit,
      before: null,
      last: null,
    });
  };

  const handlePrevious = () => {
    setCurrentPage((p) => Math.max(p - 1, 1));
    onPageChange?.({
      before: data?.startCursor,
      last: limit,
      after: null,
      first: null,
    });
  };

  const handleFirst = () => {
    setCurrentPage(1);
    onPageChange?.({
      first: limit,
      after: null,
      before: null,
      last: null,
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
            <span>{sf(data.total)}</span>
            <span>results</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-x-2">
        {/* Page info */}
        {showPageInfo && totalPages > 0 && (
          <span className="text-xs text-muted-foreground mr-2">
            Page <span className="font-medium text-foreground">{currentPage.toLocaleString()}</span> of <span className="font-medium text-foreground">{totalPages.toLocaleString()}</span>
          </span>
        )}
        {/* First page button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFirst}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
          title="First page"
        >
          <ChevronsLeft size={16} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={!data.hasPrevPage}
          className="h-8 w-8 p-0"
        >
          <ArrowLeftIcon size={16} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!data.hasNextPage}
          className="h-8 w-8 p-0"
        >
          <ArrowRightIcon size={16} />
        </Button>
      </div>
    </div>
  );
};

import {
  DocumentNode,
  type OperationVariables,
  type QueryHookOptions,
  type TypedDocumentNode,
  useQuery,
} from "@apollo/client";
import { useMemo } from "react";
export interface UseSingleQueryOptions<
  TData = any,
  TVariables extends OperationVariables = OperationVariables,
> extends QueryHookOptions<TData, TVariables> {
  pick: keyof Omit<TData, "__typename" | "__masked">;
}

export function useSingleQuery<
  TData = any,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  { pick, ...options }: UseSingleQueryOptions<TData, TVariables>,
) {
  const { data, ...rest } = useQuery<TData, TVariables>(query, options);

  const pickedData = useMemo(() => {
    if (!data) {
      return undefined;
    }

    return (data as any)[pick] as unknown as TData[typeof pick];
  }, [data, pick]);

  return [pickedData, rest] as const;
}

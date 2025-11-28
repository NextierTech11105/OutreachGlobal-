import {
  type DocumentNode,
  OperationVariables,
  QueryHookOptions,
  type TypedDocumentNode,
  useQuery,
} from "@apollo/client";
import { useMemo } from "react";

export interface UseConnectionNodeQueryOptions<
  TData extends Record<string, any> = any,
  TVariables extends OperationVariables = OperationVariables,
> extends QueryHookOptions<TData, TVariables> {
  pick: keyof Omit<TData, "__typename">;
}

/**
 * Simplify relay query by getting node directly
 */
export function useConnectionQuery<
  TData extends Record<string, any> = any,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  { pick, ...options }: UseConnectionNodeQueryOptions<TData, TVariables>,
) {
  const { data, ...rest } = useQuery<TData, TVariables>(query, options);

  const pickedData: TData[typeof pick]["edges"][number]["node"][] =
    useMemo(() => {
      const edges: any[] = (data as any)?.[pick]?.edges;
      if (!edges?.length) {
        return [];
      }
      return edges?.reduce(
        (acc, curr) => {
          acc.push(curr.node);
          return acc;
        },
        [] as TData[typeof pick]["edges"][number]["node"][],
      );
    }, [data, pick]);

  const pageInfo: TData[typeof pick]["pageInfo"] = useMemo(() => {
    return (data as any)?.[pick]?.pageInfo;
  }, [data, pick]);

  return [pickedData, pageInfo, rest] as const;
}

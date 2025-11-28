import { ApolloError } from "@apollo/client";
import { AxiosError } from "axios";
import { useCallback } from "react";
import { UseFormSetError } from "react-hook-form";
import { toast } from "sonner";

interface UseApiErrorOptions {
  setError?: UseFormSetError<any>;
}

interface ShowErrorOptions {
  /** if true, it will check error from graphql, default false / REST */
  gql?: boolean;
  showFirstError?: boolean;
}

export function useApiError(options?: UseApiErrorOptions) {
  const showError = useCallback(
    (error: any, errorOptions?: ShowErrorOptions) => {
      if (errorOptions?.gql && error instanceof ApolloError) {
        if (
          (error as any).graphQLErrors?.[0]?.extensions?.inputErrors?.length
        ) {
          const inputErrors = (error as any).graphQLErrors?.[0]?.extensions
            ?.inputErrors as any[];
          inputErrors.forEach((fieldError) => {
            options?.setError?.(
              fieldError.field,
              { message: fieldError.message },
              { shouldFocus: true },
            );
          });

          if (inputErrors?.length && errorOptions?.showFirstError) {
            toast.error(inputErrors[0].message);
          }
        } else {
          const message =
            error.graphQLErrors?.[0]?.message ??
            error.message ??
            "Something went wrong";
          toast.error(message);
        }
      } else if (error instanceof AxiosError) {
        if (error.response?.status && error.response?.status !== 422) {
          toast.error(error.response?.data?.message ?? "Internal Server Error");
        }

        if (
          error?.response?.status == 422 &&
          !!error.response?.data?.inputErrors?.length &&
          !!options?.setError
        ) {
          const inputErrors = error?.response?.data?.inputErrors as any[];
          inputErrors.forEach((error) => {
            options?.setError?.(
              error.field,
              { message: error.message },
              { shouldFocus: true },
            );
          });
        }
      }
    },
    [options],
  );

  return { showError };
}

"use client";
import * as React from "react";
import { FieldValues } from "react-hook-form";
import { UseFormReturn } from "./types/use-form.type";

type Props<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues extends FieldValues | undefined = undefined,
> = {
  children: React.ReactNode;
} & UseFormReturn<TFieldValues, TContext, TTransformedValues>;

export const FormContext = React.createContext<UseFormReturn>({} as any);

export function useFormContext<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues extends FieldValues | undefined = undefined,
>() {
  const ctx = React.useContext<
    UseFormReturn<TFieldValues, TContext, TTransformedValues>
  >(FormContext as any);

  return ctx as UseFormReturn<TFieldValues, TContext, TTransformedValues>;
}

export const FormProvider = <
  TFieldValues extends FieldValues,
  TContext = any,
  TTransformedValues extends FieldValues | undefined = undefined,
>(
  props: Props<TFieldValues, TContext, TTransformedValues>,
) => {
  const { children, ...data } = props;
  return (
    <FormContext.Provider value={data as unknown as UseFormReturn}>
      {children}
    </FormContext.Provider>
  );
};

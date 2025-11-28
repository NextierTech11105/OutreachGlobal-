import type {
  FieldPath,
  FieldValues,
  InternalFieldName,
  Path,
  RegisterOptions,
  UseFormRegisterReturn as UseFormRegisterReturnBase,
  UseFormReturn as UseFormReturnBase,
  UseFormRegister as UseFormRegisterBase,
  ResolverOptions,
  ResolverResult,
} from "react-hook-form";
import type { z } from "zod/v4";

export type ExtraResolverOptions = {
  /** by default resolver will convert empty string into undefined, set this to true to skip and hnadle by your post change */
  skipSanitize?: boolean;
};

export type ZodResolver = <T extends z.ZodObject>(
  schema: T,
  options?: ExtraResolverOptions,
) => (
  values: z.infer<T>,
  context: any | undefined,
  options: ResolverOptions<z.infer<T>>,
) => Promise<ResolverResult<z.infer<T>>>;

export interface UseFormRegisterErrorReturn<TKey = any> {
  name: Path<TKey>;
  error: any;
}

export type UseFormRegisterReturn<
  TFieldName extends InternalFieldName = InternalFieldName,
> = Omit<UseFormRegisterReturnBase<TFieldName>, "onChange"> & {
  onChange?: (e: any) => void | Promise<void>;
};

export type UseFormRegister<TFieldValues extends FieldValues> = <
  TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(
  name: TFieldName,
  options?: CustomRegisterOptions<TFieldValues, TFieldName>,
) => UseFormRegisterReturn<TFieldName>;

export type UseFormRegisterError<
  TFieldValues extends FieldValues = FieldValues,
> = (name: Path<TFieldValues>) => UseFormRegisterErrorReturn;

export type CustomRegisterOptions<
  TFieldValues extends FieldValues = FieldValues,
  TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = RegisterOptions<TFieldValues, TFieldName> & {
  /**
   * If number is true, the onChange function will be replaced with a function that parses the value to number
   * of return empty string, return undefined
   */
  $number?: boolean;

  $changeFuncName?: string | undefined;
  $changeFuncValue?: (e: any) => any;

  /**
   * If direct is true, the onChange function will be replaced with a function that directly sets the value
   * so e = value not e.target.value
   */
  $direct?: boolean;
  /** when using direct  */
  $shouldValidate?: boolean;
};

export interface UseFormReturn<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
> extends Omit<
    UseFormReturnBase<TFieldValues, TContext, TTransformedValues>,
    "register"
  > {
  registerError: UseFormRegisterError<TFieldValues>;
  register: UseFormRegister<TFieldValues>;
  rawRegister: UseFormRegisterBase<TFieldValues>;
  hasError: (name: Path<TFieldValues>) => boolean;
  isDirty: boolean;
}

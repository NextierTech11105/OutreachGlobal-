import { useCallback } from "react";
import {
  FieldValues,
  Path,
  UseFormProps,
  useForm as useHookForm,
  FieldError,
  UseFormSetValue,
} from "react-hook-form";
import {
  CustomRegisterOptions,
  UseFormRegisterError,
  UseFormReturn,
} from "../types/use-form.type";
import { setValueAsNumber } from "../utils/cast";

interface PropsOptions<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
> extends UseFormProps<TFieldValues, TContext> {
  plainErrors?: boolean;
}

export function useForm<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
>(props?: PropsOptions<TFieldValues, TContext>): UseFormReturn<TFieldValues> {
  const { watch, setValue, register, ...rest } = useHookForm(props);

  const registerError: UseFormRegisterError<TFieldValues> = useCallback(
    (name) => {
      return {
        name,
        error: rest.formState.errors[name],
      };
    },
    [rest.formState.errors],
  );

  const customSetValue: UseFormSetValue<TFieldValues> = useCallback(
    (name, value, options) => {
      return setValue(name, value, { shouldDirty: true, ...options });
    },
    [setValue],
  );

  const hasError = useCallback(
    (name: Path<TFieldValues>) => {
      const error = rest.formState.errors[name];

      return !!(error as FieldError)?.message;
    },
    [rest.formState.errors],
  );

  const customRegister = useCallback(
    (
      name: Path<TFieldValues>,
      options?: CustomRegisterOptions<TFieldValues>,
    ) => {
      const defaultOptions = Object.assign({}, options);
      if (options?.$number) {
        defaultOptions.setValueAs = (value: any) => setValueAsNumber(value);
      }

      const registerValue = register(name, defaultOptions);

      if (options?.$direct) {
        const changeName = options?.$changeFuncName ?? "onChange";
        registerValue.onChange = async (e) => {};

        // @ts-ignore
        registerValue[changeName] = async (e: any) => {
          const value = options?.$changeFuncValue
            ? options.$changeFuncValue(e)
            : e;

          setValue(name, value, {
            shouldValidate:
              options?.$shouldValidate ?? rest.formState.submitCount > 0,
            shouldDirty: true,
          });
          options?.onChange?.(value);
        };
        (registerValue as any).value = watch(name);
      }

      return registerValue;
    },
    [register, setValue, watch, rest.formState.submitCount],
  );

  return {
    ...rest,
    watch,
    registerError,
    register: customRegister as any,
    rawRegister: register,
    hasError,
    isDirty: rest.formState.isDirty,
    setValue: customSetValue,
  };
}

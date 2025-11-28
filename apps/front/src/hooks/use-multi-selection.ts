import { useCallback, useMemo, useState } from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";

interface Options {
  itemsTotal?: number;
}

export function useMultiSelection<
  T extends string | number | Record<string, any>,
>(options: Options) {
  const [selected, setSelected] = useState<T[]>([]);

  /** the checkstate of the root */
  const checkedState = useMemo<CheckedState>(() => {
    const itemsTotal = options.itemsTotal ?? 0;

    if (!itemsTotal || !selected.length) {
      return false;
    }

    if (selected.length < itemsTotal) {
      return "indeterminate";
    }

    return selected.length === itemsTotal;
  }, [options.itemsTotal, selected.length]);

  const findItem = useCallback(
    (value: T) => {
      return selected.find((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return item === value;
        }

        return item.id === (value as Record<string, any>).id;
      });
    },
    [selected],
  );

  const handleToggleSelectAll = (values: T[]) => (checkValue: CheckedState) => {
    if (checkValue === true) {
      setSelected(values);
    } else {
      setSelected([]);
    }
  };

  const toggleSelect =
    (value: T) =>
    (checkValue: CheckedState | React.ChangeEvent<HTMLInputElement>) => {
      const isChecked =
        typeof checkValue === "boolean" || typeof checkValue === "string"
          ? checkValue
          : checkValue.target.checked;

      if (isChecked === true) {
        const item = findItem(value);

        if (!item) {
          setSelected((prev) => [...prev, value]);
        }
      } else {
        setSelected((prev) => {
          return prev.filter((item) => {
            if (typeof item === "string" || typeof item === "number") {
              return item !== value;
            }

            return item.id !== (value as Record<string, any>).id;
          });
        });
      }
    };

  const isChecked = (value: T) => {
    const item = findItem(value);
    const isNullOrUndefined = item === undefined || item === null;

    return !isNullOrUndefined;
  };

  return [
    selected,
    {
      checkedState,
      toggleSelect,
      setSelected,
      isChecked,
      handleToggleSelectAll,
    },
  ] as const;
}

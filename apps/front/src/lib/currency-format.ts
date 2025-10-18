interface FormatOptions {
  currency?: string;
}

export type CurrencyFormatOptions = Intl.NumberFormatOptions & {
  // if notation is compact
  compactThreshold?: number;
  removeWhitespace?: boolean;
};

const SMALL_UNITS = ["USD"];

function getValue(value: number | string, options?: FormatOptions) {
  const currency = options?.currency || "USD";
  const parsedValue = typeof value === "string" ? Number(value) : value;

  const isSmallUnit = SMALL_UNITS.includes(currency);
  return { value: parsedValue, isSmallUnit };
}

/**
 * convert amount to higher unit
 * for example in USD 100 will become 1.
 * this usually use from converting backend amount
 */
export function fromSmallUnit(
  amount: number | string,
  options?: FormatOptions,
) {
  const { value, isSmallUnit } = getValue(amount, options);
  return isSmallUnit ? value / 100 : value;
}

/**
 * currency format
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
 * default is USD.
 *
 * Noted that is currency is usd, the amount will convert into small unit
 * for example if you pass 100, it will divide by 100 so its = $1.00
 */
export function currencyFormat(
  value: number | string,
  options?: CurrencyFormatOptions,
) {
  let notation = options?.notation;
  const currency = options?.currency || "USD";
  const { value: parsedValue } = getValue(value, { currency });
  if (
    options?.compactThreshold &&
    notation === "compact" &&
    parsedValue < options.compactThreshold
  ) {
    notation = undefined;
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    ...options,
    currency,
    notation,
  });

  const formattedValue = formatter.format(parsedValue);
  if (options?.removeWhitespace) {
    return formattedValue.replace(/\s/g, "");
  }
  return formattedValue;
}

/** Same feature frpm currency format but use minimumFractionDigits = 4 by default */
export function pricingFormat(
  value: number | string,
  options?: CurrencyFormatOptions,
) {
  return currencyFormat(value, {
    ...options,
    minimumFractionDigits: 4,
  });
}

/**
 * Format a number or string as currency
 * @param value - The value to format (can be number or string)
 * @param currency - Currency symbol (default: $)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = "$"
): string {
  if (value === null || value === undefined) {
    return `${currency}0.00`;
  }
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return `${currency}0.00`;
  }
  return `${currency}${numValue.toFixed(2)}`;
}

/**
 * Format a number or string as currency with locale formatting
 * @param value - The value to format (can be number or string)
 * @param locale - Locale string (default: en-US)
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrencyLocale(
  value: number | string | null | undefined,
  locale: string = "en-US",
  currency: string = "USD"
): string {
  if (value === null || value === undefined) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(0);
  }
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(0);
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(numValue);
}

/**
 * Format a date string
 * @param dateString - ISO date string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }
): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", options);
}

/**
 * Format a number as a currency string with commas and 2 decimal places.
 * e.g. 1234.5 → "1,234.50"
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

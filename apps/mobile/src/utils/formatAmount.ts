/** Format a dollar amount compactly: 999 → "$999", 1000 → "$1k", 2500 → "$2.5k" */
export function fmtAmount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

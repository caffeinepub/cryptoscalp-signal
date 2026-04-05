/**
 * Format a price value with appropriate decimal places
 */
export function formatPrice(price: number): string {
  if (price === 0 || Number.isNaN(price)) return "$0.00";
  if (price < 0.01) {
    return `$${price.toFixed(6)}`;
  }
  if (price < 1) {
    return `$${price.toFixed(4)}`;
  }
  if (price < 100) {
    return `$${price.toFixed(2)}`;
  }
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a percentage change
 */
export function formatPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

/**
 * Format a timestamp to MM:SS
 */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Format date/time for axis labels
 */
export function formatAxisDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}h`;
}

/**
 * Get RSI color class based on value
 */
export function getRsiColor(rsi: number): string {
  if (rsi < 35) return "text-signal-green";
  if (rsi < 50) return "text-signal-yellow";
  return "text-muted-foreground";
}

/**
 * Get volume ratio color class
 */
export function getVolumeColor(ratio: number): string {
  if (ratio >= 1.2) return "text-signal-green";
  return "text-muted-foreground";
}

/**
 * Generate a color for coin avatar based on symbol
 */
export function getCoinAvatarColor(symbol: string): string {
  const colors = [
    "bg-blue-900 text-blue-300",
    "bg-purple-900 text-purple-300",
    "bg-orange-900 text-orange-300",
    "bg-teal-900 text-teal-300",
    "bg-indigo-900 text-indigo-300",
    "bg-pink-900 text-pink-300",
    "bg-yellow-900 text-yellow-300",
    "bg-cyan-900 text-cyan-300",
  ];
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

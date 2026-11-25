export function timeAgo(timestampNs: string): string {
  const seconds = Math.floor((Date.now() - Number(timestampNs) / 1e6) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function toDate(timestampNs: string | number): Date {
  return new Date(Number(timestampNs) / 1e6);
}

// Formatters are built once: constructing them is slow enough to show up when
// a page renders hundreds of timestamps.
const DATE_TIME = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const MONTH_YEAR = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short" });

/** "Nov 25, 2026, 10:12:03 AM" in the reader's locale */
export function formatDateTime(timestampNs: string | number): string {
  return DATE_TIME.format(toDate(timestampNs));
}

/** "Mar 2021" */
export function formatMonthYear(timestampNs: string | number): string {
  return MONTH_YEAR.format(toDate(timestampNs));
}

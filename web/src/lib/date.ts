/** "YYYY-MM-DD" (local) -> Unix seconds at local midnight */
export function dateInputToUnix(value: string): number {
  return Math.floor(new Date(`${value}T00:00:00`).getTime() / 1000);
}

/** Unix seconds -> "YYYY-MM-DD" (local) for <input type="date"> */
export function unixToDateInput(seconds: number | null): string {
  if (seconds === null) return "";
  const d = new Date(seconds * 1000);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function formatDue(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** True if the due date is before the start of today. */
export function isOverdue(seconds: number): boolean {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return seconds * 1000 < startOfToday.getTime();
}

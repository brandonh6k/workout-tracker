/**
 * Groups an array of items by a key extracted from each item.
 */
export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of items) {
    const key = keyFn(item)
    if (!result[key]) result[key] = []
    result[key].push(item)
  }
  return result
}

/**
 * Parses a date string as local time (not UTC).
 * Handles "YYYY-MM-DD" format which JavaScript would otherwise interpret as UTC.
 */
function parseLocalDate(date: Date | string): Date {
  if (date instanceof Date) return date
  
  // Check if it's a date-only string (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  
  // Otherwise, let JavaScript parse it (handles ISO timestamps, etc.)
  return new Date(date)
}

/**
 * Formats a date for display in workout contexts (e.g., "Mon, Dec 30")
 */
export function formatWorkoutDate(date: Date | string): string {
  const d = parseLocalDate(date)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Formats a date for charts/compact display (e.g., "Dec 30")
 */
export function formatShortDate(date: Date | string): string {
  const d = parseLocalDate(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

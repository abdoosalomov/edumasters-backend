/**
 * Timezone utilities for Tashkent/Uzbekistan (UTC+5)
 */

export const TASHKENT_TIMEZONE = 'Asia/Tashkent';
export const TASHKENT_OFFSET = '+05:00';

/**
 * Get current date in Tashkent timezone
 */
export function getTashkentDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TASHKENT_TIMEZONE }));
}

/**
 * Parse a date string in Tashkent timezone
 * @param dateString - Date string in YYYY-MM-DD format
 */
export function parseTashkentDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00' + TASHKENT_OFFSET);
}

/**
 * Get start of day in Tashkent timezone
 */
export function getTashkentStartOfDay(date: Date = new Date()): Date {
  const tashkentDate = new Date(date.toLocaleString('en-US', { timeZone: TASHKENT_TIMEZONE }));
  return new Date(tashkentDate.getFullYear(), tashkentDate.getMonth(), tashkentDate.getDate());
}

/**
 * Get end of day in Tashkent timezone
 */
export function getTashkentEndOfDay(date: Date = new Date()): Date {
  const tashkentDate = new Date(date.toLocaleString('en-US', { timeZone: TASHKENT_TIMEZONE }));
  return new Date(tashkentDate.getFullYear(), tashkentDate.getMonth(), tashkentDate.getDate(), 23, 59, 59, 999);
}

/**
 * Get day of week in Tashkent timezone
 */
export function getTashkentDayOfWeek(date: Date = new Date()): number {
  const tashkentDate = new Date(date.toLocaleString('en-US', { timeZone: TASHKENT_TIMEZONE }));
  return tashkentDate.getDay();
}

/**
 * Format date for Tashkent timezone
 */
export function formatTashkentDate(date: Date, format: 'iso' | 'date' | 'datetime' = 'iso'): string {
  const tashkentDate = new Date(date.toLocaleString('en-US', { timeZone: TASHKENT_TIMEZONE }));
  
  switch (format) {
    case 'date':
      return tashkentDate.toISOString().split('T')[0];
    case 'datetime':
      return tashkentDate.toISOString();
    default:
      return tashkentDate.toISOString();
  }
}

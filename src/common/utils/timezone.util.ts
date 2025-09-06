/**
 * Timezone utilities for Tashkent/Uzbekistan (UTC+5)
 */

export const TASHKENT_TIMEZONE = 'Asia/Tashkent';
export const TASHKENT_OFFSET = '+05:00';

/**
 * Get current date in Tashkent timezone
 */
export function getTashkentDate(): Date {
  const now = new Date();
  // Create a new date with proper Tashkent timezone offset
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const tashkentTime = new Date(utcTime + (5 * 3600000)); // UTC+5
  return tashkentTime;
}

/**
 * Parse a date string in Tashkent timezone
 * @param dateString - Date string in YYYY-MM-DD format
 */
export function parseTashkentDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00' + TASHKENT_OFFSET);
}

/**
 * Get start of day in Tashkent timezone, returns UTC date for database queries
 * @param date - The date to get start of day for (defaults to current date)
 */
export function getTashkentStartOfDay(date: Date = new Date()): Date {
  // Convert input date to Tashkent timezone
  const inputYear = date.getFullYear();
  const inputMonth = date.getMonth();
  const inputDay = date.getDate();
  
  // Create start of day in Tashkent timezone (00:00:00)
  const tashkentStartOfDay = new Date(inputYear, inputMonth, inputDay, 0, 0, 0, 0);
  
  // Convert Tashkent time to UTC for database storage
  // Subtract 5 hours (Tashkent is UTC+5)
  return new Date(tashkentStartOfDay.getTime() - (5 * 3600000));
}

/**
 * Get end of day in Tashkent timezone, returns UTC date for database queries
 * @param date - The date to get end of day for (defaults to current date)
 */
export function getTashkentEndOfDay(date: Date = new Date()): Date {
  // Convert input date to Tashkent timezone
  const inputYear = date.getFullYear();
  const inputMonth = date.getMonth();
  const inputDay = date.getDate();
  
  // Create end of day in Tashkent timezone (23:59:59.999)
  const tashkentEndOfDay = new Date(inputYear, inputMonth, inputDay, 23, 59, 59, 999);
  
  // Convert Tashkent time to UTC for database storage
  // Subtract 5 hours (Tashkent is UTC+5)
  return new Date(tashkentEndOfDay.getTime() - (5 * 3600000));
}

/**
 * Get day of week in Tashkent timezone
 */
export function getTashkentDayOfWeek(date: Date = new Date()): number {
  // If a specific date is passed, convert it to Tashkent timezone
  if (date !== new Date()) {
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const tashkentTime = new Date(utcTime + (5 * 3600000));
    return tashkentTime.getDay();
  }
  return getTashkentDate().getDay();
}

/**
 * Format date for Tashkent timezone
 */
export function formatTashkentDate(date: Date, format: 'iso' | 'date' | 'datetime' = 'iso'): string {
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const tashkentDate = new Date(utcTime + (5 * 3600000));
  
  switch (format) {
    case 'date':
      return tashkentDate.toISOString().split('T')[0];
    case 'datetime':
      return tashkentDate.toISOString();
    default:
      return tashkentDate.toISOString();
  }
}

/**
 * Get today's date string in YYYY-MM-DD format in Tashkent timezone
 */
export function getTashkentDateString(): string {
  const tashkentDate = getTashkentDate();
  const year = tashkentDate.getFullYear();
  const month = String(tashkentDate.getMonth() + 1).padStart(2, '0');
  const day = String(tashkentDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

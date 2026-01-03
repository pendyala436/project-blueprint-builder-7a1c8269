/**
 * Calendar Date utility - Inspired by bradenmacdonald/CalendarDate
 * Proper date calculations for calendar grids without timezone issues
 */

/** Array that represents the cumulative number of days in a non-leap year up to the start of a given month */
const MONTH_SUMS_NORMAL_YEAR = Object.freeze([
  NaN, // we use 1-indexed months, so there's no entry at the zero index.
  0,
  31,
  59,
  90,
  120,
  151,
  181,
  212,
  243,
  273,
  304,
  334,
]);

/** Days in each month (1-indexed, February handled separately) */
const DAYS_IN_MONTH = Object.freeze([
  NaN, // 0 - not used
  31,  // 1 - January
  28,  // 2 - February (default, leap year handled in function)
  31,  // 3 - March
  30,  // 4 - April
  31,  // 5 - May
  30,  // 6 - June
  31,  // 7 - July
  31,  // 8 - August
  30,  // 9 - September
  31,  // 10 - October
  30,  // 11 - November
  31,  // 12 - December
]);

export const MONTH_NAMES = Object.freeze([
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]);

export const DAY_NAMES = Object.freeze(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
export const DAY_NAMES_SHORT = Object.freeze(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);

/**
 * Check if a year is a leap year
 * Rules: divisible by 4, except centuries unless divisible by 400
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0) && (year % 100 !== 0 || year % 400 === 0);
}

/**
 * Get the number of days in a month
 * @param year Full year (e.g., 2025)
 * @param month 1-indexed month (1 = January, 12 = December)
 */
export function daysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Must be 1-12.`);
  }
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return DAYS_IN_MONTH[month];
}

/**
 * Get the day of week for a given date
 * @returns 0 = Sunday, 6 = Saturday
 */
export function getDayOfWeek(year: number, month: number, day: number): number {
  // Zeller's formula adapted for Gregorian calendar
  // Adjust month and year for Zeller's formula
  let m = month;
  let y = year;
  if (m < 3) {
    m += 12;
    y -= 1;
  }
  
  const k = y % 100;
  const j = Math.floor(y / 100);
  
  const h = (day + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7;
  
  // Convert to Sunday = 0 format
  return ((h + 6) % 7);
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDateString(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Parse a YYYY-MM-DD string
 */
export function parseDateString(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

/**
 * Check if two dates are the same
 */
export function isSameDate(
  year1: number, month1: number, day1: number,
  year2: number, month2: number, day2: number
): boolean {
  return year1 === year2 && month1 === month2 && day1 === day2;
}

/**
 * Check if a date is today
 */
export function isToday(year: number, month: number, day: number): boolean {
  const now = new Date();
  return isSameDate(
    year, month, day,
    now.getFullYear(), now.getMonth() + 1, now.getDate()
  );
}

/**
 * Get today's date components
 */
export function getToday(): { year: number; month: number; day: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1, // Convert to 1-indexed
    day: now.getDate()
  };
}

export interface CalendarDay {
  year: number;
  month: number; // 1-indexed
  day: number;
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Sunday
  dayName: string;
  dayNameShort: string;
  isToday: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number; // 1-indexed
  name: string; // e.g., "January 2025"
  monthName: string; // e.g., "January"
  daysCount: number;
  days: CalendarDay[];
  firstDayOfWeek: number; // 0 = Sunday
}

/**
 * Generate a calendar month with all its days
 * @param year Full year
 * @param month 1-indexed month (1 = January)
 */
export function generateCalendarMonth(year: number, month: number): CalendarMonth {
  const daysCount = daysInMonth(year, month);
  const days: CalendarDay[] = [];
  
  for (let day = 1; day <= daysCount; day++) {
    const dayOfWeek = getDayOfWeek(year, month, day);
    days.push({
      year,
      month,
      day,
      dateStr: formatDateString(year, month, day),
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      dayNameShort: DAY_NAMES_SHORT[dayOfWeek],
      isToday: isToday(year, month, day)
    });
  }
  
  return {
    year,
    month,
    name: `${MONTH_NAMES[month - 1]} ${year}`,
    monthName: MONTH_NAMES[month - 1],
    daysCount,
    days,
    firstDayOfWeek: getDayOfWeek(year, month, 1)
  };
}

/**
 * Add months to a year/month pair
 * @param year Current year
 * @param month Current month (1-indexed)
 * @param delta Number of months to add (can be negative)
 */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const totalMonths = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(totalMonths / 12),
    month: (totalMonths % 12) + 1
  };
}

/**
 * Generate multiple calendar months starting from a given month
 * @param startYear Starting year
 * @param startMonth Starting month (1-indexed)
 * @param count Number of months to generate
 */
export function generateCalendarMonths(
  startYear: number,
  startMonth: number,
  count: number
): CalendarMonth[] {
  const months: CalendarMonth[] = [];
  
  for (let i = 0; i < count; i++) {
    const { year, month } = addMonths(startYear, startMonth, i);
    months.push(generateCalendarMonth(year, month));
  }
  
  return months;
}

/**
 * Generate calendar months from current month
 * @param count Number of months to generate
 */
export function generateCalendarMonthsFromNow(count: number): CalendarMonth[] {
  const today = getToday();
  return generateCalendarMonths(today.year, today.month, count);
}

/**
 * Compare two dates
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
export function compareDates(
  year1: number, month1: number, day1: number,
  year2: number, month2: number, day2: number
): number {
  if (year1 !== year2) return year1 - year2;
  if (month1 !== month2) return month1 - month2;
  return day1 - day2;
}

/**
 * Check if first date is before second date
 */
export function isBefore(
  year1: number, month1: number, day1: number,
  year2: number, month2: number, day2: number
): boolean {
  return compareDates(year1, month1, day1, year2, month2, day2) < 0;
}

/**
 * Check if first date is after second date
 */
export function isAfter(
  year1: number, month1: number, day1: number,
  year2: number, month2: number, day2: number
): boolean {
  return compareDates(year1, month1, day1, year2, month2, day2) > 0;
}

/**
 * Get month name from 1-indexed month
 */
export function getMonthName(month: number): string {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Must be 1-12.`);
  }
  return MONTH_NAMES[month - 1];
}

/**
 * Validate a date
 */
export function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  if (day > daysInMonth(year, month)) return false;
  return true;
}

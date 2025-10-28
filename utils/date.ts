export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function subtractMinutes(date: Date, minutes: number): Date {
  return addMinutes(date, -minutes);
}

export function setTimeOfDay(base: Date, hours: number, minutes: number): Date {
  const result = new Date(base.getTime());
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function subtractWeeks(date: Date, weeks: number): Date {
  return subtractDays(date, weeks * 7);
}

export function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setMonth(result.getMonth() - months);
  return result;
}

export function startOfMonth(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function formatWeekdayShort(date: Date, locale: string = 'es-ES'): string {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const label = formatter.format(date);
  return label.charAt(0).toUpperCase();
}

export function formatMonthShort(date: Date, locale: string = 'es-ES'): string {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'short' });
  return formatter.format(date).toUpperCase();
}


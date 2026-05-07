import dayjs from 'dayjs';

/**
 * Get the start of the week (Monday) for a given date
 */
export function getWeekStart(date: Date | string): string {
  const d = dayjs(date);
  const weekStart = d.startOf('week').add(1, 'day'); // MUI starts week on Sunday, we want Monday
  return weekStart.format('YYYY-MM-DD');
}

/**
 * Get the end of the week (Sunday) for a given date
 */
export function getWeekEnd(date: Date | string): string {
  const d = dayjs(date);
  const weekEnd = d.endOf('week');
  return weekEnd.format('YYYY-MM-DD');
}

/**
 * Format a date string to human-readable format
 */
export function formatDate(date: string): string {
  return dayjs(date).format('DD MMM YYYY');
}

/**
 * Format a date and time for display
 */
export function formatDateTime(date: string, time: string): string {
  return `${formatDate(date)} at ${time}`;
}

/**
 * Calculate duration in hours between start and end time
 */
export function calculateDurationHours(startTime: string, endTime: string): number {
  const start = dayjs(`2000-01-01 ${startTime}`);
  const end = dayjs(`2000-01-01 ${endTime}`);
  return end.diff(start, 'hour', true);
}

/**
 * Check if a date is between two dates (inclusive)
 */
export function isBetweenDates(date: string, startDate: string, endDate: string): boolean {
  const d = dayjs(date);
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  return d.isAfter(start) && d.isBefore(end) || d.isSame(start) || d.isSame(end);
}

/**
 * Get last N days
 */
export function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'));
  }
  return days;
}

/**
 * Get next N days
 */
export function getNext30Days(): string[] {
  const days: string[] = [];
  for (let i = 0; i < 30; i++) {
    days.push(dayjs().add(i, 'day').format('YYYY-MM-DD'));
  }
  return days;
}

/**
 * Compare two qualifications arrays
 */
export function hasRequiredQualifications(
  staffQualifications: string[],
  requiredQualifications: string[]
): boolean {
  if (requiredQualifications.length === 0) return true;
  return requiredQualifications.some((q) => staffQualifications.includes(q));
}

/**
 * Generate a formatted email preview for a week of assignments
 */
export function generateWeeklyEmailPreview(
  staffName: string,
  weekOf: string,
  assignments: Array<{
    eventName: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    hoursAllocated: number;
  }>
): string {
  const weekEnd = dayjs(weekOf).add(6, 'day').format('DD MMM YYYY');
  const header = `Hello ${staffName},\n\nHere are your assignments for the week of ${formatDate(weekOf)} to ${weekEnd}:\n\n`;

  const body = assignments
    .map(
      (a) =>
        `• ${a.eventName}\n  Date: ${formatDate(a.date)}\n  Time: ${a.startTime} - ${a.endTime}\n  Location: ${a.location}\n  Hours: ${a.hoursAllocated}h\n`
    )
    .join('\n');

  const totalHours = assignments.reduce((sum, a) => sum + a.hoursAllocated, 0);
  const footer = `\nTotal hours for the week: ${totalHours}h\n\nPlease confirm your availability.\n\nBest regards,\nOCHI Scheduling Team`;

  return `${header}${body}${footer}`;
}

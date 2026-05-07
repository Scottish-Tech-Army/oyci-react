import { describe, it, expect } from 'vitest';
import {
  calculateDurationHours,
  isBetweenDates,
  hasRequiredQualifications,
  formatDate,
  getWeekStart,
} from '../helpers';

describe('calculateDurationHours', () => {
  it('returns 2.5 for 09:00 to 11:30', () => {
    expect(calculateDurationHours('09:00', '11:30')).toBe(2.5);
  });

  it('returns 8 for a full work day', () => {
    expect(calculateDurationHours('09:00', '17:00')).toBe(8);
  });

  it('returns 0.5 for a 30-minute slot', () => {
    expect(calculateDurationHours('12:00', '12:30')).toBe(0.5);
  });
});

describe('isBetweenDates', () => {
  it('returns true for a date within range', () => {
    expect(isBetweenDates('2024-03-15', '2024-03-10', '2024-03-20')).toBe(true);
  });

  it('returns true for a date on the start boundary', () => {
    expect(isBetweenDates('2024-03-10', '2024-03-10', '2024-03-20')).toBe(true);
  });

  it('returns true for a date on the end boundary', () => {
    expect(isBetweenDates('2024-03-20', '2024-03-10', '2024-03-20')).toBe(true);
  });

  it('returns false for a date outside range', () => {
    expect(isBetweenDates('2024-03-05', '2024-03-10', '2024-03-20')).toBe(false);
  });
});

describe('hasRequiredQualifications', () => {
  it('returns true when staff has matching qualification', () => {
    expect(hasRequiredQualifications(['Safeguarding', 'First Aid'], ['Safeguarding'])).toBe(true);
  });

  it('returns true when no qualifications are required', () => {
    expect(hasRequiredQualifications([], [])).toBe(true);
  });

  it('returns false when staff has none of the required qualifications', () => {
    expect(hasRequiredQualifications(['First Aid'], ['Safeguarding'])).toBe(false);
  });
});

describe('formatDate', () => {
  it('formats a date string to human-readable form', () => {
    expect(formatDate('2024-03-15')).toBe('15 Mar 2024');
  });
});

describe('getWeekStart', () => {
  it('returns Monday for a mid-week date', () => {
    // 2024-03-20 is a Wednesday
    expect(getWeekStart('2024-03-20')).toBe('2024-03-18');
  });
});

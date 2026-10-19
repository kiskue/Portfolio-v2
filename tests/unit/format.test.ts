import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatInstalls,
  formatNumber,
  formatRatingCount,
  formatRatingValue,
  installBandValue,
  isISODate,
  parseISODate,
} from '@/lib/format';

describe('dates', () => {
  it('formats ISO dates as "Oct 19, 2026" regardless of time zone', () => {
    expect(formatDate('2026-10-19')).toBe('Oct 19, 2026');
    expect(formatDate('2025-03-27')).toBe('Mar 27, 2025');
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026');
    expect(formatDate('2026-12-31')).toBe('Dec 31, 2026');
  });

  it('parses and validates ISO dates', () => {
    expect(parseISODate('2026-10-19')).toEqual({ year: 2026, month: 10, day: 19 });
    expect(parseISODate('2026-02-30')).toBeNull();
    expect(parseISODate('2026-13-01')).toBeNull();
    expect(parseISODate('19/10/2026')).toBeNull();
    expect(isISODate('2024-02-29')).toBe(true);
    expect(isISODate('2026-2-3')).toBe(false);
  });

  it('throws on an invalid date instead of printing nonsense', () => {
    expect(() => formatDate('2026-02-30')).toThrow();
  });
});

describe('numbers', () => {
  it('groups thousands in en-US style', () => {
    expect(formatNumber(1240)).toBe('1,240');
    expect(formatNumber(48250)).toBe('48,250');
    expect(formatNumber(7)).toBe('7');
  });

  it('rounds to the requested fraction digits', () => {
    expect(formatNumber(4.2222, 1)).toBe('4.2');
    expect(formatNumber(1234.56)).toBe('1,235');
  });
});

describe('install bands and ratings', () => {
  it('reads the lower bound of an install band', () => {
    expect(installBandValue('0+')).toBe(0);
    expect(installBandValue('10+')).toBe(10);
    expect(installBandValue('1K+')).toBe(1_000);
    expect(installBandValue('5K+')).toBe(5_000);
    expect(installBandValue('1M+')).toBe(1_000_000);
  });

  it('formats installs as the store writes them', () => {
    expect(formatInstalls('5K+')).toBe('5K+ installs');
  });

  it('formats ratings to one decimal and counts with a plural', () => {
    expect(formatRatingValue(4.2222)).toBe('4.2');
    expect(formatRatingValue(5)).toBe('5.0');
    expect(formatRatingCount(27)).toBe('27 ratings');
    expect(formatRatingCount(1)).toBe('1 rating');
    expect(formatRatingCount(1200)).toBe('1,200 ratings');
  });
});

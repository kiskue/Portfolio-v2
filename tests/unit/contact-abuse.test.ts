import { describe, expect, it } from 'vitest';
import { checkAbuse } from '@/lib/contact/abuse';
import { MIN_FILL_MS } from '@/lib/contact/fields';

/*
 * Contact abuse controls (PLAN → Contact: honeypot, minimum fill time, length caps; S4.38). The
 * length caps are in contact-schema.test.ts.
 */

describe('honeypot', () => {
  it('passes when empty, even with stray whitespace', () => {
    expect(checkAbuse({ honeypot: '', fillMs: '' })).toBe('ok');
    expect(checkAbuse({ honeypot: '  ', fillMs: '' })).toBe('ok');
  });

  it('rejects any value', () => {
    expect(checkAbuse({ honeypot: 'https://spam.example', fillMs: '' })).toBe('honeypot');
    expect(checkAbuse({ honeypot: 'x', fillMs: String(MIN_FILL_MS * 10) })).toBe('honeypot');
  });

  it('wins over the timing check', () => {
    expect(checkAbuse({ honeypot: 'x', fillMs: '5' })).toBe('honeypot');
    expect(checkAbuse({ honeypot: 'x', fillMs: 'abc' })).toBe('honeypot');
  });
});

describe('minimum fill time', () => {
  it('is three seconds', () => {
    expect(MIN_FILL_MS).toBe(3000);
  });

  it('is not checked without a timing (a submission without JavaScript)', () => {
    expect(checkAbuse({ honeypot: '', fillMs: '' })).toBe('ok');
    expect(checkAbuse({ honeypot: '', fillMs: '   ' })).toBe('ok');
  });

  it('flags a submission sent sooner than the minimum', () => {
    expect(checkAbuse({ honeypot: '', fillMs: '0' })).toBe('too-fast');
    expect(checkAbuse({ honeypot: '', fillMs: String(MIN_FILL_MS - 1) })).toBe('too-fast');
  });

  it('passes at and after the minimum, however long the page was open', () => {
    expect(checkAbuse({ honeypot: '', fillMs: String(MIN_FILL_MS) })).toBe('ok');
    expect(checkAbuse({ honeypot: '', fillMs: '86400000' })).toBe('ok');
    // A tab left open for weeks (performance.now() keeps counting) is still a person.
    expect(checkAbuse({ honeypot: '', fillMs: String(40 * 86_400_000) })).toBe('ok');
  });

  it('treats values the island never writes as tampering', () => {
    for (const fillMs of ['abc', '-5', '1.5', '1e9', '0x10', ' 12 34', String(Number.MAX_SAFE_INTEGER) + '0']) {
      expect(checkAbuse({ honeypot: '', fillMs }), fillMs).toBe('malformed-timing');
    }
  });

  it('takes another minimum when given one', () => {
    expect(checkAbuse({ honeypot: '', fillMs: '1500' }, 1000)).toBe('ok');
    expect(checkAbuse({ honeypot: '', fillMs: '999' }, 1000)).toBe('too-fast');
  });
});

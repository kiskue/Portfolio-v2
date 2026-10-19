import { describe, expect, it } from 'vitest';
import type { Meta } from '@/content/types';
import {
  SEGMENT_SEPARATOR,
  fieldOrNull,
  hasToken,
  isPlaceholder,
  orPlaceholder,
  ph,
  placeholderText,
  segmentText,
  segments,
  visible,
} from '@/lib/placeholder';

describe('ph', () => {
  it('wraps text in a whole token', () => {
    expect(ph('Your title at DGSI')).toBe('[[Your title at DGSI]]');
    expect(ph('  YYYY  ')).toBe('[[YYYY]]');
  });

  it('rejects blank text and nested brackets', () => {
    expect(() => ph('')).toThrow();
    expect(() => ph('   ')).toThrow();
    expect(() => ph('a [[b]]')).toThrow();
    expect(() => ph('a ]] b')).toThrow();
  });
});

describe('isPlaceholder', () => {
  it('accepts exactly one whole token', () => {
    expect(isPlaceholder('[[N]]')).toBe(true);
    expect(isPlaceholder(ph('Open to roles & projects'))).toBe(true);
  });

  it('rejects plain text, embedded tokens, several tokens and empty tokens', () => {
    expect(isPlaceholder('Taguig City')).toBe(false);
    expect(isPlaceholder('Title: [[x]]')).toBe(false);
    expect(isPlaceholder('[[x]] years')).toBe(false);
    expect(isPlaceholder('[[a]] · [[b]]')).toBe(false);
    expect(isPlaceholder('[[a]]]')).toBe(false);
    expect(isPlaceholder('[[]]')).toBe(false);
    expect(isPlaceholder('[[  ]]')).toBe(false);
    expect(isPlaceholder('')).toBe(false);
  });
});

describe('hasToken and placeholderText', () => {
  it('detects brackets anywhere', () => {
    expect(hasToken('plain')).toBe(false);
    expect(hasToken('a [[b]] c')).toBe(true);
    expect(hasToken('stray ]]')).toBe(true);
  });

  it('unwraps a token', () => {
    expect(placeholderText(ph('N'))).toBe('N');
  });
});

describe('visible', () => {
  interface Item extends Meta {
    readonly id: string;
    readonly title: string;
  }
  const items: readonly Item[] = [
    { id: 'plain', title: 'Shipped app' },
    { id: 'token', title: ph('Your title') },
    { id: 'example', title: 'Example quote', example: true },
    { id: 'hidden', title: 'Not ready', hidden: true },
    { id: 'hidden-example', title: 'Both', hidden: true, example: true },
  ];
  const ids = (list: readonly Item[]) => list.map((item) => item.id);

  it('drops hidden items in every mode', () => {
    expect(ids(visible(items, 'label'))).not.toContain('hidden');
    expect(ids(visible(items, 'hide'))).not.toContain('hidden');
  });

  it('keeps example items in label mode and drops them in hide mode', () => {
    expect(ids(visible(items, 'label'))).toEqual(['plain', 'token', 'example']);
    expect(ids(visible(items, 'hide'))).toEqual(['plain', 'token']);
  });

  it('never drops an item for carrying a token field (fields hide, not items)', () => {
    expect(ids(visible(items, 'hide'))).toContain('token');
  });
});

describe('fieldOrNull', () => {
  it('keeps every non-blank field in label mode', () => {
    expect(fieldOrNull('Taguig City', 'label')).toBe('Taguig City');
    expect(fieldOrNull(ph('YYYY'), 'label')).toBe('[[YYYY]]');
  });

  it('removes token fields in hide mode', () => {
    expect(fieldOrNull(ph('YYYY'), 'hide')).toBeNull();
    expect(fieldOrNull('Taguig City', 'hide')).toBe('Taguig City');
  });

  it('never leaks an embedded token in hide mode', () => {
    expect(fieldOrNull('Since [[YYYY]]', 'hide')).toBeNull();
  });

  it('treats blank and missing fields as nothing to show', () => {
    expect(fieldOrNull('', 'label')).toBeNull();
    expect(fieldOrNull('   ', 'label')).toBeNull();
    expect(fieldOrNull(null, 'label')).toBeNull();
    expect(fieldOrNull(undefined, 'hide')).toBeNull();
  });
});

describe('segments and segmentText', () => {
  const contactLine = ['Taguig City', 'GMT+8', ph('I reply within 1–2 business days')];

  it('keeps token segments in label mode', () => {
    expect(segments(contactLine, 'label')).toEqual(['Taguig City', 'GMT+8', '[[I reply within 1–2 business days]]']);
  });

  it('skips token segments in hide mode so no separator dangles', () => {
    expect(segments(contactLine, 'hide')).toEqual(['Taguig City', 'GMT+8']);
    expect(segmentText(contactLine, 'hide')).toBe(`Taguig City${SEGMENT_SEPARATOR}GMT+8`);
  });

  it('skips blank segments in every mode', () => {
    expect(segments(['', 'a', '  ', 'b'], 'label')).toEqual(['a', 'b']);
  });

  it('returns null text when nothing is visible', () => {
    expect(segmentText([ph('Role'), ph('Company')], 'hide')).toBeNull();
    expect(segmentText([], 'label')).toBeNull();
  });

  it('joins with the meta-line separator', () => {
    expect(SEGMENT_SEPARATOR).toBe(' · ');
    expect(segmentText(['Company', 'DGSI'], 'label')).toBe('Company · DGSI');
  });
});

describe('orPlaceholder (nullable facts such as years and the CV)', () => {
  const token = ph('N');

  it('returns the value when set, in both modes', () => {
    expect(orPlaceholder(5, token, 'label')).toBe(5);
    expect(orPlaceholder('/cv.pdf', token, 'hide')).toBe('/cv.pdf');
  });

  it('returns the token in label mode and nothing in hide mode when null', () => {
    expect(orPlaceholder(null, token, 'label')).toBe('[[N]]');
    expect(orPlaceholder(null, token, 'hide')).toBeNull();
  });
});

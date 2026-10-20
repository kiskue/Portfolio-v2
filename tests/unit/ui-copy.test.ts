import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Copy, MetaLine, renderField } from '@/components/ui/copy';
import { CvLink, Years } from '@/components/ui/placeholder-facts';
import { cvState, YEARS_TOKEN, yearsValue } from '@/components/ui/placeholder-values';
import { ph } from '@/lib/placeholder';

const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

describe('Copy', () => {
  it('renders plain text without a wrapper unless asked for one', () => {
    expect(html(createElement(Copy, { text: 'Plain', mode: 'label' }))).toBe('Plain');
    expect(html(createElement(Copy, { text: 'Plain', as: 'p', className: 'x', mode: 'label' }))).toBe(
      '<p class="x">Plain</p>',
    );
  });

  it('label mode: a whole token renders as <mark class="ph"> with its inner text and an sr-only note', () => {
    const markup = html(createElement(Copy, { text: ph('Your title'), as: 'span', mode: 'label' }));
    expect(markup).toMatch(/^<span><mark class="ph [^"]*">Your title<span class="sr-only"> \(placeholder\)<\/span><\/mark><\/span>$/);
    expect(markup).not.toContain('[[');
  });

  it('hide mode: a token field renders nothing at all (no empty wrapper)', () => {
    expect(html(createElement(Copy, { text: ph('Your title'), as: 'p', mode: 'hide' }))).toBe('');
  });

  it('renders nothing for null, undefined and blank fields', () => {
    for (const text of [null, undefined, '', '   ']) {
      expect(html(createElement(Copy, { text, as: 'p', mode: 'label' }))).toBe('');
    }
  });

  it('never leaks raw brackets from a malformed embedded token', () => {
    const markup = html(createElement('p', null, renderField('Reply within [[N]] days')));
    expect(markup).not.toContain('[[');
    expect(markup).toContain('<mark class="ph');
    expect(html(createElement(Copy, { text: 'Reply within [[N]] days', mode: 'hide' }))).toBe('');
  });
});

describe('MetaLine', () => {
  const segs = ['Taguig City, PH', 'GMT+8', ph('I reply within 1–2 business days')] as const;

  it('label mode joins every segment with a decorative dot and a screen-reader comma', () => {
    const markup = html(createElement(MetaLine, { segments: segs, mode: 'label' }));
    expect(markup.match(/aria-hidden="true"> · </g)).toHaveLength(2);
    expect(markup.match(/class="sr-only">, </g)).toHaveLength(2);
    expect(markup).toContain('<mark class="ph');
  });

  it('hide mode drops token segments without leaving a dangling separator', () => {
    const markup = html(createElement(MetaLine, { segments: segs, mode: 'hide' }));
    expect(markup.match(/aria-hidden="true"> · </g)).toHaveLength(1);
    expect(markup).not.toContain('mark');
    expect(markup.endsWith('GMT+8</p>')).toBe(true);
  });

  it('renders nothing when no segment is visible', () => {
    expect(html(createElement(MetaLine, { segments: [ph('a'), '', ph('b')], mode: 'hide' }))).toBe('');
  });
});

describe('years and CV placeholders', () => {
  it('yearsValue: the number, the [[N]] token in label mode, null in hide mode', () => {
    expect(yearsValue(6, 'label')).toBe('6');
    expect(yearsValue(6, 'hide')).toBe('6');
    expect(yearsValue(null, 'label')).toBe(YEARS_TOKEN);
    expect(YEARS_TOKEN).toBe('[[N]]');
    expect(yearsValue(null, 'hide')).toBeNull();
  });

  it('Years renders "[[N]]+ years" with N marked in label mode and nothing in hide mode', () => {
    const label = html(createElement(Years, { years: null, mode: 'label' }));
    expect(label).toMatch(/^<mark class="ph [^"]*">N<span class="sr-only"> \(placeholder\)<\/span><\/mark>\+ years$/);
    expect(html(createElement(Years, { years: 4, suffix: '+', mode: 'label' }))).toBe('4+');
    expect(html(createElement(Years, { years: null, as: 'p', mode: 'hide' }))).toBe('');
  });

  it('cvState: same-origin files download, other URLs open in a new tab, null is a placeholder or nothing', () => {
    expect(cvState('/cv.pdf', 'hide')).toEqual({ kind: 'link', href: '/cv.pdf', download: true });
    expect(cvState('https://example.com/cv.pdf', 'label')).toEqual({
      kind: 'link',
      href: 'https://example.com/cv.pdf',
      download: false,
    });
    expect(cvState('//cdn.example.com/cv.pdf', 'label')).toMatchObject({ download: false });
    expect(cvState(null, 'label')).toEqual({ kind: 'placeholder' });
    expect(cvState('  ', 'label')).toEqual({ kind: 'placeholder' });
    expect(cvState(null, 'hide')).toEqual({ kind: 'none' });
  });

  it('CvLink: a non-link placeholder chip in label mode, nothing in hide mode, a download link when set', () => {
    const chip = html(createElement(CvLink, { href: null, mode: 'label' }));
    expect(chip).not.toContain('<a');
    expect(chip).toContain('Download CV');
    expect(chip).toContain('(placeholder)');
    expect(html(createElement(CvLink, { href: null, mode: 'hide' }))).toBe('');
    const link = html(createElement(CvLink, { href: '/cv.pdf', mode: 'hide' }));
    expect(link).toMatch(/^<a href="\/cv\.pdf" download=""/);
  });
});

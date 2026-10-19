import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/cn';

describe('cn', () => {
  it('joins conditional classes', () => {
    expect(cn('a', false, null, undefined, { b: true, c: false }, ['d'])).toBe('a b d');
  });

  it('lets later Tailwind classes win', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('bg-surface', 'bg-raised')).toBe('bg-raised');
  });

  it('keeps a custom text size next to a text colour', () => {
    expect(cn('text-display', 'text-ink')).toBe('text-display text-ink');
    expect(cn('text-body-sm', 'text-ink-3')).toBe('text-body-sm text-ink-3');
  });

  it('resolves conflicts between custom sizes, radii and easings', () => {
    expect(cn('text-h1', 'text-h2')).toBe('text-h2');
    expect(cn('text-sm', 'text-card-title')).toBe('text-card-title');
    expect(cn('rounded-card', 'rounded-control')).toBe('rounded-control');
    expect(cn('rounded-lg', 'rounded-bento')).toBe('rounded-bento');
    expect(cn('ease-out', 'ease-emph')).toBe('ease-emph');
  });
});

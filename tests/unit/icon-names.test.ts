import * as lucide from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { ICON_NAMES } from '@/content/types';

const exported = lucide as unknown as Readonly<Record<string, unknown>>;

/** "message-square-quote" → "MessageSquareQuote": the lucide-react export the Icon registry maps. */
function lucideExportName(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

describe('IconName keys', () => {
  it('lists every key once', () => {
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
  });

  it.each(ICON_NAMES)('%s is a lucide-react 1.59 icon', (name) => {
    expect(exported[lucideExportName(name)]).toBeDefined();
  });
});

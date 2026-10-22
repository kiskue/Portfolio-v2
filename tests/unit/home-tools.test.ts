import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToolsStrip } from '@/components/sections/home/tools-strip';
import { home } from '@/content/home';
import { tools } from '@/content/tools';

/*
 * The tools strip (design §4.2; items S2.05–S2.08, S2.M2) as server HTML: what renders before
 * JavaScript, plus the CSS contract that keeps it still without JavaScript and under reduced motion.
 */

const html = renderToStaticMarkup(createElement(ToolsStrip));
const css = readFileSync(fileURLToPath(new URL('../../src/components/sections/home/tools-strip.css', import.meta.url)), 'utf8');

describe('ToolsStrip markup', () => {
  it('is a section named by its h2 under the Daily drivers eyebrow, with the selectors QA relies on', () => {
    expect(html).toMatch(/^<section aria-labelledby="tools-title" class="ts" data-section="tools">/);
    // The one heading block (SectionHeader, reuse rule 5) at card size.
    expect(html).toMatch(new RegExp(`<p class="[^"]*text-eyebrow text-accent-ink uppercase">${home.tools.eyebrow}</p>`));
    expect(html).toMatch(new RegExp(`<h2 id="tools-title" class="[^"]*text-card-title[^"]*">${home.tools.title}</h2>`));
    expect(html.match(/data-marquee=""/g)).toHaveLength(1);
  });

  it('lists every tool, then the same list again as an aria-hidden copy for the loop', () => {
    const lists = [...html.matchAll(/<ul class="ts-list[^"]*"[^>]*>([\s\S]*?)<\/ul>/g)];
    expect(lists).toHaveLength(2);
    expect(lists[1]?.[0]).toMatch(/^<ul class="ts-list ts-copy" aria-hidden="true">/);
    for (const [, items] of lists) {
      expect(items?.match(/<li class="ts-item">/g)).toHaveLength(tools.length);
      for (const tool of tools) expect(items).toContain(tool.label.replace('&', '&amp;'));
    }
    // Only the label and glyph reach the page: the evidence stays build-time data.
    for (const tool of tools) expect(html).not.toContain(tool.evidence.note.slice(0, 40));
  });

  it('renders still: no data-ready or data-running before hydration, and the Pause button named for QA', () => {
    expect(html).not.toContain('data-ready');
    expect(html).not.toContain('data-running');
    expect(html).toContain('aria-label="Pause animation"');
    expect(html).toContain(`aria-expanded="false"`);
    expect(html).toContain(`>Show all ${tools.length}</button>`);
  });
});

describe('ToolsStrip CSS contract', () => {
  it('animates only once hydrated, and only while running and not hovered or focused', () => {
    expect(css).toMatch(/\.ts\[data-ready\] \.ts-track \{\s*animation: ts-marquee var\(--dur-marquee\) linear infinite;\s*animation-play-state: paused;/);
    expect(css).toMatch(/\.ts\[data-ready\]\[data-running\] \.ts-track \{\s*animation-play-state: running;/);
    expect(css).toMatch(/\.ts\[data-ready\]\[data-running\]:focus-within \.ts-track \{\s*animation-play-state: paused;/);
    expect(css).toMatch(/@media \(hover: hover\) \{\s*\.ts\[data-ready\]\[data-running\]:hover \.ts-track \{\s*animation-play-state: paused;/);
  });

  it('turns into still, wrapped chips under both forms of reduced motion', () => {
    const reduced = css.slice(css.indexOf(':root[data-motion="reduce"] {'), css.indexOf('@media (prefers-reduced-motion: reduce)'));
    const media = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const block of [reduced, media]) {
      expect(block).toMatch(/& \.ts-track \{\s*display: block;\s*width: auto;\s*animation: none;/);
      expect(block).toMatch(/& \.ts-copy \{\s*display: none;/);
      expect(block).toMatch(/& \.ts-list \{\s*flex-wrap: wrap;/);
      expect(block).toContain('li:nth-child(n + 13)');
    }
    expect(media).toContain(':root:not([data-motion])');
  });
});

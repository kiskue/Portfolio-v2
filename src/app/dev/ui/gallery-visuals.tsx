import { BrandGlyph } from '@/components/ui/brand-glyph';
import { Icon } from '@/components/ui/icon';
import { IconTile } from '@/components/ui/icon-tile';
import { StatusDot, StatusLegend } from '@/components/ui/status-dot';
import { STATUS_LABEL } from '@/components/ui/status';
import { ICON_NAMES, STATUSES } from '@/content/types';
import { DemoSection, Row } from './demo-section';
import { toolGlyphs } from './samples';

const TILE_SIZES = [20, 24, 28, 32] as const;

export function IconsDemo() {
  return (
    <DemoSection
      title="Icon · IconTile"
      note="Every IconName in the registry (decorative, aria-hidden). Solid tiles: accent fill with the white glyph; soft tiles: tinted."
    >
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-x-3 gap-y-2">
        {ICON_NAMES.map((name) => (
          <li key={name} className="flex min-w-0 items-center gap-2 text-ink-2">
            <Icon name={name} size={20} />
            <span className="truncate font-mono text-fig text-ink-3">{name}</span>
          </li>
        ))}
      </ul>
      <Row label="labelled icon (role=img)">
        <Icon name="star" size={24} label="Rating" className="text-accent-ink" />
      </Row>
      <Row label="solid · 20 / 24 / 28 / 32">
        {TILE_SIZES.map((size) => (
          <IconTile key={size} icon="folder-open" size={size} />
        ))}
        <IconTile icon="sparkles" />
        <IconTile icon="rocket" />
        <IconTile icon="award" />
        <IconTile icon="message-square-quote" />
      </Row>
      <Row label="soft · 20 / 24 / 28 / 32">
        {TILE_SIZES.map((size) => (
          <IconTile key={size} icon="layers" tone="soft" size={size} />
        ))}
      </Row>
    </DemoSection>
  );
}

export function GlyphsDemo() {
  return (
    <DemoSection
      title="BrandGlyph"
      note="simple-icons by named import, LinkedIn's In mark, and monogram tiles for tools simple-icons lacks."
    >
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-x-3 gap-y-2">
        {toolGlyphs.map(({ label, glyph }) => (
          <li key={label} className="flex min-w-0 items-center gap-2 text-ink-2">
            <BrandGlyph glyph={glyph} />
            <span className="truncate text-meta">{label}</span>
          </li>
        ))}
      </ul>
      <Row label="sizes 16 / 18 / 24 / 32 · labelled (role=img)">
        <BrandGlyph glyph={{ kind: 'si', icon: 'siGithub' }} size={16} />
        <BrandGlyph glyph={{ kind: 'si', icon: 'siGithub' }} />
        <BrandGlyph glyph={{ kind: 'official', icon: 'linkedin' }} size={24} label="LinkedIn" />
        <BrandGlyph glyph={{ kind: 'monogram', text: 'Z' }} size={32} label="Zustand" />
      </Row>
    </DemoSection>
  );
}

export function StatusDemo() {
  return (
    <DemoSection title="StatusDot · StatusLegend" note="A distinct shape per status, never colour alone.">
      <Row label="10px and 8px">
        {STATUSES.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5 text-meta text-ink-2">
            <StatusDot status={status} />
            <StatusDot status={status} size={8} />
            {STATUS_LABEL[status]}
          </span>
        ))}
      </Row>
      <Row label="legend">
        <StatusLegend />
      </Row>
    </DemoSection>
  );
}

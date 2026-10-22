import { site } from '@/content/site';
import type { PlaceholderMode, SkillTier } from '@/content/types';
import { Chip, ExampleTag } from '@/components/ui/chip';
import { Copy } from '@/components/ui/copy';
import { cn } from '@/lib/cn';

export interface SkillTiersProps {
  /** Core, production-tested and working knowledge, already filtered with visible(). */
  readonly tiers: readonly SkillTier[];
  readonly mode?: PlaceholderMode;
}

const DEPTH_BARS: Readonly<Record<SkillTier['depth'], number>> = { core: 3, production: 2, working: 1 };
const BAR_HEIGHTS = ['h-1.5', 'h-2.5', 'h-3.5'] as const;

/** Three small bars, filled by depth: a decorative echo of the tier name, never the only cue. */
function DepthMeter({ depth }: { readonly depth: SkillTier['depth'] }) {
  const filled = DEPTH_BARS[depth];
  return (
    <span aria-hidden="true" className="inline-flex items-end gap-0.5">
      {BAR_HEIGHTS.map((height, bar) => (
        <span key={bar} className={cn('w-1 rounded-full', height, bar < filled ? 'bg-accent' : 'bg-line-strong/40')} />
      ))}
    </span>
  );
}

/**
 * Skill tiers (design §8): core, production-tested and working knowledge, each with its blurb
 * and the skills as chips. The tier name leads; a small depth meter repeats it visually.
 */
export function SkillTiers({ tiers, mode = site.placeholders }: SkillTiersProps) {
  return (
    <div className="flex flex-col divide-y divide-line" data-skill-tiers="">
      {tiers.map((tier) => (
        <div
          key={tier.depth}
          className="grid gap-3 py-6 first:pt-0 last:pb-0 @xl:grid-cols-[12rem_minmax(0,1fr)] @xl:gap-6"
          data-tier={tier.depth}
        >
          <div>
            <h3 className="flex items-center gap-2 text-card-title text-ink">
              <DepthMeter depth={tier.depth} />
              {tier.label}
            </h3>
            {mode === 'label' && tier.example === true ? <ExampleTag className="mt-2" /> : null}
            <Copy as="p" text={tier.blurb} mode={mode} className="mt-1 text-meta text-ink-3" />
          </div>
          <ul aria-label={`${tier.label} skills`} className="flex flex-wrap content-start gap-1.5">
            {tier.items.map((item) => (
              <li key={item}>
                <Chip size="sm" tone={tier.depth === 'core' ? 'accent' : 'neutral'}>
                  {item}
                </Chip>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

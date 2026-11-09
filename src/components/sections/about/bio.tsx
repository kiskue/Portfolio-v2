import { storeSummary } from '@/content/derived';
import { profile } from '@/content/profile';
import { site } from '@/content/site';
import type { Field, PlaceholderMode, StoreSummary } from '@/content/types';
import { Copy } from '@/components/ui/copy';
import { Years } from '@/components/ui/placeholder-facts';
import { yearsValue } from '@/components/ui/placeholder-values';
import { Stat } from '@/components/ui/stat';
import { formatDate } from '@/lib/format';
import { fieldOrNull } from '@/lib/placeholder';

export interface BioProps {
  /** profile.bio: three short paragraphs. */
  readonly paragraphs?: readonly Field[];
  /** profile.yearsOfExperience. */
  readonly years?: number | null;
  /** Store facts, derived from the listings (never hard-coded). */
  readonly store?: StoreSummary;
  readonly mode?: PlaceholderMode;
}

/** "6 on Google Play · 2 on the App Store · as of Oct 19, 2026": the breakdown under the listings stat. */
export function listingsFootnote(store: StoreSummary): string {
  return `${store.play} on Google Play · ${store.appstore} on the App Store · as of ${formatDate(store.asOf)}`;
}

/**
 * The bio (design §8: three short paragraphs) and the About stats: the store listings of the
 * apps I build (a fact about the apps, counted from the listings) and years of experience,
 * which shows as a marked "[[N]]+" placeholder in label mode and is left out in hide mode
 * until profile.yearsOfExperience is set.
 */
export function Bio({
  paragraphs = profile.bio,
  years = profile.yearsOfExperience,
  store = storeSummary,
  mode = site.placeholders,
}: BioProps) {
  const shown = paragraphs.filter((paragraph) => fieldOrNull(paragraph, mode) !== null);
  const showYears = yearsValue(years, mode) !== null;
  return (
    <div className="flex flex-col gap-8" data-section="bio">
      <div className="flex max-w-[65ch] flex-col gap-4">
        {shown.map((paragraph, index) => (
          <Copy
            key={index}
            as="p"
            text={paragraph}
            mode={mode}
            className={index === 0 ? 'text-lead text-ink' : 'text-body text-ink-2'}
          />
        ))}
      </div>
      <div>
        <ul aria-label="In numbers" className="flex flex-wrap gap-x-12 gap-y-6">
          {store.listings > 0 ? (
            <li data-stat="listings">
              <Stat value={String(store.listings)} label="store listings of apps I build" />
            </li>
          ) : null}
          {showYears ? (
            <li data-stat="years">
              <Stat value={<Years years={years} suffix="+" mode={mode} />} label="years shipping production apps" />
            </li>
          ) : null}
        </ul>
        {store.listings > 0 ? <p className="mt-3 text-meta text-ink-4">{listingsFootnote(store)}</p> : null}
      </div>
    </div>
  );
}

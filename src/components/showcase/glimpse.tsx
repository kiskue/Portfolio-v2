import './glimpse.css';
import { ViewTransition, type ReactNode } from 'react';
import {
  GlimpseBrandName,
  GlimpseCaption,
  GlimpseCaptionItem,
  GlimpseColumn,
  GlimpseControls,
  GlimpseCurrent,
  GlimpseDots,
  GlimpseFrame,
  GlimpsePicker,
  GlimpseRoot,
  GlimpseTrack,
} from '@/components/showcase/glimpse.client';
import { PHONE_SIZES, type PhoneSize } from '@/components/showcase/phone-frame';
import { ScreenView } from '@/components/showcase/screen-view';
import { TapLayer } from '@/components/showcase/tap-indicator';
import { Chip } from '@/components/ui/chip';
import { Copy, MetaLine } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';
import { SiteLink } from '@/components/ui/site-link';
import { appById, brandById, getFigure, glimpseById } from '@/content/derived';
import type { AppInfo, Glimpse as GlimpseData, GlimpseId, GlimpseStep } from '@/content/types';
import { brandVars } from '@/lib/brand-vars';
import { cn } from '@/lib/cn';
import { glimpsePlaylist, GLIMPSE_ROTATIONS, stepStates } from '@/lib/glimpse';
import { caseStudyHref } from '@/lib/routes';

/**
 * The compound client parts as one namespace (Glimpse.Root, .Track, .Frame, .Controls, .Dots,
 * plus .Caption, .CaptionItem, .BrandName, .Current, .Column and .Picker). It is built here, on
 * the server side, because a Server Component may not dot into a 'use client' module (React
 * throws "Cannot access Glimpse.Root on the server").
 */
export const Glimpse = {
  Root: GlimpseRoot,
  Track: GlimpseTrack,
  Frame: GlimpseFrame,
  Controls: GlimpseControls,
  Dots: GlimpseDots,
  Caption: GlimpseCaption,
  CaptionItem: GlimpseCaptionItem,
  BrandName: GlimpseBrandName,
  Current: GlimpseCurrent,
  Column: GlimpseColumn,
  Picker: GlimpsePicker,
} as const;

export interface GlimpsePlayerProps {
  /** One track per glimpse: three on Home (trio), one in a case-study hero. */
  readonly glimpses: readonly GlimpseId[];
  /**
   * trio: linked phone columns (the Home Projects stage); below a 400px container it becomes a
   * single phone with an app picker (design §5.3 "<448px card"). single: always one phone with
   * the picker. hero: the case-study hero phone with step dots and Pause, no links.
   */
  readonly layout: 'trio' | 'hero' | 'single';
  /**
   * A fixed phone size (trio: the centre phone; the sides are one size smaller), or 'inherit'
   * for the responsive sizes of design §5.3 (trio md/sm, lg/md… by container width; hero lg,
   * md when narrow; single md).
   */
  readonly size: PhoneSize | 'inherit';
  /**
   * Wrap each phone in <ViewTransition name="phone-<slug>" share="morph" default="none">, the
   * site's one View Transition (default true). Names must be unique per page: pass false on any
   * other player that shows the same app.
   */
  readonly morph?: boolean;
  /** Rotations before Replay (default 2, PLAN). */
  readonly rotations?: number;
  /** Prefix for the element ids (default: from the layout and glimpse ids). */
  readonly id?: string;
  readonly className?: string;
}

const CONTROL_ICONS = {
  pause: <Icon name="pause" size={16} />,
  play: <Icon name="play" size={16} />,
  replay: <Icon name="rotate-ccw" size={16} />,
} as const;

/** The next smaller phone size (xs stays xs). */
function smaller(size: PhoneSize): PhoneSize {
  return PHONE_SIZES[Math.max(PHONE_SIZES.indexOf(size) - 1, 0)] ?? size;
}

/** The --ps class for a track: a fixed size, or the layout's container-query sizes. */
function scaleClass(layout: GlimpsePlayerProps['layout'], size: PhoneSize | 'inherit', centre: boolean): string {
  if (size === 'inherit') return layout === 'trio' ? (centre ? 'gl-ps-auto-centre' : 'gl-ps-auto-side') : `gl-ps-auto-${layout}`;
  return `gl-ps-${layout === 'trio' && !centre ? smaller(size) : size}`;
}

function playerLabel(glimpses: readonly GlimpseData[], apps: readonly AppInfo[]): string {
  const [only] = glimpses;
  if (glimpses.length === 1 && only) return only.label;
  const names = apps.map((app) => app.name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join('');
  return `Previews of ${list}. Fictional data.`;
}

/** The FIG line for a step: "FIG 2.3" in mono, its caption, and an honest rollout note. */
function StepCaption({ step }: { readonly step: GlimpseStep }): ReactNode {
  const figure = getFigure(step.figure);
  const rollout = figure.rollout === 'in-rollout' ? 'In rollout' : figure.rollout === 'in-progress' ? 'In progress' : null;
  return (
    <>
      <span className="inline-block w-14 font-mono text-fig text-ink-2 uppercase">FIG {figure.id}</span>{' '}
      <Copy text={step.caption ?? figure.caption} />
      {rollout ? <span className="font-semibold text-ink-2"> · {rollout}</span> : null}
    </>
  );
}

/** Every step of one glimpse as server-rendered phones; the poster step adds its poster frame. */
function TrackFrames({ glimpse, track }: { readonly glimpse: GlimpseData; readonly track: number }): ReactNode {
  return glimpse.steps.flatMap((step, index) => {
    const states = stepStates(step, getFigure(step.figure).states[0]);
    const frames = [
      <GlimpseFrame key={`${index}-play`} track={track} step={index}>
        <ScreenView source={{ kind: 'replica', figure: step.figure, state: states.play }} size="inherit" brandMode="inherit" />
        <TapLayer taps={step.taps ?? []} />
      </GlimpseFrame>,
    ];
    if (index === glimpse.posterStep && states.poster !== states.play) {
      frames.unshift(
        <GlimpseFrame key={`${index}-poster`} track={track} step={index} kind="poster">
          <ScreenView source={{ kind: 'replica', figure: step.figure, state: states.poster }} size="inherit" brandMode="inherit" />
        </GlimpseFrame>,
      );
    }
    return frames;
  });
}

/**
 * Plays glimpses in phone frames (design §5.3, architecture D4). Every step of every track is
 * rendered here, on the server, through ScreenView (brandMode inherit: the track carries the
 * rotation's brand variables, or an enclosing BrandScope does); the client parts only flip
 * attributes. Without JavaScript, and under reduced motion, each track shows its poster step.
 */
export function GlimpsePlayer({ glimpses: ids, layout, size, morph = true, rotations = GLIMPSE_ROTATIONS, id, className }: GlimpsePlayerProps): ReactNode {
  const glimpses = ids.map(glimpseById);
  const apps = glimpses.map((glimpse) => appById(glimpse.app));
  const playlist = glimpsePlaylist(glimpses, (figure) => getFigure(figure).states[0], rotations);
  const prefix = id ?? `glimpse-${layout}-${ids.join('-').replaceAll('.', '-')}`;
  const centre = Math.floor((glimpses.length - 1) / 2);
  const linked = layout !== 'hero';

  return (
    <GlimpseRoot
      playlist={playlist}
      mode="auto"
      label={playerLabel(glimpses, apps)}
      layout={layout}
      hoverHold={layout === 'trio'}
      className={cn('gl', className)}
    >
      <div className="gl-inner">
        {linked && glimpses.length > 1 ? (
          <div className="gl-picker">
            <GlimpsePicker
              legend="Show app"
              options={apps.map((app) => ({ label: app.short, srLabel: app.short === app.name ? undefined : app.name }))}
            />
          </div>
        ) : null}

        <div className="gl-head">
          <GlimpseCaption className="gl-caption text-meta text-ink-3" id={`${prefix}-caption`}>
            {glimpses.map((glimpse, track) =>
              glimpse.steps.map((step, index) => (
                <GlimpseCaptionItem key={`${track}-${index}`} track={track} step={index}>
                  {linked ? (
                    <>
                      <MetaLine as="span" segments={apps[track]?.stageLabel ?? []} className="block font-semibold text-ink-2" />
                      <span className="sr-only">. </span>
                    </>
                  ) : null}
                  <StepCaption step={step} />
                  {glimpse.brandRotation && glimpse.brandRotation.length > 1
                    ? glimpse.brandRotation.map((brand, skin, all) => (
                        <GlimpseBrandName key={brand} track={track} index={skin} count={all.length}>
                          {' · '}
                          {brandById(brand).name}
                        </GlimpseBrandName>
                      ))
                    : null}
                </GlimpseCaptionItem>
              )),
            )}
          </GlimpseCaption>
          <div className="gl-toolbar">
            {glimpses.map((glimpse, track) => (
              <GlimpseDots
                key={glimpse.id}
                track={track}
                whenCurrent
                label={`${apps[track]?.name ?? ''} steps`}
                labels={glimpse.steps.map((step) => getFigure(step.figure).title)}
              />
            ))}
            <GlimpseControls icons={CONTROL_ICONS} />
          </div>
        </div>

        <div className="gl-stage">
          <ul className="gl-cols">
            {glimpses.map((glimpse, track) => {
              const app = apps[track];
              if (!app) return null;
              const chipId = `${prefix}-label-${track}`;
              const trackBrands = glimpse.brandRotation && glimpse.brandRotation.length > 1
                ? glimpse.brandRotation.map((brand) => brandVars(brandById(brand)))
                : undefined;
              const phone = (
                <GlimpseTrack track={track} brandVars={trackBrands} className={scaleClass(layout, size, track === centre)}>
                  <TrackFrames glimpse={glimpse} track={track} />
                </GlimpseTrack>
              );
              const morphing = morph ? (
                <ViewTransition name={`phone-${app.caseStudy}`} share="morph" default="none">
                  {phone}
                </ViewTransition>
              ) : (
                phone
              );
              return (
                <GlimpseColumn
                  key={glimpse.id}
                  track={track}
                  className={cn(
                    'gl-col',
                    glimpses.length > 1 && track === centre && 'gl-col--centre',
                    glimpses.length > 1 && track === 0 && 'gl-col--start',
                    glimpses.length > 1 && track === glimpses.length - 1 && 'gl-col--end',
                  )}
                >
                  {linked ? (
                    <SiteLink href={caseStudyHref(app.caseStudy)} aria-labelledby={chipId} className="gl-link">
                      <span className="gl-chip-slot">
                        <Chip size="sm" className="gl-chip">
                          <span aria-hidden="true">{app.short}</span>
                          <span className="sr-only" id={chipId}>
                            <MetaLine as="span" segments={app.stageLabel} />
                          </span>
                          <GlimpseDots look="bars" track={track} />
                        </Chip>
                      </span>
                      {morphing}
                    </SiteLink>
                  ) : (
                    morphing
                  )}
                </GlimpseColumn>
              );
            })}
          </ul>
        </div>

        {linked ? (
          <div className="gl-more">
            {apps.map((app, track) => (
              <GlimpseCurrent key={app.id} track={track} as="span">
                <SiteLink
                  href={caseStudyHref(app.caseStudy)}
                  className="inline-flex min-h-6 items-center gap-1 text-meta font-semibold text-ink-2 transition-colors duration-(--dur-1) hover:text-accent-ink"
                >
                  Read the {app.name} case study
                  <Icon name="arrow-right" size={14} />
                </SiteLink>
              </GlimpseCurrent>
            ))}
          </div>
        ) : null}
      </div>
    </GlimpseRoot>
  );
}

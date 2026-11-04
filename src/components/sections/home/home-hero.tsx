import './hero.css';
import type { CSSProperties, ReactNode } from 'react';
import { preload } from 'react-dom';
import { buttonVariants } from '@/components/ui/button';
import { ExternalLink } from '@/components/ui/external-link';
import { Icon } from '@/components/ui/icon';
import { music } from '@/content/music';
import { HeroScene } from '@/components/sections/home/hero-scene';

/** Shooting stars (night only): where each starts, its angle and its timing. */
const STARS = [
  { x: '560px', y: '30px', r: '28deg', delay: '2.6s', dur: '8s' },
  { x: '820px', y: '70px', r: '32deg', delay: '5.4s', dur: '9s' },
  { x: '300px', y: '90px', r: '24deg', delay: '8.1s', dur: '10s' },
] as const;

/**
 * The Home hero (design §3.1, §3.5, §3.6): a full-screen painting, day or night by the theme (CSS
 * alone), with the Home header over the sky, a credit line and a scroll pill. This is the static,
 * server-rendered version; later layers (the sunset, the dragon, the music button) attach to the
 * data-hero-* hooks. Two preload hints go into <head>: each colour scheme preloads only its own AVIF.
 */
export function HomeHero({ children }: { readonly children: ReactNode }): ReactNode {
  /*
   * Rendering a <link rel="preload"> from a Server Component emits it twice in <head> (Flight's
   * resource hint, then the element itself), so the hint is asked for directly: one tag each.
   */
  preload('/scene/day.avif', { as: 'image', type: 'image/avif', media: '(prefers-color-scheme: light)', fetchPriority: 'high' });
  preload('/scene/night.avif', { as: 'image', type: 'image/avif', media: '(prefers-color-scheme: dark)', fetchPriority: 'high' });
  return (
    <section data-section="hero" className="hero">
      <div className="hero-sky" aria-hidden="true">
        <picture data-hero-layer="day">
          <source srcSet="/scene/day.avif" type="image/avif" />
          <img src="/scene/day.webp" width={1376} height={768} alt="" decoding="async" data-hero-painting="day" />
        </picture>
        <picture data-hero-layer="night">
          <source srcSet="/scene/night.avif" type="image/avif" />
          <img src="/scene/night.webp" width={1376} height={768} alt="" decoding="async" data-hero-painting="night" />
        </picture>
        <div data-hero-layer="tint" />
        <svg className="hero-stars" data-hero-layer="stars" viewBox="0 0 1183 722" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="hero-star-trail" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="110" y2="0">
              <stop offset="0" />
              <stop offset="1" />
            </linearGradient>
          </defs>
          {STARS.map((star) => (
            <line
              key={star.x}
              x2="110"
              style={{ '--x': star.x, '--y': star.y, '--r': star.r, '--delay': star.delay, '--dur': star.dur } as CSSProperties}
            />
          ))}
        </svg>
        <HeroScene />
        <div data-hero-layer="scrim-day" />
        <div data-hero-layer="scrim-night" />
        <div className="hero-fade" />
      </div>
      <div className="hero-content">{children}</div>
      <div className="hero-foot">
        <p data-hero-credit className="hero-credit text-[0.75rem] leading-4 text-ink-3">
          Music: &apos;{music.title}&apos; by {music.artist} – released under{' '}
          <ExternalLink href={music.licenceHref} icon={false}>
            {music.licenceLabel}
          </ExternalLink>
          .{' '}
          <ExternalLink href={music.artistHref} icon={false}>
            {music.artistLabel}
          </ExternalLink>
        </p>
        <a href="#home-more" className={`hero-pill ${buttonVariants({ variant: 'secondary', size: 'sm' })}`}>
          <Icon name="chevron-down" size={14} />
          Projects, services and more
        </a>
      </div>
    </section>
  );
}

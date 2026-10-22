import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AboutPage, { metadata } from '@/app/about/page';
import { AboutContent } from '@/components/sections/about/about-content';
import { Bio, listingsFootnote } from '@/components/sections/about/bio';
import { CredentialsList } from '@/components/sections/about/credentials-list';
import { PortraitCard } from '@/components/sections/about/portrait-card';
import { SkillTiers } from '@/components/sections/about/skill-tiers';
import { entryLines, Timeline } from '@/components/sections/about/timeline';
import { credentials, education } from '@/content/credentials';
import { storeSummary } from '@/content/derived';
import { experience } from '@/content/experience';
import { pages } from '@/content/home';
import { profile } from '@/content/profile';
import { projects } from '@/content/projects';
import { skills } from '@/content/skills';
import type { ExperienceEntry } from '@/content/types';
import { visible } from '@/lib/placeholder';
import { aboutHref, caseStudyHref, type AboutSection } from '@/lib/routes';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

/*
 * W10b-P: /about (design §8). The anchors aboutHref() links to exist in both placeholder modes;
 * years and the CV are marked placeholders in label mode (S5.10) and absent in hide mode; the
 * timeline hides token fields, never whole entries, and never leaves an empty heading.
 */

const html = (element: ReactElement) => renderToStaticMarkup(element);

const SECTIONS: readonly AboutSection[] = ['experience', 'skills', 'credentials', 'education'];

function entry(id: string): ExperienceEntry {
  const found = experience.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No experience entry ${id}`);
  return found;
}

describe('AboutContent', () => {
  const label = html(createElement(AboutContent, { mode: 'label' }));
  const hide = html(createElement(AboutContent, { mode: 'hide' }));

  it('renders every aboutHref() anchor exactly once, in both modes', () => {
    for (const section of SECTIONS) {
      expect(aboutHref(section)).toBe(`/about#${section}`);
      expect(label.match(new RegExp(`\\sid="${section}"`, 'g')), section).toHaveLength(1);
      expect(hide.match(new RegExp(`\\sid="${section}"`, 'g')), section).toHaveLength(1);
    }
    const order = SECTIONS.map((section) => label.indexOf(`id="${section}"`));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('label mode: "[[N]]+ years" as a marked stat and the CV as a non-link placeholder chip (S5.10)', () => {
    expect(label).toContain('data-stat="years"');
    expect(label).toMatch(/<mark class="ph[^"]*">N<span class="sr-only"> \(placeholder\)<\/span><\/mark>\+/);
    expect(label).toContain('years shipping production apps');
    expect(label).toContain('Download CV<span class="sr-only"> (placeholder)</span>');
    expect(label).not.toMatch(/<a [^>]*>[^<]*Download CV/);
  });

  it('hide mode: no years, no CV, no Example items and no placeholder anywhere', () => {
    expect(hide).not.toContain('data-stat="years"');
    expect(hide).not.toContain('years shipping production apps');
    expect(hide).not.toContain('Download CV');
    expect(hide).not.toContain('>Example<');
    expect(hide).not.toContain('<mark');
    expect(hide).not.toContain('[[');
    expect(hide).not.toContain('(placeholder)');
  });

  it('keeps the portrait, the bio and the confirmed facts in hide mode', () => {
    expect(hide).toContain(`alt="${profile.portraitAlt}"`);
    expect(hide).toContain(profile.name);
    expect(hide).toContain('Taguig City, PH');
    expect(hide).toContain('data-stat="listings"');
    expect(hide).toContain(education.degree);
  });
});

describe('PortraitCard', () => {
  it('shows a real CV download once cvUrl is set, in either mode', () => {
    for (const mode of ['label', 'hide'] as const) {
      const markup = html(createElement(PortraitCard, { cvUrl: '/cv.pdf', mode }));
      expect(markup).toMatch(/<a href="\/cv\.pdf" download=""/);
      expect(markup).not.toContain('Download CV<span class="sr-only"> (placeholder)</span>');
    }
  });

  it('preloads the portrait (the largest image above the fold) with its descriptive alt', () => {
    const markup = html(createElement(PortraitCard, { mode: 'label' }));
    expect(markup).toContain(`alt="${profile.portraitAlt}"`);
    expect(markup).toContain('grayscale');
    expect(markup).toMatch(/aspect-\[4\/5\]/);
  });
});

describe('Bio', () => {
  it('counts the store listings from derived data, with the platform split and date', () => {
    const markup = html(createElement(Bio, { mode: 'label' }));
    expect(markup).toContain(`>${storeSummary.listings}<`);
    expect(markup).toContain(listingsFootnote(storeSummary));
    expect(listingsFootnote(storeSummary)).toBe(
      `${storeSummary.play} on Google Play · ${storeSummary.appstore} on the App Store · as of Oct 19, 2026`,
    );
    for (const paragraph of profile.bio) expect(markup).toContain(paragraph.slice(0, 20));
  });

  it('shows years as "N+" once set, in both modes', () => {
    for (const mode of ['label', 'hide'] as const) {
      const markup = html(createElement(Bio, { years: 6, mode }));
      expect(markup).toContain('data-stat="years"');
      expect(markup).toContain('6+');
      expect(markup).not.toContain('<mark');
    }
  });
});

describe('Timeline', () => {
  it('uses the organisation as the heading when hide mode removes the title', () => {
    const dgsi = entry('dgsi');
    expect(entryLines(dgsi, 'label')).toEqual({ heading: dgsi.title, sub: [dgsi.org] });
    expect(entryLines(dgsi, 'hide')).toEqual({ heading: dgsi.org, sub: [] });
    // Every field a placeholder: no heading at all rather than an empty one.
    expect(entryLines(entry('earlier-web-work'), 'hide')).toEqual({ heading: null, sub: [] });
  });

  it('keeps every entry in hide mode, with no empty heading and no placeholder', () => {
    const markup = html(createElement(Timeline, { entries: visible(experience, 'hide'), mode: 'hide' }));
    expect(markup.match(/data-entry="/g)).toHaveLength(experience.length);
    expect(markup).not.toMatch(/<h3[^>]*><\/h3>/);
    expect(markup).not.toContain('<mark');
    expect(markup).not.toContain('[[');
    expect(markup).toContain('Dynamic Global Soft Inc. (DGSI)');
  });

  it('marks unconfirmed titles and dates in label mode', () => {
    const markup = html(createElement(Timeline, { entries: [entry('dgsi')], mode: 'label' }));
    expect(markup).toContain('Your title at DGSI<span class="sr-only"> (placeholder)</span>');
    expect(markup).toContain('YYYY – present<span class="sr-only"> (placeholder)</span>');
  });

  it('links case-study projects, shows other work as chips and never shows hidden projects', () => {
    const markup = html(createElement(Timeline, { entries: [entry('dgsi')], mode: 'label' }));
    const links = [...markup.matchAll(/\shref="([^"]+)"/g)].map((match) => match[1]);
    expect(links).toEqual([caseStudyHref('defensys-citizen'), caseStudyHref('defensys-responder')]);
    expect(markup).toContain('Eventbook Exhibitors');

    const hiddenSlug = projects.find((project) => project.hidden)?.slug;
    if (!hiddenSlug) throw new Error('expected a hidden project in content');
    const withHidden: ExperienceEntry = { ...entry('dgsi'), projects: [hiddenSlug] };
    const hiddenTitle = projects.find((project) => project.slug === hiddenSlug)?.title ?? '';
    expect(html(createElement(Timeline, { entries: [withHidden], mode: 'label' }))).not.toContain(hiddenTitle);
  });
});

describe('SkillTiers', () => {
  it('lists the three tiers with every skill as a chip', () => {
    const markup = html(createElement(SkillTiers, { tiers: skills, mode: 'label' }));
    expect([...markup.matchAll(/data-tier="([^"]+)"/g)].map((match) => match[1])).toEqual(['core', 'production', 'working']);
    for (const tier of skills) {
      expect(markup).toContain(tier.label);
      for (const item of tier.items) expect(markup).toContain(item.replace(/&/g, '&amp;'));
    }
  });
});

describe('CredentialsList', () => {
  it('label mode: the Example certification with its tag, then Education with the degree', () => {
    const markup = html(createElement(CredentialsList, { credentials: visible(credentials, 'label'), education, mode: 'label' }));
    expect(markup).toContain('data-certifications=""');
    expect(markup).toContain('>Example<');
    expect(markup.indexOf('data-certifications')).toBeLessThan(markup.indexOf('id="education"'));
    expect(markup).toContain(`${education.degree}</strong>`);
    expect(markup).toContain('Taguig City University (TCU)');
  });

  it('hide mode: no certifications block (the example is gone); the degree still shows', () => {
    const markup = html(createElement(CredentialsList, { credentials: visible(credentials, 'hide'), education, mode: 'hide' }));
    expect(markup).not.toContain('data-certifications');
    expect(markup).toContain('id="credentials"');
    expect(markup).toContain('id="education"');
    expect(markup).toContain(education.degree);
    expect(markup).not.toContain('[[');
    // The degree is listed once, under Education, not again as a certification.
    expect(markup.match(new RegExp(education.degree, 'g'))).toHaveLength(1);
  });
});

describe('/about page', () => {
  const markup = html(createElement(AboutPage));

  it('has one h1', () => {
    expect(markup.match(/<h1[ >]/g)).toHaveLength(1);
  });

  it('exports its metadata through pageMetadata and renders a BreadcrumbList', () => {
    expect(metadata).toEqual(pageMetadata({ title: pages.about.title, description: pages.about.intro, path: '/about' }));
    const script = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(markup)?.[1] ?? '';
    expect(JSON.parse(script.replace(/\\u003c/g, '<'))).toEqual(
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'About', path: '/about' },
      ]),
    );
  });
});

import { BentoCard } from '@/components/ui/bento-card';
import { ButtonLink } from '@/components/ui/button';
import { Card, stretchedLinkClass } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { NumberedList } from '@/components/ui/numbered-list';
import { Years } from '@/components/ui/placeholder-facts';
import { SectionHeader } from '@/components/ui/section-header';
import { SiteLink } from '@/components/ui/site-link';
import { Stat } from '@/components/ui/stat';
import { home } from '@/content/home';
import type { BentoArea } from '@/content/types';
import { ph } from '@/lib/placeholder';
import { aboutHref, contactHref, projectsHref, servicesHref } from '@/lib/routes';
import { DemoSection, Row } from './demo-section';
import { serviceRows } from './samples';

export function CardsDemo() {
  return (
    <DemoSection
      title="Card"
      note="The one surface. Interactive cards lift on hover (colour and shadow only under reduced motion); the ring moves to the card."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-meta font-semibold text-ink">surface · card · md</p>
        </Card>
        <Card surface="raised" radius="control" pad="sm">
          <p className="text-meta font-semibold text-ink">raised · control · sm</p>
        </Card>
        <Card surface="sunken" pad="sm">
          <p className="text-meta font-semibold text-ink">sunken · card · sm</p>
        </Card>
      </div>
      <Card as="article" interactive className="flex flex-col gap-1">
        <h4 className="text-card-title text-ink">
          <SiteLink href={aboutHref()} className={stretchedLinkClass}>
            Interactive card with a stretched link
          </SiteLink>
        </h4>
        <p className="text-body-sm text-ink-3">The whole card is the link; it has no other interactive content.</p>
      </Card>
    </DemoSection>
  );
}

/** The gallery renders two panels, so each passes its own areas (the title ids derive from them). */
export function BentoDemo({ areas }: { readonly areas: readonly [BentoArea, BentoArea, BentoArea] }) {
  const [hero, stretched, header] = areas;
  return (
    <DemoSection
      title="BentoCard"
      note="Cream surface, orange tile with a white glyph, title and one-line description (18px radius, concentric with the 30px bento container)."
    >
      <div className="flex flex-col gap-4">
        <BentoCard
          area={hero}
          hero
          icon="folder-open"
          title={home.cards.proj.title}
          description={home.cards.proj.description}
          link={{ href: projectsHref(), label: 'All projects', mode: 'header' }}
        >
          <div className="grid min-h-24 place-items-center rounded-control border border-dashed border-line-strong text-meta text-ink-4">
            hero card body
          </div>
        </BentoCard>
        <BentoCard
          area={stretched}
          icon="user-round"
          title="About"
          description="Whole-card link: the title is the link, the label is a visual cue."
          link={{ href: aboutHref(), label: 'More', mode: 'stretched' }}
        />
        <BentoCard
          area={header}
          icon="layers"
          title="Services"
          description="Header link plus links inside, so the card itself does not lift."
          link={{ href: servicesHref(), label: 'All services', mode: 'header' }}
        >
          <NumberedList items={serviceRows} look="rows" />
        </BentoCard>
      </div>
    </DemoSection>
  );
}

export function HeadersDemo({ id }: { readonly id: string }) {
  return (
    <DemoSection title="SectionHeader · Stat · NumberedList">
      <SectionHeader
        as="h3"
        size="page"
        id={`${id}-header-page`}
        title="Page title"
        eyebrow="Eyebrow"
        intro="A page intro at the lead size, held to about 65 characters per line so it stays readable."
        action={
          <ButtonLink href={contactHref()} icon="arrow-up-right">
            Get in touch
          </ButtonLink>
        }
      />
      <SectionHeader
        as="h3"
        size="section"
        id={`${id}-header-section`}
        title="Section title"
        eyebrow={['Company', ph('Your title'), 'Live on the stores']}
        intro="Eyebrow segments skip hidden placeholders, so separators never dangle."
      />
      <SectionHeader as="h3" size="card" title="Card title" intro="Card intro at 14px." />
      <Row label="Stat md · sm · composed years value">
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <Stat value="5K+" label="installs (Google Play)" />
          <Stat value="4.2" icon="star" label="27 ratings" />
          <Stat value={ph('N')} label="placeholder value" size="sm" />
          <Stat value={<Years years={null} suffix="+" />} label="years shipping production apps" size="sm" />
        </div>
      </Row>
      <Row label="NumberedList blocks">
        <NumberedList
          look="blocks"
          headingLevel="h3"
          items={serviceRows.slice(0, 2).map((row) => ({
            ...row,
            id: `${id}-${row.id}`,
            body: (
              <div className="flex flex-wrap gap-1.5">
                <Chip size="sm">Expo</Chip>
                <Chip size="sm">TypeScript</Chip>
              </div>
            ),
          }))}
        />
      </Row>
    </DemoSection>
  );
}

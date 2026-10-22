import Image from 'next/image';
import { Button, ButtonLink } from '@/components/ui/button';
import { Chip, ChipLink, ExampleTag } from '@/components/ui/chip';
import { Copy } from '@/components/ui/copy';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { StatusDot } from '@/components/ui/status-dot';
import type { ContactTopic } from '@/content/types';
import { ph } from '@/lib/placeholder';
import { caseStudyHref, contactHref, projectsHref } from '@/lib/routes';
import { DemoSection, Row } from './demo-section';
import { appOptions, themeOptions } from './samples';

export function ButtonsDemo() {
  return (
    <DemoSection title="Button · ButtonLink" note="Hover steps the fill, press scales to .98, focus is the 2px outline ring.">
      <Row label="primary · secondary · ghost (md, 44px)">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
      </Row>
      <Row label="sm (32px) with icons">
        <Button size="sm" icon="send">
          Send message
        </Button>
        <Button size="sm" variant="secondary" icon="download">
          Download
        </Button>
        <Button size="sm" variant="ghost" icon="arrow-right" iconAt="end">
          Next
        </Button>
      </Row>
      <Row label="icon-only circles (a label is required by the types)">
        <Button variant="icon" shape="circle" size="sm" icon="pause" label="Pause animation" />
        <Button variant="icon" shape="circle" icon="moon" label="Switch to dark theme" />
        <Button variant="icon" shape="circle" icon="menu" label="Open menu" />
        <Button shape="circle" icon="accessibility" label="Display settings" />
      </Row>
      <Row label="loading (aria-busy + spinner) · disabled">
        <Button loading>Sending…</Button>
        <Button variant="secondary" size="sm" loading>
          Saving
        </Button>
        <Button variant="secondary" disabled>
          Disabled
        </Button>
      </Row>
      <Row label="ButtonLink (typed SiteRoute)">
        <ButtonLink href={contactHref()} icon="arrow-up-right">
          Get in touch
        </ButtonLink>
        <ButtonLink
          href={caseStudyHref('sme-panindio')}
          variant="secondary"
          icon="arrow-right"
          transitionTypes={['nav-forward']}
        >
          Read the case study
        </ButtonLink>
        <ButtonLink href={projectsHref()} variant="ghost" size="sm">
          View projects
        </ButtonLink>
        <ButtonLink href={contactHref()} variant="icon" shape="circle" icon="mail" label="Get in touch" />
      </Row>
    </DemoSection>
  );
}

export function ChipsDemo() {
  return (
    <DemoSection title="Chip · ChipLink · ExampleTag">
      <Row label="tones (md, 32px)">
        <Chip>Neutral</Chip>
        <Chip tone="accent">Accent</Chip>
        <Chip tone="ink">Ink</Chip>
        <Chip tone="ph">Placeholder</Chip>
        <Chip tone="avail">Available</Chip>
      </Row>
      <Row label="sm (24px)">
        <Chip size="sm">React Native</Chip>
        <Chip size="sm" tone="accent">
          Offline-first
        </Chip>
        <Chip size="sm" tone="ink">
          Your credential
        </Chip>
        <Chip size="sm" tone="avail" icon="check">
          <Copy text={ph('Open to roles & projects')} />
        </Chip>
      </Row>
      <Row label="icon + status shape (the status word is in the accessible name)">
        <Chip icon="bot" status="beta">
          SME AI assistant
        </Chip>
        <Chip icon="cloud-sun" status="live">
          Safety brief · Citizen
        </Chip>
        <Chip icon="hospital" status="building">
          Facility ranking · Responder
        </Chip>
        <Chip icon="captions" status="prototype">
          JP Live Subtitles
        </Chip>
      </Row>
      <Row label="ChipLink · ExampleTag">
        <ChipLink href={caseStudyHref('sme-panindio', 'ai')} icon="bot" status="beta">
          SME AI assistant
        </ChipLink>
        <ChipLink href={projectsHref({ type: 'ai' })} tone="accent" size="sm">
          AI projects
        </ChipLink>
        <ChipLink href={contactHref('testimonial')} tone="ink" size="sm">
          Leave a note
        </ChipLink>
        <ExampleTag />
      </Row>
    </DemoSection>
  );
}

const topicOptions: readonly SegmentedOption<ContactTopic>[] = [
  { value: 'hiring', label: 'Hiring for a role' },
  { value: 'project', label: 'A project' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'other', label: 'Something else' },
];

const sourceOptions: readonly SegmentedOption<'replica' | 'real'>[] = [
  { value: 'replica', label: 'Coded replica' },
  { value: 'real', label: 'Real screenshots' },
];

export function SegmentedDemo({ id }: { readonly id: string }) {
  const brandOptions: readonly SegmentedOption<'one' | 'two'>[] = [
    {
      value: 'one',
      label: 'Sample Safety App',
      media: <Image src="/icon.svg" alt="" width={24} height={24} className="size-6 rounded-md" />,
    },
    {
      value: 'two',
      label: 'Another Sample Brand',
      media: <StatusDot status="building" className="forced-colors:text-inherit" />,
    },
  ];

  return (
    <DemoSection
      title="SegmentedControl"
      note="Native radios in a fieldset: arrow keys move the choice; this server-rendered form submits without JavaScript."
    >
      <form method="get" className="flex flex-col gap-5">
        <SegmentedControl name={`${id}-theme`} legend="Theme" options={themeOptions} defaultValue="system" size="sm" />
        <SegmentedControl name={`${id}-source`} legend="Source" options={sourceOptions} defaultValue="replica" />
        <SegmentedControl
          name={`${id}-app`}
          legend="App (short labels, full accessible names; one disabled)"
          options={appOptions}
          defaultValue="all"
          look="chips"
          size="sm"
        />
        <SegmentedControl name={`${id}-brand`} legend="App brand" options={brandOptions} defaultValue="one" look="chips" />
        <SegmentedControl
          name={`${id}-topic`}
          legend="Topic"
          legendHidden
          options={topicOptions}
          defaultValue="project"
          look="chips"
        />
        <div>
          <Button type="submit" variant="secondary" size="sm">
            Submit (no JS)
          </Button>
        </div>
      </form>
    </DemoSection>
  );
}

import { ProjectCard } from '@/components/content/project-card';
import { QuoteCard } from '@/components/content/quote-card';
import { Button } from '@/components/ui/button';
import { Copy, MetaLine } from '@/components/ui/copy';
import { CopyButton } from '@/components/ui/copy-button';
import { Dialog } from '@/components/ui/dialog';
import { ExternalLink } from '@/components/ui/external-link';
import { CvLink, Years } from '@/components/ui/placeholder-facts';
import { Popover } from '@/components/ui/popover';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StoreLink } from '@/components/ui/store-link';
import { ph } from '@/lib/placeholder';
import { DemoSection, Row } from './demo-section';
import {
  caseStudyProject,
  companyProject,
  exampleTestimonial,
  filledTestimonial,
  moreWorkProject,
  sampleAppStoreListing,
  sampleListing,
  themeOptions,
} from './samples';

export function PlaceholdersDemo() {
  return (
    <DemoSection
      title="Copy · MetaLine · Years · CvLink"
      note="Label mode marks whole-token fields; hide mode drops them (and their separators). Dev builds add a dashed outline."
    >
      <Row label="Copy: plain field · token field (label) · token field (hide renders nothing)">
        <Copy as="p" text="A plain content field." className="text-body-sm text-ink-2" />
        <Copy as="p" text={ph('Your title at DGSI')} className="text-body-sm text-ink-2" />
        <Copy as="p" text={ph('Your title at DGSI')} mode="hide" className="text-body-sm text-ink-2" />
      </Row>
      <Row label="MetaLine label · hide">
        <MetaLine segments={['Taguig City, PH', 'GMT+8', ph('I reply within 1–2 business days')]} className="text-meta text-ink-3" />
        <MetaLine
          segments={['Taguig City, PH', 'GMT+8', ph('I reply within 1–2 business days')]}
          mode="hide"
          className="text-meta text-ink-3"
        />
      </Row>
      <Row label="Years: unknown (label) · set · unknown (hide)">
        <Years years={null} as="span" className="text-body-sm font-semibold text-ink" />
        <Years years={6} as="span" className="text-body-sm font-semibold text-ink" />
        <Years years={null} mode="hide" as="span" className="text-body-sm font-semibold text-ink" />
      </Row>
      <Row label="CvLink: no CV (label: non-link chip) · CV set · no CV (hide)">
        <CvLink href={null} />
        <CvLink href="/cv.pdf" size="sm" />
        <CvLink href={null} mode="hide" />
      </Row>
    </DemoSection>
  );
}

export function LinksDemo() {
  return (
    <DemoSection title="ExternalLink · StoreLink · CopyButton" note="No official store badges: text links and the apps' own icons.">
      <Row label="ExternalLink (new tab, ↗, announced)">
        <p className="text-body-sm text-ink-2">
          Code lives on <ExternalLink href="https://github.com/kiskue">GitHub</ExternalLink>; email links stay in
          this tab: <ExternalLink href="mailto:gerricmeasco360@gmail.com">gerricmeasco360@gmail.com</ExternalLink>.
        </p>
      </Row>
      <Row label="StoreLink text · icon" className="items-start">
        <StoreLink listing={sampleListing} />
        <StoreLink listing={sampleAppStoreListing} />
        <StoreLink listing={sampleListing} look="icon" />
        <StoreLink listing={sampleAppStoreListing} look="icon" />
      </Row>
      <Row label="CopyButton (live region announces “Copied”)">
        <CopyButton value="gerricmeasco360@gmail.com" label="Copy email" copiedLabel="Email copied" />
        <CopyButton value="sample" label="Copy" copiedLabel="Copied" size="sm" variant="ghost" />
      </Row>
    </DemoSection>
  );
}

export function OverlaysDemo({ id, dark }: { readonly id: string; readonly dark: boolean }) {
  // Portals render at the end of <body>, outside this panel, so the dark panel passes "dark".
  const theme = dark ? 'dark' : undefined;
  return (
    <DemoSection title="Dialog · Popover" note="Focus is trapped and returns to the trigger; Esc closes.">
      <Row label="Dialog looks">
        <Dialog
          look="center"
          title="Centered dialog"
          description="A modal card. Close with Esc, the button or the scrim."
          className={theme}
          trigger={<Button variant="secondary">Open center</Button>}
        >
          <p className="text-body-sm text-ink-2">Dialog body content.</p>
        </Dialog>
        <Dialog
          look="sheet-start"
          title="Menu sheet"
          className={theme}
          trigger={<Button variant="secondary">Open sheet</Button>}
        >
          <p className="text-body-sm text-ink-2">The menu sheet slides in from the inline start.</p>
        </Dialog>
        <Dialog
          look="fullscreen"
          title="Fullscreen"
          titleHidden
          className={theme}
          trigger={<Button variant="secondary">Open fullscreen</Button>}
        >
          <p className="text-body-sm text-ink-2">The lightbox look on small screens (title visually hidden).</p>
        </Dialog>
      </Row>
      <Row label="Popover">
        <Popover
          label="Display settings"
          side="bottom"
          className={theme}
          trigger={<Button variant="icon" shape="circle" icon="accessibility" label="Display settings" />}
        >
          <SegmentedControl name={`${id}-popover-theme`} legend="Theme" options={themeOptions} defaultValue="system" size="sm" />
        </Popover>
      </Row>
    </DemoSection>
  );
}

export function ProjectCardsDemo() {
  const phone = (
    <div
      aria-hidden="true"
      className="grid h-56 w-28 place-items-center rounded-[1.25rem] border-4 border-bezel bg-sunken text-fig text-ink-4"
    >
      phone slot
    </div>
  );
  return (
    <DemoSection
      title="ProjectCard"
      note="case-study (phone slot, single destination → whole-card link) · compact (explicit links, or whole-card when the one destination is a case study) · adjacent."
    >
      <ProjectCard project={caseStudyProject} look="case-study" phone={phone} />
      <div className="grid gap-4 sm:grid-cols-2">
        <ProjectCard project={moreWorkProject} look="compact" />
        <ProjectCard project={companyProject} look="compact" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ProjectCard project={companyProject} look="adjacent" direction="previous" />
        <ProjectCard project={caseStudyProject} look="adjacent" direction="next" />
      </div>
    </DemoSection>
  );
}

export function QuoteCardsDemo() {
  return (
    <DemoSection title="QuoteCard" note="Example items carry the Example tag in label mode.">
      <div className="flex flex-col gap-2">
        <QuoteCard testimonial={exampleTestimonial} look="compact" />
        <QuoteCard testimonial={filledTestimonial} look="compact" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <QuoteCard testimonial={exampleTestimonial} look="full" />
        <QuoteCard testimonial={filledTestimonial} look="full" />
      </div>
    </DemoSection>
  );
}

import type { Metadata } from 'next';
import { CtaBand } from '@/components/content/cta-band';
import { PageHeader } from '@/components/layout/page-header';
import { EngagementCards } from '@/components/sections/services/engagement-cards';
import { ProcessSteps } from '@/components/sections/services/process-steps';
import { ServiceBlocks } from '@/components/sections/services/service-blocks';
import { JsonLd } from '@/components/seo/json-ld';
import { callsToAction, pages } from '@/content/home';
import { engagements, processSteps, services } from '@/content/services';
import { site } from '@/content/site';
import { visible } from '@/lib/placeholder';
import { servicesHref } from '@/lib/routes';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

const page = pages.services;

export const metadata: Metadata = pageMetadata({ title: page.title, description: page.intro, path: servicesHref() });

/** /services (design §8): five service blocks, the process strip, engagement cards and a CTA band. */
export default function ServicesPage() {
  const mode = site.placeholders;
  return (
    <>
      <PageHeader title={page.title} intro={page.intro} />
      <div className="mt-10 flex flex-col gap-12 md:mt-12 lg:gap-16">
        <ServiceBlocks services={visible(services, mode)} mode={mode} />
        <ProcessSteps steps={processSteps} mode={mode} />
        <EngagementCards engagements={visible(engagements, mode)} mode={mode} />
        <CtaBand cta={callsToAction.services} headingId="services-cta-title" />
      </div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: page.title, path: servicesHref() },
        ])}
      />
    </>
  );
}

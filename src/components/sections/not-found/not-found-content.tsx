import { PageHeader } from '@/components/layout/page-header';
import { MapPhone } from '@/components/showcase/map-phone';
import { ButtonLink } from '@/components/ui/button';
import { pages } from '@/content/home';
import { projectsHref } from '@/lib/routes';

/** The map phone's role="img" name: what the 'lost' scene shows. */
export const LOST_MAP_LABEL =
  'Map of a fictional town: a blue You are here dot at the edge of town, where the map runs out into the bay. Fictional data.';

/** The visible caption: a FIG line like every other phone on the site. */
const LOST_MAP_CAPTION = 'You are here, at the edge of the map.';

/**
 * The 404 inside the shell (design §8): "This page isn't on the map." as the one H1 with the
 * Get in touch pill (contact) top-right like on every page (consistent help, 3.2.6), then the
 * way back, Home and Projects, and a static md map phone: the fictional town's 'lost' scene,
 * a blue "You are here" dot where the map runs out into the bay (audit S4.45). It is no glimpse
 * and no registry figure, so it takes no view-transition name and never morphs. The two buttons
 * get their own row: the header's action group never wraps, and three pills overflow a phone.
 */
export function NotFoundContent() {
  const page = pages['not-found'];
  return (
    <div className="flex flex-col gap-8" data-not-found="">
      <PageHeader title={page.title} intro={page.intro} />
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/" variant="secondary" icon="house" iconAt="start">
          Home
        </ButtonLink>
        <ButtonLink href={projectsHref()} variant="secondary" icon="folder-open" iconAt="start">
          Projects
        </ButtonLink>
      </div>
      <figure className="mt-2 flex w-min flex-col gap-3" data-map-phone="lost">
        <MapPhone scene="lost" size="md" label={LOST_MAP_LABEL} />
        <figcaption className="text-meta text-ink-3">
          <span className="inline-block w-14 font-mono text-fig text-ink-2 uppercase">FIG 404</span> {LOST_MAP_CAPTION}
        </figcaption>
      </figure>
    </div>
  );
}

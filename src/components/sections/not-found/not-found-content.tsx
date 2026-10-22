import { PageHeader } from '@/components/layout/page-header';
import { ScreenFigure } from '@/components/showcase/screen-figure';
import { ButtonLink } from '@/components/ui/button';
import { pages } from '@/content/home';
import type { ReplicaSource } from '@/content/types';
import { projectsHref } from '@/lib/routes';

/**
 * The map phone: the Defensys Citizen hazard map (FIG 2.5), the registry's map screen with a
 * "Your Location" pin, rendered like every other screen through ScreenFigure / ScreenView. It is
 * a static phone (no glimpse player), so it takes no view-transition name and never morphs.
 */
export const LOST_SCREEN: ReplicaSource = { kind: 'replica', figure: '2.5', state: 'map' };

/**
 * The 404 inside the shell (design §8): "This page isn't on the map." as the one H1 with the
 * Get in touch pill (contact) top-right like on every page (consistent help, 3.2.6), then the
 * way back, Home and Projects, and a static md map phone. The two buttons get their own row:
 * the header's action group never wraps, and three pills overflow a phone screen.
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
      <ScreenFigure source={LOST_SCREEN} size="md" figureClassName="mt-2" />
    </div>
  );
}

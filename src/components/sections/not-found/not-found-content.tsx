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
 * The 404 inside the shell (design §8): "This page isn't on the map." as the one H1, and the way
 * back as the header's actions, Home, Projects and the Get in touch pill (contact), which stays
 * top-right like on every page (consistent help, 3.2.6). A static md map phone sits below.
 */
export function NotFoundContent() {
  const page = pages['not-found'];
  return (
    <div className="flex flex-col gap-10 md:gap-12" data-not-found="">
      <PageHeader
        title={page.title}
        intro={page.intro}
        actions={
          <>
            <ButtonLink href="/" variant="secondary" icon="house" iconAt="start">
              Home
            </ButtonLink>
            <ButtonLink href={projectsHref()} variant="secondary" icon="folder-open" iconAt="start">
              Projects
            </ButtonLink>
          </>
        }
      />
      <ScreenFigure source={LOST_SCREEN} size="md" />
    </div>
  );
}

import { PageHeader } from '@/components/layout/page-header';
import { ScreenFigure } from '@/components/showcase/screen-figure';
import { ButtonLink } from '@/components/ui/button';
import { pages } from '@/content/home';
import type { ReplicaSource } from '@/content/types';
import { projectsHref } from '@/lib/routes';

/**
 * The map phone: the Defensys Citizen hazard map (FIG 2.5), the registry's "you are here"
 * screen, rendered like every other screen through ScreenFigure / ScreenView. It is a static
 * phone (no glimpse player), so it takes no view-transition name and never morphs.
 */
export const LOST_SCREEN: ReplicaSource = { kind: 'replica', figure: '2.5', state: 'map' };

/**
 * The 404 inside the shell (design §8): "This page isn't on the map." as the one H1, the way
 * back (Home, Projects, and the header's Get in touch pill for contact) and a static md map
 * phone beside it once <main> is 48rem wide, under it before that.
 */
export function NotFoundContent() {
  const page = pages['not-found'];
  return (
    <div className="grid items-center gap-10 @3xl:grid-cols-[minmax(0,1fr)_auto] @3xl:gap-12" data-not-found="">
      <div className="flex flex-col gap-8">
        <PageHeader title={page.title} intro={page.intro} />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/" variant="secondary" icon="house" iconAt="start">
            Home
          </ButtonLink>
          <ButtonLink href={projectsHref()} variant="secondary" icon="folder-open" iconAt="start">
            Projects
          </ButtonLink>
        </div>
      </div>
      <ScreenFigure source={LOST_SCREEN} size="md" figureClassName="justify-self-center @3xl:justify-self-end" />
    </div>
  );
}

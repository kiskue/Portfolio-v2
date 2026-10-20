import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { figures } from '@/content/apps/figures';
import type { FigureId } from '@/content/types';
import { BrandGallery } from './brand-gallery';
import { FigureHeader } from './figure-header';
import { FigureIndex } from './figure-index';
import { findFigure } from './figure-nav';
import { SmeMark } from './sme-mark';
import { StateGallery } from './state-gallery';
import { StoreGallery } from './store-gallery';

/*
 * /dev/figure/<id>: one figure at a time, for building and reviewing replicas against their
 * layoutSpec. Every state at 2xl, the default state in every brand of the app (SME figures show
 * the SME brand mark instead), and for Citizen figures the default brand's real store
 * screenshots. Development only: a 404 in production.
 * Static: exactly the 21 figure ids are generated and anything else is a 404, and the page reads
 * no searchParams (they would make the route dynamic).
 */

export const dynamicParams = false;

export function generateStaticParams(): { id: FigureId }[] {
  return figures.map((figure) => ({ id: figure.id }));
}

export async function generateMetadata({ params }: PageProps<'/dev/figure/[id]'>): Promise<Metadata> {
  const figure = findFigure((await params).id);
  return { title: figure ? `FIG ${figure.id} ${figure.title}` : 'Figure', robots: { index: false, follow: false } };
}

export default async function DevFigurePage({ params }: PageProps<'/dev/figure/[id]'>) {
  if (process.env.NODE_ENV === 'production') notFound();

  const figure = findFigure((await params).id);
  if (!figure) notFound();

  return (
    <>
      <FigureHeader figure={figure} />
      <StateGallery figure={figure} />
      <BrandGallery figure={figure} />
      {figure.app === 'sme' ? <SmeMark /> : null}
      {figure.app === 'citizen' ? <StoreGallery /> : null}
      <FigureIndex current={figure.id} />
    </>
  );
}

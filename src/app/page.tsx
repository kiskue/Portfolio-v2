import type { Metadata } from 'next';
import { BentoGrid } from '@/components/sections/home/bento-grid';
import { HomeHeader } from '@/components/sections/home/home-header';
import { ToolsStrip } from '@/components/sections/home/tools-strip';
import { home } from '@/content/home';
import { profile } from '@/content/profile';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({ title: profile.title, description: home.subline, path: '/' });

/** Home (PLAN "Home", design §4.2–4.3): the header row, the tools strip and the bento. */
export default function HomePage() {
  return (
    <>
      <HomeHeader />
      <ToolsStrip className="mt-6" />
      <BentoGrid className="mt-4" />
    </>
  );
}

import type { Metadata } from 'next';
import { NotFoundContent } from '@/components/sections/not-found/not-found-content';

export const metadata: Metadata = { title: 'Page not found' };

/** The 404, rendered inside the shell by the root layout (design §8). */
export default function NotFound() {
  return <NotFoundContent />;
}

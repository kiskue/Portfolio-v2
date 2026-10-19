import { Geist_Mono, Plus_Jakarta_Sans, Poppins } from 'next/font/google';

/** UI and display face (design §3.2). Variable 200–800, preloaded. */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  preload: true,
});

/** Figure labels, indices and code-ish text. */
const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-geist-mono',
  display: 'swap',
  preload: false,
});

/** Defensys replicas only (the real apps use Poppins); downloads only where it is painted. */
const poppinsReplica = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins-replica',
  display: 'optional',
  preload: false,
});

/** The three font-variable classes, applied together on <html>. */
export const fontClassName = [jakarta.variable, geistMono.variable, poppinsReplica.variable].join(' ');

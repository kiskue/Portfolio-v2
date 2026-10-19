import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge only knows Tailwind's default scales. Without these, a custom size such as
 * `text-display` is read as a text COLOUR and silently dropped by `cn('text-display', 'text-ink')`.
 * Keep in sync with the @theme blocks in src/styles/tokens.css.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'display',
        'h1',
        'h2',
        'h3-hero',
        'card-title',
        'lead',
        'body',
        'body-sm',
        'meta',
        'eyebrow',
        'fig',
        'nav',
        'button',
        'stat',
      ],
      radius: ['tile', 'control', 'card', 'strip', 'bento'],
      ease: ['emph'],
    },
  },
});

/** Joins class names (clsx) and resolves Tailwind conflicts (later classes win). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

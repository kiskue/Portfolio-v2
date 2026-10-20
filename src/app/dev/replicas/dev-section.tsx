import type { ReactNode } from 'react';

export interface DevSectionProps {
  readonly id: string;
  readonly title: string;
  readonly intro: ReactNode;
  readonly children: ReactNode;
}

/**
 * A code-ish term in running text. Set in the UI face, not Geist Mono: mono is not preloaded,
 * and its late swap would reflow the paragraph and shift the phones below it.
 */
export function Term({ children }: { readonly children: ReactNode }): ReactNode {
  return <span className="font-semibold text-ink-2">{children}</span>;
}

/** One numbered block of the /dev/replicas page. */
export function DevSection({ id, title, intro, children }: DevSectionProps): ReactNode {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-16 scroll-mt-24">
      <h2 id={`${id}-title`} className="text-h2">
        {title}
      </h2>
      <div className="mt-2 max-w-[72ch] text-body-sm text-ink-3">{intro}</div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

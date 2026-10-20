import type { ReactNode } from 'react';
import type { SmeRichText } from '@/components/replicas/sme/sample-data';

/** One run of rich text: plain, or bold in the AI accent (markdown **strong**). */
function Run({ part }: { readonly part: SmeRichText[number] }): ReactNode {
  return typeof part === 'string' ? part : <span className="rx-sme-ai-strong">{part.strong}</span>;
}

/**
 * The generated report as react-native-markdown-display draws the app's bullet list: 14/22 text,
 * an Android "•" with 10 px either side in the muted ink, 6 px under each item and 4 px under
 * the list, bold figures in the accent.
 */
export function ReportBullets({ items }: { readonly items: readonly SmeRichText[] }): ReactNode {
  return (
    <span className="rx-sme-ai-bullets">
      {items.map((item, index) => (
        <span key={index} className="rx-sme-ai-bullet">
          <span className="rx-sme-ai-bullet__dot">{'•'}</span>
          <span className="rx-sme-ai-bullet__text">
            {item.map((part, at) => (
              <Run key={at} part={part} />
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

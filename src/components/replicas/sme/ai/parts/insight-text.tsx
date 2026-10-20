import type { ReactNode } from 'react';
import { ms, px, rStyle, RTypewriter } from '@/components/replicas/kit';

/** The 22 px line box of the insight body. */
const LINE = 22;
/** A conservative count of characters per 14 px line in the 326 px body, for the grow budget. */
const CHARS_PER_LINE = 44;

/** An insight sentence as the card shows it once typed: 14 px on 22 px lines. */
export function InsightText({ children }: { readonly children: ReactNode }): ReactNode {
  return <span className="rx-sme-ai-text">{children}</span>;
}

export interface TypedSwapProps {
  /** The text on screen before (the poster): the computed line. */
  readonly from: string;
  /** The text that replaces it and types out: the AI paragraph. */
  readonly to: string;
  /** When `to` arrives, in ms after the step becomes active. */
  readonly atMs: number;
  /** How long `to` takes to type out. */
  readonly typingMs: number;
}

/**
 * The insight body through "Enhance with AI" (1.6). At rest it shows `from`. While active, at
 * `atMs` the text resets and `to` types out word by word over `typingMs`, and the body grows
 * from one line toward its full height as it types, like the app's card growing line by line
 * (the budget runs two lines ahead of a conservative estimate, so a line is never clipped while
 * it types). Paused freezes it; reduced motion keeps `from`. All motion lives in ai.css under
 * [data-active].
 */
export function TypedSwap({ from, to, atMs, typingMs }: TypedSwapProps): ReactNode {
  const lines = Math.ceil(to.length / CHARS_PER_LINE) + 2;
  return (
    <span
      className="rx-sme-ai-swap"
      style={rStyle({
        '--rx-sme-ai-swap-at': ms(atMs),
        '--rx-sme-ai-swap-ms': ms(typingMs),
        '--rx-sme-ai-swap-to': px(lines * LINE),
      })}
    >
      <span className="rx-sme-ai-swap__from rx-sme-ai-text">{from}</span>
      <span className="rx-sme-ai-swap__to rx-sme-ai-text">
        <RTypewriter text={to} startMs={atMs} msPerChar={typingMs / to.length} />
      </span>
    </span>
  );
}

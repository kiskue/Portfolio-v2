'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export interface CopyButtonProps {
  /** The text put on the clipboard. */
  readonly value: string;
  /** Visible label, e.g. "Copy email". */
  readonly label: string;
  /** Visible label for 2s after copying, e.g. "Email copied". */
  readonly copiedLabel: string;
  /** Visible label when the clipboard is unavailable. */
  readonly failedLabel?: string;
  readonly variant?: 'primary' | 'secondary' | 'ghost';
  readonly size?: 'sm' | 'md';
  readonly className?: string;
}

type CopyStatus = 'idle' | 'copied' | 'failed';

const RESET_MS = 2000;

const ANNOUNCEMENT: Record<CopyStatus, string> = {
  idle: '',
  copied: 'Copied',
  failed: 'Couldn’t copy. Select the text and press Ctrl+C.',
};

/**
 * Copies `value` with the Clipboard API (design §9). The icon swaps to a check and the label
 * changes for 2s, and a visually hidden live region announces "Copied".
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  failedLabel = 'Press Ctrl+C to copy',
  variant = 'secondary',
  size = 'md',
  className,
}: CopyButtonProps) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    window.clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    timer.current = window.setTimeout(() => setStatus('idle'), RESET_MS);
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        icon={status === 'copied' ? 'check' : 'copy'}
        onClick={copy}
        className={className}
      >
        {status === 'copied' ? copiedLabel : status === 'failed' ? failedLabel : label}
      </Button>
      <span role="status" className="sr-only">
        {ANNOUNCEMENT[status]}
      </span>
    </>
  );
}

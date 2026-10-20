import type { ReactNode } from 'react';
import type { AppId } from '@/content/types';
import { cn } from '@/lib/cn';
import type { RBoxProps } from './types';

export interface RCanvasProps extends RBoxProps {
  readonly app: AppId;
  readonly theme: 'light' | 'dark';
  readonly children?: ReactNode;
}

/**
 * The fixed 390×844 logical screen every replica draws on. data-app picks the font (Poppins
 * for Citizen and Responder, the system stack for SME) and the app's base tokens; data-theme
 * picks light or dark. Brand variables are never set here: they inherit from a BrandVars or
 * BrandScope wrapper, so switching brands re-renders nothing.
 */
export function RCanvas({ app, theme, children, className, style }: RCanvasProps): ReactNode {
  return (
    <div className={cn('rx-canvas', className)} data-app={app} data-theme={theme} style={style}>
      {children}
    </div>
  );
}

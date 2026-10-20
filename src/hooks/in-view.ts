/*
 * Pure visibility rules for useInView (unit-tested; no DOM needed).
 */

/** The parts of an IntersectionObserverEntry the rule reads. */
export interface VisibilityEntry {
  readonly isIntersecting: boolean;
  readonly intersectionRatio: number;
  readonly intersectionRect: { readonly height: number };
  readonly rootBounds: { readonly height: number } | null;
}

/** IntersectionObserver reports ratios with rounding error, e.g. 0.4999 at exactly half. */
const EPSILON = 0.001;

/**
 * Whether an element counts as in view at `threshold` (0–1). An element taller than the
 * viewport can never be, say, 50% visible, so it also counts once it fills that share of the
 * viewport. threshold 0 means "any pixel".
 */
export function isInView(entry: VisibilityEntry, threshold: number): boolean {
  if (!entry.isIntersecting) return false;
  if (threshold <= 0) return true;
  if (entry.intersectionRatio >= threshold - EPSILON) return true;
  const root = entry.rootBounds;
  return root !== null && root.height > 0 && entry.intersectionRect.height >= threshold * root.height - EPSILON;
}

/**
 * Observer thresholds: tenths plus the threshold itself, so the callback also fires while a tall
 * element scrolls through (its ratio changes without crossing `threshold`).
 */
export function observerThresholds(threshold: number): number[] {
  const steps = Array.from({ length: 11 }, (_, index) => index / 10);
  const clamped = Math.min(1, Math.max(0, threshold));
  return [...new Set([...steps, clamped])].sort((a, b) => a - b);
}

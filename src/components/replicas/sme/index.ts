import './sme.css';
import type { ReplicaComponent } from '@/components/replicas/kit';
import type { SmeFigureId } from '@/content/types';
import { smeAiReplicas } from './ai';
import { smeCoreReplicas } from './core';

export type { SmeAiFigureId } from './ai';
export type { SmeCoreFigureId } from './core';

/**
 * SME Panindio replicas, one per figure 1.1–1.9 (exhaustive by type), merged from two halves so
 * two builders can work in parallel: core/ (1.1–1.5) and ai/ (1.6–1.9). Each half is typed
 * against its own figure-id subset, so a figure can live in only one of them.
 *
 * This module is the single import of sme.css (the SME app tokens). Every SME screen is reached
 * through the registry, so the tokens load wherever an SME replica renders.
 */
export const smeReplicas = { ...smeCoreReplicas, ...smeAiReplicas } satisfies Record<SmeFigureId, ReplicaComponent>;

// STUB — owned by W2, replaced in wave 1
import type { CaseStudy } from '@/content/types';
import { defensysCitizen } from './defensys-citizen';
import { defensysResponder } from './defensys-responder';
import { smePanindio } from './sme-panindio';

/** All case studies in cyclic order (SME → Citizen → Responder), matching CASE_STUDY_SLUGS. */
export const caseStudies: readonly CaseStudy[] = [smePanindio, defensysCitizen, defensysResponder];

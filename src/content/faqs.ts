import type { Faq } from '@/content/types';
import { ph } from '@/lib/placeholder';

/**
 * Contact-page FAQs (design §8), rendered as native exclusive <details>: hiring questions first,
 * then client questions. Answers state only what the work shows. Where the answer is the owner's
 * call (availability, freelance work, process, pricing), the whole answer is a placeholder with
 * draft wording, so hide mode drops that question instead of showing it unanswered.
 */
export const faqs: readonly Faq[] = [
  {
    id: 'full-time',
    q: 'Are you open to full-time roles?',
    a: ph('Yes: mobile or full-stack roles, remote or in Metro Manila.'),
    confirm: 'Availability wording. V1 said "Open to frontend roles · Remote or Metro Manila".',
  },
  {
    id: 'time-zone',
    q: 'What’s your time zone?',
    a: 'GMT+8, Philippine time. Tell me your team’s hours and we’ll agree on the overlap.',
    confirm: 'Add the overlap hours you can commit to, if you want them stated.',
  },
  {
    id: 'code',
    q: 'Can I see your code?',
    a: 'I’m @kiskue on GitHub. Company code is proprietary, but I’m happy to walk you through the architecture of my part of it on a call.',
    confirm:
      'Which personal repos are public (SME Panindio, the analytics app, JP Live Subtitles)? Once at least one is, this answer can point to your public repos.',
  },
  {
    id: 'backend',
    q: 'Do you build the backend too?',
    a: 'Yes. For SME Panindio I built the NestJS API, its realtime gateway and the FastAPI AI service. The Defensys apps integrate with the Command Center and API built by the DGSI team; I added the AI weather safety brief and facility-suggestion endpoints.',
  },
  {
    id: 'contract',
    q: 'Do you take freelance or contract work?',
    a: ph('Yes, when it fits my focus: mobile apps, real-time features, offline-first data and grounded AI. Tell me about your project through the form.'),
    confirm: 'Whether you take freelance or contract work alongside your current role.',
  },
  {
    id: 'project-fit',
    q: 'What kinds of projects fit?',
    a: 'Apps that have to work in the real world: field and frontline apps, offline-first tools, live dispatch, chat, calls and maps, white-label apps for several clients, and AI features that must stay grounded in real data.',
  },
  {
    id: 'existing-app',
    q: 'Can you take over an existing app?',
    a: 'Yes. Before Defensys Responder, each local government ran its own copy of an older responder app. I built the white-label app that brings those builds together in one codebase.',
    confirm:
      'On Android, the Smile Taytay build reuses the legacy Taytay app’s package, so it would update that app in place. Once that deployment is confirmed, you can say so here.',
  },
  {
    id: 'process-pricing',
    q: 'How do you work, and how do you price it?',
    a: ph('Your process, typical timelines and how you price work'),
    confirm: 'Your process, typical timelines and pricing (or "on request").',
  },
  {
    id: 'real-screens',
    q: 'Are the app screens real?',
    a: 'Most are coded replicas, built from the real apps’ screen layouts and filled with fictional data, so no real person’s information appears in them. Defensys Citizen also shows a selection of the screenshots its brands publish on Google Play and the App Store.',
  },
];

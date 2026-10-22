import { AboutSection } from '@/components/sections/about/about-section';
import { Bio } from '@/components/sections/about/bio';
import { CredentialsList } from '@/components/sections/about/credentials-list';
import { PortraitCard } from '@/components/sections/about/portrait-card';
import { SkillTiers } from '@/components/sections/about/skill-tiers';
import { Timeline } from '@/components/sections/about/timeline';
import { credentials, education } from '@/content/credentials';
import { experience } from '@/content/experience';
import { site } from '@/content/site';
import { skills } from '@/content/skills';
import type { PlaceholderMode } from '@/content/types';
import { visible } from '@/lib/placeholder';

export interface AboutContentProps {
  readonly mode?: PlaceholderMode;
}

/**
 * The /about body (design §8) under the page header: the portrait card (the sticky left column
 * once <main> is 56rem wide, on top before that) beside the bio and stats, the experience
 * timeline, the skill tiers, and credentials with education. The anchors #experience, #skills,
 * #credentials and #education are what aboutHref() links to, and render in both placeholder
 * modes. The right column is a size container, so its sections lay out by their own width.
 */
export function AboutContent({ mode = site.placeholders }: AboutContentProps) {
  return (
    <div className="grid items-start gap-10 @4xl:grid-cols-[20rem_minmax(0,1fr)] @4xl:gap-12 @6xl:gap-16">
      <PortraitCard mode={mode} />
      <div className="@container flex min-w-0 flex-col gap-14 lg:gap-16">
        <Bio mode={mode} />
        <AboutSection id="experience" title="Experience">
          <Timeline entries={visible(experience, mode)} mode={mode} />
        </AboutSection>
        <AboutSection id="skills" title="Skills">
          <SkillTiers tiers={visible(skills, mode)} mode={mode} />
        </AboutSection>
        <CredentialsList credentials={visible(credentials, mode)} education={education} mode={mode} />
      </div>
    </div>
  );
}

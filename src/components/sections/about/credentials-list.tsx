import { site } from '@/content/site';
import type { Credential, Education, PlaceholderMode } from '@/content/types';
import { Card } from '@/components/ui/card';
import { ExampleTag } from '@/components/ui/chip';
import { Copy, MetaLine } from '@/components/ui/copy';
import { ExternalLink } from '@/components/ui/external-link';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionHeader } from '@/components/ui/section-header';
import { fieldOrNull } from '@/lib/placeholder';

export interface CredentialsListProps {
  /** Every credential, already filtered with visible(); certifications are listed here. */
  readonly credentials: readonly Credential[];
  /** The degree (profile.education), shown under Education. */
  readonly education: Education;
  readonly mode?: PlaceholderMode;
}

export const CREDENTIALS_HEADING_ID = 'credentials-title';

function CertificationCard({ credential, mode }: { readonly credential: Credential; readonly mode: PlaceholderMode }) {
  const title = fieldOrNull(credential.title, mode);
  return (
    <Card as="li" surface="raised" radius="control" pad="sm" className="flex items-start gap-3" data-credential={credential.id}>
      <IconTile icon="award" tone="soft" size={28} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {title !== null ? <Copy as="strong" text={title} mode={mode} className="text-body-sm font-bold text-ink" /> : null}
          {mode === 'label' && credential.example === true ? <ExampleTag /> : null}
        </div>
        <MetaLine segments={[credential.issuer, credential.year]} mode={mode} className="text-meta text-ink-3" />
        {credential.url ? (
          <ExternalLink href={credential.url} className="mt-1 self-start text-meta">
            Verify
          </ExternalLink>
        ) : null}
      </div>
    </Card>
  );
}

/**
 * Credentials and education (design §8). The section is #credentials; Education sits inside it
 * as #education, so both About anchors land even in hide mode, when the Example certification
 * is gone and the degree is all there is. The degree is shown once, under Education.
 */
export function CredentialsList({ credentials, education, mode = site.placeholders }: CredentialsListProps) {
  const certifications = credentials.filter((credential) => credential.kind === 'certification');
  return (
    <section id="credentials" aria-labelledby={CREDENTIALS_HEADING_ID} className="flex flex-col gap-8">
      <SectionHeader as="h2" size="section" id={CREDENTIALS_HEADING_ID} title="Credentials" />
      {certifications.length > 0 ? (
        <div className="flex flex-col gap-4" data-certifications="">
          <SectionHeader as="h3" size="card" title="Certifications" />
          <ul className="grid gap-3 @xl:grid-cols-2">
            {certifications.map((credential) => (
              <CertificationCard key={credential.id} credential={credential} mode={mode} />
            ))}
          </ul>
        </div>
      ) : null}
      <div id="education" className="flex flex-col gap-4">
        <SectionHeader as="h3" size="card" title="Education" />
        <ul className="grid gap-3 @xl:grid-cols-2">
          <Card as="li" surface="raised" radius="control" pad="sm" className="flex items-start gap-3" data-education="">
            <IconTile icon="graduation-cap" tone="soft" size={28} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <strong className="text-body-sm font-bold text-ink">{education.degree}</strong>
              <MetaLine
                segments={[`${education.school} (${education.short})`, education.year]}
                mode={mode}
                className="text-meta text-ink-3"
              />
            </div>
          </Card>
        </ul>
      </div>
    </section>
  );
}

// STUB — owned by W11, replaced in wave 2b

/** Renders one schema.org object as an inline JSON-LD script. `<` is escaped so content can never close the tag. */
export function JsonLd({ data }: { readonly data: Readonly<Record<string, unknown>> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

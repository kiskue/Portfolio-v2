const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/**
 * JSON for an inline <script type="application/ld+json">. JSON.stringify leaves `<`, `>` and `&`
 * as they are, so a string holding "</script>" could close the tag early; each becomes its
 * backslash-u escape instead, which is the same JSON. U+2028 and U+2029 are escaped too: they are
 * valid in JSON strings but end a line in older JavaScript parsers.
 */
export function serializeJsonLd(data: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(data)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll(LINE_SEPARATOR, '\\u2028')
    .replaceAll(PARAGRAPH_SEPARATOR, '\\u2029');
}

/** Renders one schema.org object as an inline JSON-LD script (a Server Component; no JS ships). */
export function JsonLd({ data }: { readonly data: Readonly<Record<string, unknown>> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

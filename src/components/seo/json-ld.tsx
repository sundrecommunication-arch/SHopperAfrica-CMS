/**
 * Renders a JSON-LD <script> tag from a plain object. Centralized here so
 * every structured-data block on the site serializes safely the same way —
 * `<` is escaped so a value can never prematurely close the script tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

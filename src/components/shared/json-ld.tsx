/** A schema.org object (or graph) — see https://schema.org and Google's structured-data guidelines. */
export type JsonLdData = Record<string, unknown>;

/**
 * The single sanctioned use of `dangerouslySetInnerHTML` (see AGENTS.md). JSON-LD must be emitted as a raw
 * `<script type="application/ld+json">`; escaping every `<` as `<` means user-supplied strings can never
 * close the script element, so the payload cannot inject markup.
 */
export function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

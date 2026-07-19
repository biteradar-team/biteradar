/**
 * Renders a JSON-LD structured-data block. This is the sanctioned use of
 * `dangerouslySetInnerHTML`: structured data MUST live in a
 * `<script type="application/ld+json">`. `data` is server-controlled and
 * `JSON.stringify`'d; we additionally escape `<` so no value can break out of
 * the script tag (the standard JSON-LD XSS guard).
 */
export default function JsonLd({data}: {data: object}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}

/** Split generated narrative into paragraphs on blank lines; single line breaks stay inside a paragraph. */
export function splitParagraphs(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

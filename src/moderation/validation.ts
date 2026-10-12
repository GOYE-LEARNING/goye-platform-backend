export const MAX_TITLE_CHARS = 300;
export const MAX_CONTENT_CHARS = 10000;

/** Returns an error message, or null when the text is acceptable. */
export function validateText(input: { title?: unknown; content?: unknown }): string | null {
  if ("title" in input) {
    if (typeof input.title !== "string" || !input.title.trim()) return "A title is required.";
    if (input.title.length > MAX_TITLE_CHARS) return `Title must be ${MAX_TITLE_CHARS} characters or fewer.`;
  }
  if (typeof input.content !== "string" || !input.content.trim()) return "Content is required.";
  if (input.content.length > MAX_CONTENT_CHARS) return `Content must be ${MAX_CONTENT_CHARS} characters or fewer.`;
  return null;
}

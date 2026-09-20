/**
 * Decoding for base64 file payloads sent in JSON bodies.
 *
 * Every upload controller did `Buffer.from(body.file, "base64")` directly,
 * which is silently wrong in two common cases:
 *
 *  1. A data URL. `FileReader.readAsDataURL` — the usual way a browser turns a
 *     picked file into a string — yields "data:image/png;base64,iVBOR...".
 *     Node does not reject the "data:image/png;base64," prefix; it decodes
 *     what it can and returns a buffer whose leading bytes are garbage. The
 *     upload then succeeds and stores a corrupt file, so the failure only
 *     shows up later as an image that won't render or a document that won't
 *     open. That is the worst shape a bug can take: no error anywhere near
 *     the cause.
 *
 *  2. Whitespace. Base64 that has been wrapped across lines, or padded with
 *     spaces by a client, decodes to the wrong bytes the same silent way.
 *
 * Node's base64 decoder also ignores characters outside the base64 alphabet
 * rather than throwing, so there is no error to catch — the check has to be
 * explicit. This helper normalises the input and reports a clear reason
 * instead of handing Cloudinary something broken.
 */

export interface DecodedUpload {
  buffer: Buffer | null;
  error: string | null;
}

/** Matches a data-URL preamble, e.g. `data:application/pdf;base64,`. */
const DATA_URL_PREFIX = /^data:[^;,]*(;[^;,]*)*;base64,/i;

export function decodeBase64Upload(raw: unknown): DecodedUpload {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { buffer: null, error: "No file content was provided." };
  }

  // Strip a data-URL preamble if the client sent one, then remove whitespace
  // (including the newlines some encoders insert every 76 characters).
  const cleaned = raw.replace(DATA_URL_PREFIX, "").replace(/\s/g, "");

  if (cleaned === "") {
    return { buffer: null, error: "The file content was empty after decoding." };
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
    return {
      buffer: null,
      error: "The file content is not valid base64. Send the raw base64 string or a data URL.",
    };
  }

  const buffer = Buffer.from(cleaned, "base64");

  if (buffer.length === 0) {
    return { buffer: null, error: "The decoded file was empty." };
  }

  return { buffer, error: null };
}

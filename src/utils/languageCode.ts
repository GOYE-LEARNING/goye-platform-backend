/**
 * The `LanguageCode` Prisma enum can only use identifier characters (Prisma
 * schema syntax forbids hyphens in enum members), so `zh_CN`/`zh_TW` are
 * stored with an underscore. Everything else that speaks this code — the
 * frontend's language pickers, and Google's translate endpoint
 * (`/translate_a/single?...&tl=zh-CN`) — uses the standard BCP-47 hyphenated
 * form. Without normalizing at this boundary, saving "Chinese" from either
 * language picker sent the hyphenated wire form straight into a Prisma write
 * expecting the enum's underscored form and threw an uncaught
 * PrismaClientValidationError (signup and profile-language-save both hit
 * this for zh-CN/zh-TW specifically; every other code has no hyphen either
 * way, so it round-trips unchanged).
 */
export function toDbLanguageCode(code: string | null | undefined): string | null | undefined {
  return code?.replace(/-/g, "_");
}

export function toWireLanguageCode(code: string | null | undefined): string | null | undefined {
  return code?.replace(/_/g, "-");
}

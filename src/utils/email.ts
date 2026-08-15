import { Prisma } from "@prisma/client";
import prisma from "../db";

/**
 * Email handling for every auth path (signup, login, invite, org creation).
 *
 * Background: `User.email_address` carries a Prisma `@unique`, but Postgres
 * unique indexes are case-SENSITIVE. With no normalization anywhere in the
 * auth controllers, `Sean@x.com` and `sean@x.com` were two genuinely
 * separate accounts — which is how an email "already in the database" could
 * still be used to register again.
 *
 * The fix has to be asymmetric, because accounts with mixed-case emails
 * already exist in production:
 *
 *   - WRITES  (creating a user) store `normalizeEmail()` — lowercased and
 *     trimmed — so no new duplicate can form.
 *   - LOOKUPS (login, existence checks) use `findUserByEmail()`, which
 *     matches case-INSENSITIVELY. Blindly lowercasing a login lookup would
 *     have locked out every existing user whose stored email has a capital
 *     letter, since their row would no longer match.
 */

/** Lowercase + trim. Use for every value written to an email column. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Case-insensitive user lookup by email.
 *
 * Safe for existing rows regardless of the casing they were stored with.
 * Generic over `include` so callers keep the relation types they asked for
 * (e.g. `adminProfile`) instead of collapsing to the bare User shape.
 */
export async function findUserByEmail<
  TInclude extends Prisma.UserInclude | undefined = undefined,
>(
  email: string,
  include?: TInclude,
): Promise<Prisma.UserGetPayload<{ include: TInclude }> | null> {
  if (!email) return null;
  return prisma.user.findFirst({
    where: {
      email_address: {
        equals: normalizeEmail(email),
        mode: "insensitive",
      },
    },
    ...(include ? { include } : {}),
  }) as Promise<Prisma.UserGetPayload<{ include: TInclude }> | null>;
}

/**
 * True when the address already belongs to a registered user, ignoring case.
 * Use this ahead of any account-creating path.
 */
export async function emailAlreadyRegistered(email: string): Promise<boolean> {
  return (await findUserByEmail(email)) !== null;
}

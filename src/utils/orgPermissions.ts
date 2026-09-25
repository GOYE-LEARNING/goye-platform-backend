import prisma from "../db";
import { verifyAccessToken } from "./jwtHelper";

/**
 * A handful of organization endpoints (e.g. UpdateOrganization, hit during
 * signup to attach an uploaded logo/document right after CreateOrganization
 * but BEFORE OTP verification, when no session cookie exists yet) can't
 * carry `@Security("bearerAuth")` — that decorator rejects the request
 * before the handler ever runs, which would break that legitimate pre-auth
 * call. This reads whatever token IS present, non-throwing, so a route can
 * still enforce authorization when a session exists without hard-requiring
 * one to exist at all.
 */
export function decodeOptionalRequester(req: any): { id: string; role: string } | null {
  try {
    const token =
      req.headers?.["authorization"]?.split(" ")[1] || req.cookies?.accessToken;
    if (!token) return null;
    const decoded = verifyAccessToken(token);
    if (!decoded?.id) return null;
    return { id: decoded.id, role: decoded.role };
  } catch {
    return null;
  }
}

/**
 * Every org-admin mutation in OrganizationController used to check only
 * `req.user.role === "org_admin"` — a GLOBAL role, not proof the requester
 * administers THIS specific organization. That meant any org's admin could
 * remove/suspend/promote members, create/edit/delete events and
 * announcements, or update/delete another organization's record, just by
 * knowing (or guessing) its id in the URL.
 *
 * This checks the requester is either the organization's owner
 * (Organization.userId) or an active OrganizationMember of THIS org with an
 * admin-level membership role — not just "an org_admin somewhere."
 */
export async function assertOrgAdminOf(
  req: any,
  organizationId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;

  if (!requesterId) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  if (requesterRole !== "org_admin") {
    return {
      ok: false,
      status: 403,
      message: "Only organization admins can perform this action",
    };
  }

  const [org, membership] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { userId: true },
    }),
    prisma.organizationMember.findFirst({
      where: { userId: requesterId, organizationId, isActive: true },
      select: { role: true },
    }),
  ]);

  const isOwner = !!org?.userId && org.userId === requesterId;
  const isAdminMember =
    !!membership && (membership.role === "admin" || membership.role === "org_admin");

  if (!isOwner && !isAdminMember) {
    return {
      ok: false,
      status: 403,
      message: "You are not an admin of this organization",
    };
  }
  return { ok: true };
}

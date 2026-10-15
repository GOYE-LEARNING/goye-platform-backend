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

export type MemberAction = "remove" | "suspend" | "demote";

const isAdminRole = (role?: string | null) => role === "admin" || role === "org_admin";

/**
 * Who may act on WHICH member. assertOrgAdminOf only proves the requester administers the
 * organization; it says nothing about the person they are acting on. Without this an admin could
 * suspend any account on the platform by id, or remove the organization's owner.
 *
 *  - the target must really be a member of THIS organization
 *  - nobody can act on the owner, or on themselves
 *  - only the owner may act on another admin (admins manage members, not each other)
 *  - demoting is the owner's call alone
 */
export async function assertCanManageMember(
  req: any,
  organizationId: string,
  targetUserId: string,
  action: MemberAction,
): Promise<
  | { ok: true; ownerId: string | null; membershipRole: string }
  | { ok: false; status: number; message: string }
> {
  const base = await assertOrgAdminOf(req, organizationId);
  if (base.ok === false) return base;

  const requesterId = req.user?.id as string;
  const [org, membership] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { userId: true } }),
    prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: targetUserId, organizationId } },
      select: { role: true, joinedVia: true },
    }),
  ]);

  if (!membership) {
    return { ok: false, status: 404, message: "This user is not a member of this organization" };
  }

  const ownerId = org?.userId ?? null;
  const targetIsOwner = (!!ownerId && ownerId === targetUserId) || membership.joinedVia === "CREATED";
  const requesterIsOwner = !!ownerId && ownerId === requesterId;

  if (targetIsOwner) {
    return { ok: false, status: 403, message: `The organization owner can't be ${action === "demote" ? "demoted" : action === "remove" ? "removed" : "suspended"}` };
  }
  if (requesterId === targetUserId) {
    return { ok: false, status: 400, message: `You can't ${action} yourself` };
  }
  if (action === "demote") {
    if (!requesterIsOwner) {
      return { ok: false, status: 403, message: "Only the organization owner can remove admin rights" };
    }
    if (!isAdminRole(membership.role)) {
      return { ok: false, status: 409, message: "This member is not an admin" };
    }
  } else if (isAdminRole(membership.role) && !requesterIsOwner) {
    return { ok: false, status: 403, message: `Only the organization owner can ${action} another admin` };
  }

  return { ok: true, ownerId, membershipRole: membership.role };
}

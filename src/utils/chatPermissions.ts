import prisma from "../db";

const ORG_LEADER_ROLES = ["org_admin", "instructor", "tutor"];

/**
 * A rank-and-file organization member (student/invited_user, not an org
 * admin or instructor) may only start a chat with their OWN organization's
 * admins/instructors — not with independent ("diaspora") tutors, other
 * organizations' people, or anyone else. Org admins/instructors themselves
 * aren't restricted by this — it only gates the plain-member side.
 *
 * Anyone with no active OrganizationMember row at all (an independent
 * student or tutor who never joined an org) is unaffected — behavior for
 * them stays exactly as it was before this rule existed.
 *
 * Shared by both send paths: the REST endpoint (DiscussionController's
 * SendPrivateMessage) and the live Socket.IO path (socketService's
 * PRIVATE_MESSAGE handler) — the two used to create PrivateMessage rows
 * independently, so this rule has to be enforced in both places.
 */
export async function assertCanStartPrivateChat(
  senderId: string,
  receiverId: string,
): Promise<{ allowed: true } | { allowed: false; message: string }> {
  const senderMembership = await prisma.organizationMember.findFirst({
    where: { userId: senderId, isActive: true },
    select: { organizationId: true },
  });
  if (!senderMembership) return { allowed: true };

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { role: true },
  });
  if (sender && ORG_LEADER_ROLES.includes(sender.role)) return { allowed: true };

  const [receiver, receiverMembership] = await Promise.all([
    prisma.user.findUnique({ where: { id: receiverId }, select: { role: true } }),
    prisma.organizationMember.findFirst({
      where: {
        userId: receiverId,
        organizationId: senderMembership.organizationId,
        isActive: true,
      },
      select: { id: true },
    }),
  ]);

  const receiverIsOwnOrgLeader =
    !!receiverMembership && !!receiver && ORG_LEADER_ROLES.includes(receiver.role);

  if (!receiverIsOwnOrgLeader) {
    return {
      allowed: false,
      message: "You can only message admins and instructors within your organization.",
    };
  }
  return { allowed: true };
}

export { ORG_LEADER_ROLES };

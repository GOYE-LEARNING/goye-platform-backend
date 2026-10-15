import "../../moderation/__tests__/env-setup";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import prisma from "../../db";
import { OrganizationController } from "../../controllers/OrganizationController";

const tag = `orgtest-${Date.now()}`;
const userIds: string[] = [];
const orgIds: string[] = [];

async function mkUser(name: string, role = "invited_user", userType: any = "INVITED_MEMBER") {
  const u = await prisma.user.create({
    data: {
      first_name: name,
      last_name: "Test",
      email_address: `${tag}-${name}@example.test`,
      country: "x",
      state: "x",
      phone_number: "0",
      level: "Beginners",
      role,
      userType,
    },
  });
  userIds.push(u.id);
  return u;
}

async function mkOrg(ownerId: string, n: string) {
  const o = await prisma.organization.create({
    data: {
      organization_name: `${tag}-${n}`,
      organization_email: `${tag}-${n}@org.test`,
      organization_phone_number: "0",
      organization_country: "x",
      organization_state: "x",
      organization_description: "x",
      organization_role: "x",
      organization_year: "2020",
      lastActive: new Date(),
      userId: ownerId,
    },
  });
  orgIds.push(o.id);
  await prisma.organizationMember.create({
    data: { userId: ownerId, organizationId: o.id, role: "org_admin", joinedVia: "CREATED" },
  });
  return o;
}

const join = (userId: string, organizationId: string, role = "member") =>
  prisma.organizationMember.create({ data: { userId, organizationId, role, joinedVia: "INVITE" } });

const as = (u: { id: string; role: string }) => ({ user: { id: u.id, role: u.role } });
const ctl = () => new OrganizationController();

let owner: any, admin: any, member: any, outsider: any, otherOwner: any;
let org: any, otherOrg: any;

before(async () => {
  owner = await mkUser("owner", "org_admin", "ORGANIZATION_OWNER");
  admin = await mkUser("admin", "org_admin");
  member = await mkUser("member");
  outsider = await mkUser("outsider");
  otherOwner = await mkUser("otherowner", "org_admin", "ORGANIZATION_OWNER");
  org = await mkOrg(owner.id, "a");
  otherOrg = await mkOrg(otherOwner.id, "b");
  await join(admin.id, org.id, "admin");
  await join(member.id, org.id);
  await join(outsider.id, otherOrg.id); // belongs to a DIFFERENT organization
});

after(async () => {
  await prisma.organizationMember.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("organization member management", () => {
  it("an admin can no longer suspend someone who isn't in their organization", async () => {
    const c = ctl();
    const r = await c.SuspendMember(org.id, outsider.id, { suspend: true }, as(admin));
    assert.equal(r.success, false);
    assert.equal(c.getStatus(), 404);
    assert.equal((await prisma.user.findUnique({ where: { id: outsider.id } }))!.isSuspended, false);
  });

  it("an admin cannot remove or suspend the owner", async () => {
    for (const act of ["remove", "suspend"] as const) {
      const c = ctl();
      const r =
        act === "remove"
          ? await c.RemoveMember(org.id, owner.id, as(admin))
          : await c.SuspendMember(org.id, owner.id, { suspend: true }, as(admin));
      assert.equal(r.success, false, act);
      assert.equal(c.getStatus(), 403, act);
    }
    assert.ok(await prisma.organizationMember.findFirst({ where: { userId: owner.id, organizationId: org.id } }));
    assert.equal((await prisma.user.findUnique({ where: { id: owner.id } }))!.isSuspended, false);
  });

  it("even the owner cannot remove themselves", async () => {
    const c = ctl();
    const r = await c.RemoveMember(org.id, owner.id, as(owner));
    assert.equal(r.success, false);
    assert.ok([400, 403].includes(c.getStatus()));
  });

  it("an admin cannot act on another admin, but can still manage ordinary members", async () => {
    const other = await mkUser("admin2", "org_admin");
    await join(other.id, org.id, "admin");

    let c = ctl();
    assert.equal((await c.SuspendMember(org.id, other.id, { suspend: true }, as(admin))).success, false);
    assert.equal(c.getStatus(), 403);

    c = ctl();
    const ok = await c.SuspendMember(org.id, member.id, { suspend: true }, as(admin));
    assert.equal(ok.success, true);
    await ctl().SuspendMember(org.id, member.id, { suspend: false }, as(admin));

    // the owner can act on an admin
    c = ctl();
    assert.equal((await c.RemoveMember(org.id, other.id, as(owner))).success, true);
  });

  it("an admin of another organization can't touch this one", async () => {
    const c = ctl();
    const r = await c.RemoveMember(org.id, member.id, as(otherOwner));
    assert.equal(r.success, false);
    assert.equal(c.getStatus(), 403);
  });

  it("promote then demote: the member goes back to an ordinary role", async () => {
    let c = ctl();
    assert.equal((await c.PromoteMember(org.id, member.id, as(owner))).success, true);
    assert.equal((await prisma.user.findUnique({ where: { id: member.id } }))!.role, "org_admin");

    // an admin can't demote, only the owner
    c = ctl();
    assert.equal((await c.DemoteMember(org.id, member.id, as(admin))).success, false);
    assert.equal(c.getStatus(), 403);

    c = ctl();
    const r = await c.DemoteMember(org.id, member.id, as(owner));
    assert.equal(r.success, true);
    const after = await prisma.user.findUnique({ where: { id: member.id } });
    assert.equal(after!.role, "invited_user");
    const m = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: member.id, organizationId: org.id } },
    });
    assert.equal(m!.role, "member");
  });

  it("demoting someone who is not an admin, or the owner, is refused", async () => {
    let c = ctl();
    assert.equal((await c.DemoteMember(org.id, member.id, as(owner))).success, false);
    assert.equal(c.getStatus(), 409);
    c = ctl();
    assert.equal((await c.DemoteMember(org.id, owner.id, as(owner))).success, false);
    assert.ok([400, 403].includes(c.getStatus()));
  });

  it("someone who still administers another organization keeps the org_admin role when demoted here", async () => {
    const both = await mkUser("both", "org_admin");
    await join(both.id, org.id, "admin");
    await join(both.id, otherOrg.id, "admin");
    const r = await ctl().DemoteMember(org.id, both.id, as(owner));
    assert.equal(r.success, true);
    assert.equal((await prisma.user.findUnique({ where: { id: both.id } }))!.role, "org_admin");
  });
});

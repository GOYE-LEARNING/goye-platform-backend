// prisma/create-admin.ts
import dotenv from "dotenv";
dotenv.config();
import prisma from "../src/db";
import bcrypt from "bcryptjs";
import readline from "readline";
import { Writable } from "stream";
import { normalizeEmail } from "../src/utils/email";

// readline writes through this stream. While `muted` is true everything it
// writes (including the characters you type) is swallowed, so passwords stay
// hidden, but the prompt text we print ourselves is never erased.
let muted = false;
const mutableStdout = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding as BufferEncoding);
    callback();
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: mutableStdout,
  terminal: true,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

/** Like question(), but doesn't echo what's typed (for passwords). */
function questionHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    // Print the prompt ourselves, THEN mute readline's output.
    const label = query.replace(/:\s*$/, "");
    process.stdout.write(`${label} (typing is hidden, press Enter when done): `);
    muted = true;
    rl.question("", (answer) => {
      muted = false;
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

/** Host + database name only. Never prints the username or password. */
function describeDatabase(): string {
  try {
    const url = new URL(process.env.DATABASE_URL || "");
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "(DATABASE_URL missing or unreadable)";
  }
}

const PERMISSIONS: Record<string, Record<string, boolean>> = {
  super_admin: {
    canManageUsers: true,
    canManageCourses: true,
    canManageGroups: true,
    canManageAdmins: true,
    canViewAnalytics: true,
    canDeleteContent: true,
  },
  content_admin: {
    canManageUsers: false,
    canManageCourses: true,
    canManageGroups: true,
    canManageAdmins: false,
    canViewAnalytics: true,
    canDeleteContent: true,
  },
  user_admin: {
    canManageUsers: true,
    canManageCourses: false,
    canManageGroups: false,
    canManageAdmins: false,
    canViewAnalytics: false,
    canDeleteContent: false,
  },
};

async function createAdmin() {
  try {
    console.log("\n===== VALIDATE PASSWORD =====\n");
    if (
      process.env.PROTECTION_PASSWORD == undefined ||
      process.env.PROTECTION_PASSWORD == ""
    ) {
      console.log("Protection Password not found");
      return;
    }
    const checkPass = await questionHidden("Admin Password: ");
    if (checkPass !== process.env.PROTECTION_PASSWORD) {
      console.log("\n[ERROR] Incorrect password. Exiting...\n");
      return;
    }
    console.log("\n[OK] Password verified!\n");

    // Which database is this script about to write to? It reads the LOCAL
    // .env, which is not necessarily the same database your Render backend
    // uses. Always confirm before creating anything.
    console.log(`Target database: ${describeDatabase()}`);
    const proceed = await question("Create the admin in THIS database? (yes/no): ");
    if (proceed.trim().toLowerCase() !== "yes") {
      console.log("\n[CANCELLED] Nothing was created.\n");
      return;
    }

    console.log("\n===== CREATE NEW ADMIN =====\n");

    // Email: stored normalized, and checked case-insensitively against BOTH
    // user accounts and organization emails (same rule signup uses).
    let email = "";
    while (!email) {
      const input = await question("Email: ");
      if (!input) {
        console.log("[ERROR] Email is required\n");
        continue;
      }
      if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(input)) {
        console.log("[ERROR] Invalid email format\n");
        continue;
      }

      const normalized = normalizeEmail(input);
      const [existingUser, existingOrg] = await Promise.all([
        prisma.user.findFirst({
          where: { email_address: { equals: normalized, mode: "insensitive" } },
          select: { id: true, role: true },
        }),
        prisma.organization.findFirst({
          where: { organization_email: { equals: normalized, mode: "insensitive" } },
          select: { id: true },
        }),
      ]);

      if (existingUser) {
        console.log(
          `[ERROR] ${normalized} already exists as a user (role: ${existingUser.role})\n`,
        );
        continue;
      }
      if (existingOrg) {
        console.log(`[ERROR] ${normalized} is already registered to an organization\n`);
        continue;
      }
      email = normalized;
    }

    const firstName = await question("First Name: ");
    const lastName = await question("Last Name: ");

    let country = await question("Country: ");
    if (!country) country = "N/A";

    let state = await question("State/Province: ");
    if (!state) state = "N/A";

    let phoneNumber = await question("Phone Number: ");
    if (!phoneNumber) phoneNumber = "0000000000";

    // Admin Role
    const roleOptions = ["super_admin", "content_admin", "user_admin"];
    console.log("\nAdmin Roles:");
    roleOptions.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
    console.log("  super_admin - Full access to everything");
    console.log("  content_admin - Manage courses, groups, content");
    console.log("  user_admin - Manage users only");

    const roleInput = await question(
      `Choose role (1-3) or press Enter for super_admin: `,
    );
    const roleNum = parseInt(roleInput);
    const adminRole =
      !isNaN(roleNum) && roleNum >= 1 && roleNum <= 3
        ? roleOptions[roleNum - 1]
        : "super_admin";

    // Level
    const levelOptions = [
      "Seeker",
      "Learner",
      "Disciple",
      "Ambassador",
      "Mentor",
      "Administrator",
    ];
    console.log("\nAvailable Levels:");
    levelOptions.forEach((l, i) => console.log(`  ${i + 1}. ${l}`));

    const levelInput = await question(
      `Choose level (1-6) or press Enter for Administrator: `,
    );
    const levelNum = parseInt(levelInput);
    const level =
      !isNaN(levelNum) && levelNum >= 1 && levelNum <= 6
        ? levelOptions[levelNum - 1]
        : "Administrator";

    // Password (hidden, entered twice)
    let password = "";
    while (!password) {
      const first = await questionHidden("Password (min 8 chars): ");
      if (first.length < 8) {
        console.log("[ERROR] Password must be at least 8 characters\n");
        continue;
      }
      const second = await questionHidden("Confirm password: ");
      if (first !== second) {
        console.log("[ERROR] Passwords do not match\n");
        continue;
      }
      password = first;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // User + admin profile are created together: if the profile fails, the
    // user is rolled back instead of being left behind as a half-made admin.
    const admin = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          first_name: firstName || "System",
          last_name: lastName || "Administrator",
          email_address: email,
          password: hashedPassword,
          role: "goye_admin",
          // Without this the DB default (INDIVIDUAL) applied, so admins were
          // counted as individual learners in the dashboard stats.
          // NOTE: needs "ADMIN" to exist in your UserType enum.
          userType: "ADMIN" as any,
          form_type: "ADMIN",
          country,
          state,
          phone_number: phoneNumber,
          level,
          point: 0,
          isProfileComplete: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      await tx.adminProfile.create({
        data: {
          userId: created.id,
          role: adminRole,
          permissions: PERMISSIONS[adminRole],
          isActive: true,
        },
      });

      return created;
    });

    console.log("\n===== ADMIN CREATED SUCCESSFULLY =====\n");
    console.log(`Database: ${describeDatabase()}`);
    console.log(`Email: ${email}`);
    console.log(
      `Name: ${firstName || "System"} ${lastName || "Administrator"}`,
    );
    // The password is deliberately NOT printed. It would sit in terminal
    // history and screen recordings.
    console.log(`Admin Role: ${adminRole}`);
    console.log(`Level: ${level}`);
    console.log(`Location: ${country}, ${state}`);
    console.log(`Phone: ${phoneNumber}`);
    console.log(`ID: ${admin.id}\n`);
  } catch (error: any) {
    if (error?.code === "P2021") {
      console.log("\n[ERROR] AdminProfile table does not exist");
      console.log(
        "Run migration first: npx prisma migrate dev --name add_admin_profile",
      );
      console.log("No user was created (the transaction was rolled back).\n");
    } else {
      console.error("\n[ERROR] Failed to create admin:", error);
    }
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createAdmin();
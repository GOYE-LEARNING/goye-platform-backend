// prisma/create-admin.ts
import dotenv from "dotenv";
dotenv.config();
import prisma from "../src/db";
import bcrypt from "bcryptjs";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

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
    const checkPass = await question("Admin Password: ");
    if (checkPass !== process.env.PROTECTION_PASSWORD) {
      console.log("\n[ERROR] Incorrect password. Exiting...\n");
      rl.close();
      return;
    }

    console.log("\n[OK] Password verified!\n");
    console.log("===== CREATE NEW ADMIN =====\n");

    // Email
    let email = "";
    while (!email) {
      email = await question("Email: ");
      if (!email) {
        console.log("[ERROR] Email is required\n");
        continue;
      }

      if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)) {
        console.log("[ERROR] Invalid email format\n");
        email = "";
        continue;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email_address: email },
      });
      if (existingUser) {
        console.log(`[ERROR] Email ${email} already exists\n`);
        email = "";
      }
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

    let adminRole = await question(
      `Choose role (1-3) or press Enter for super_admin: `,
    );
    const roleNum = parseInt(adminRole);
    if (!isNaN(roleNum) && roleNum >= 1 && roleNum <= 3) {
      adminRole = roleOptions[roleNum - 1];
    } else {
      adminRole = "super_admin";
    }

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

    let level = await question(
      `Choose level (1-6) or press Enter for Administrator: `,
    );
    const levelNum = parseInt(level);
    if (!isNaN(levelNum) && levelNum >= 1 && levelNum <= 6) {
      level = levelOptions[levelNum - 1];
    } else {
      level = "Administrator";
    }

    // Password
    let password = "";
    while (!password) {
      password = await question("Password (min 8 chars): ");
      if (password.length < 8) {
        console.log("[ERROR] Password must be at least 8 characters\n");
        password = "";
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the admin user
    const admin = await prisma.user.create({
      data: {
        first_name: firstName || "System",
        last_name: lastName || "Administrator",
        email_address: email,
        password: hashedPassword,
        role: "goye_admin",
        country: country,
        state: state,
        phone_number: phoneNumber,
        level: level,
        point: 0,
        form_type: "ADMIN",
      },
    });

    console.log("\n[OK] Admin user created");

    // Set permissions based on role
    let permissions = {};

    switch (adminRole) {
      case "super_admin":
        permissions = {
          canManageUsers: true,
          canManageCourses: true,
          canManageGroups: true,
          canManageAdmins: true,
          canViewAnalytics: true,
          canDeleteContent: true,
        };
        break;
      case "content_admin":
        permissions = {
          canManageUsers: false,
          canManageCourses: true,
          canManageGroups: true,
          canManageAdmins: false,
          canViewAnalytics: true,
          canDeleteContent: true,
        };
        break;
      case "user_admin":
        permissions = {
          canManageUsers: true,
          canManageCourses: false,
          canManageGroups: false,
          canManageAdmins: false,
          canViewAnalytics: false,
          canDeleteContent: false,
        };
        break;
    }

    // Create admin profile
    try {
      await prisma.adminProfile.create({
        data: {
          userId: admin.id,
          role: adminRole,
          permissions: permissions,
          isActive: true,
        },
      });
      console.log("[OK] Admin profile created");
    } catch (error: any) {
      if (error.code === "P2021") {
        console.log("\n[WARNING] AdminProfile table does not exist");
        console.log(
          "Run migration first: npx prisma migrate dev --name add_admin_profile",
        );
      } else {
        throw error;
      }
    }

    console.log("\n===== ADMIN CREATED SUCCESSFULLY =====\n");
    console.log(`Email: ${email}`);
    console.log(
      `Name: ${firstName || "System"} ${lastName || "Administrator"}`,
    );
    console.log(`Password: ${password}`);
    console.log(`Admin Role: ${adminRole}`);
    console.log(`Level: ${level}`);
    console.log(`Location: ${country}, ${state}`);
    console.log(`Phone: ${phoneNumber}`);
    console.log(`ID: ${admin.id}\n`);
  } catch (error) {
    console.error("\n[ERROR] Failed to create admin:", error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createAdmin();

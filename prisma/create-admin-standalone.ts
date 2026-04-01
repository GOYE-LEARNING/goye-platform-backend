// prisma/create-admin-standalone.ts
import dotenv from "dotenv";
dotenv.config();

// Import your existing db.ts that has the correct Prisma configuration
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
    console.log("\n🔌 Testing database connection...");
    await prisma.$connect();
    console.log("✅ Database connected!\n");
    
    console.log("🔐 ===== VALIDATE PASSWORD =====\n");
    
    const protectionPass = process.env.PROTECTION_PASSWORD;
    if (!protectionPass) {
      console.log("❌ PROTECTION_PASSWORD not set in .env");
      process.exit(1);
    }
    
    const inputPass = await question("🔑 Admin Creation Password: ");
    if (inputPass !== protectionPass) {
      console.log("❌ Incorrect password");
      process.exit(1);
    }
    
    console.log("\n✅ Password verified!\n");
    console.log("📝 ===== CREATE NEW ADMIN =====\n");

    // Email
    let email = "";
    while (!email) {
      email = await question("📧 Email: ");
      if (!email) {
        console.log("❌ Email is required\n");
        continue;
      }
      
      const existing = await prisma.user.findUnique({
        where: { email_address: email },
      });
      if (existing) {
        console.log(`❌ Email ${email} already exists\n`);
        email = "";
      }
    }

    const firstName = await question("👤 First Name: ");
    const lastName = await question("👥 Last Name: ");
    
    let password = "";
    while (!password) {
      password = await question("🔑 Password (min 8 chars): ");
      if (password.length < 8) {
        console.log("❌ Password must be at least 8 characters\n");
        password = "";
      }
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await prisma.user.create({
      data: {
        first_name: firstName || "System",
        last_name: lastName || "Administrator",
        email_address: email,
        password: hashedPassword,
        role: "admin",
        country: "System",
        state: "System",
        phone_number: "0000000000",
        level: "Administrator",
        point: 0,
      },
    });
    
    console.log("\n🎉 ===== ADMIN CREATED SUCCESSFULLY ===== 🎉");
    console.log(`\n📧 Email: ${email}`);
    console.log(`👤 Name: ${firstName || "System"} ${lastName || "Administrator"}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`🆔 Admin ID: ${admin.id}`);
    console.log(`\n⚠️  PLEASE SAVE THESE CREDENTIALS SECURELY!\n`);

  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

createAdmin();
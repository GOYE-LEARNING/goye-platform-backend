import prisma from "./db"; // Adjust path to your prisma client import

async function listTables() {
  // Query the database's information schema for table names
  const tableNames = await prisma.$queryRaw<
    { table_name: string }[]
  >`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;

  console.log("Tables in your database:");
  console.log(tableNames.map(t => t.table_name));

  await prisma.$disconnect();
}

listTables();

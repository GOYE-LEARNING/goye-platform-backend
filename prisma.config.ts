import 'dotenv/config'
import type { PrismaConfig } from "prisma";
import { env } from "prisma/config";
const DATABASE_URL="postgresql://neondb_owner:npg_jfPyOUL5vIn9@ep-flat-lake-ah2y69tp-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: { 
    url: env("DATABASE_URL") ?? DATABASE_URL
  }
} satisfies PrismaConfig;
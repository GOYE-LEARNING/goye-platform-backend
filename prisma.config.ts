import type { PrismaConfig } from 'prisma';
export default {
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    // assumes Render injects DATABASE_URL as an environment variable
    url: process.env.DATABASE_URL!, 
  },
} satisfies PrismaConfig;
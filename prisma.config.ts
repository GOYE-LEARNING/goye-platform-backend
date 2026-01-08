import type { PrismaConfig } from 'prisma';

export default {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL!, // Render will inject this; locally set it in .env or shell
  },
} satisfies PrismaConfig;
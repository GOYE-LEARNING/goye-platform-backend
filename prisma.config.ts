// prisma.config.ts
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // no env() helper, no dotenv
    url: process.env.DATABASE_URL!, // or process.env.DATABASE_URL ?? ''
  },
});
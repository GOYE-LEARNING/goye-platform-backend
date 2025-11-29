import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",

  // ❗ NEW — replaces datasource.url
  datasource: {
    url: env("DATABASE_URL"),
  },
});

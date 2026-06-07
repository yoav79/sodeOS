import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load environment variables from .env.local first (Next.js default), then fallback to .env
dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npx tsx ./prisma/seed.ts",
  },
  datasource: {
    // Requires DATABASE_URL to be defined. If missing, it fails fast.
    url: env("DATABASE_URL"),
  },
});





import "dotenv/config";
import { defineConfig } from "prisma/config";

// Defensive trimming of DATABASE_URL to prevent "invalid characters" error (e.g. from BOM/whitespace)
const url = (process.env.DATABASE_URL || "file:./dev.db").trim();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
});

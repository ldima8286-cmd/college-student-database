import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.sqlite.ts',
  out: './drizzle/sqlite',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL?.replace('sqlite:', '') ?? './database.sqlite',
  },
  verbose: true,
  strict: true,
});
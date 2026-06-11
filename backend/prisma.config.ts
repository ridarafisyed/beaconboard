import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';

config();

const databaseUrl = process.env['DATABASE_URL'];

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: databaseUrl
    ? {
        url: databaseUrl,
      }
    : {},
});

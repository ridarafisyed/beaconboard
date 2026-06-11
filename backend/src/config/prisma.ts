import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { env } from './env.ts';

const adapter = new PrismaPg(env.databaseUrl);

export const prisma = new PrismaClient({ adapter });

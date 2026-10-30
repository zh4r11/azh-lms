import "server-only";
import { buatAdapter } from "@/lib/adapter";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  return new PrismaClient({ adapter: buatAdapter(Number(process.env.DATABASE_POOL_MAX ?? 10)) });
}

// Reuse one client across hot reloads in dev, otherwise each reload opens a new pool.
export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

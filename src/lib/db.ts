import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Return a proxy that intercepts property access and throws a clear error
    // to avoid breaking build-time imports, but fails fast on actual queries.
    return new Proxy({} as PrismaClient, {
      get: () => {
        throw new Error(
          "DATABASE_URL is not defined in environment variables. Please check your .env.local file."
        );
      },
    });
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const db = globalThis.prismaGlobal ?? prismaClientSingleton();

export default db;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = db;

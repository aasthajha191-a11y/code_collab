import { PrismaClient } from '@prisma/client'
import { env } from '../config/env'

/**
 * prisma.ts — Singleton Prisma client.
 *
 * We create a single instance and reuse it everywhere.
 * In development, we attach it to `global` to prevent hot-reload
 * from creating too many database connections.
 */

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: env.IS_DEV
      ? ['query', 'warn', 'error']  // verbose logging in development
      : ['error'],                   // errors only in production
  })

if (env.IS_DEV) {
  global.__prisma = prisma
}

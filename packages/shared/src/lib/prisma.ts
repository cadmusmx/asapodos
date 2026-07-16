import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const globalForPrismaAdmin = globalThis as unknown as { prismaAdmin: PrismaClient }

export const prismaAdmin =
  globalForPrismaAdmin.prismaAdmin || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrismaAdmin.prismaAdmin = prismaAdmin

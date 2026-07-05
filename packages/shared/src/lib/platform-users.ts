import { prisma } from './prisma'
import type { PlatformRole } from '../types/next-auth'

export async function getPlatformRole(userId: number): Promise<PlatformRole | null> {
  try {
    const result = await prisma.$queryRaw<Array<{ Role: string }>>`
      SELECT Role FROM Security.PlatformUsers WHERE UserID = ${userId}
    `
    
    if (!result[0]) {
      return null
    }

    const role = result[0].Role as PlatformRole
    if (role === 'super_admin' || role === 'support' || role === 'auditor') {
      return role
    }
    
    return null
  } catch {
    return null
  }
}

import { prisma } from '../prisma'

export const ID_ORIGIN_WEB = 2
export const ID_ORIGIN_MOBILE = 3

export type TransactionLogEntry = {
  tenantId: string // uniqueidentifier
  tableName: string // ej. 'Auth.Login', 'Auth.AccessDenied'
  action: string // <= 10 chars (NVARCHAR(10))
  userId?: number | null // int NULL — el fix vive aquí
  oldData?: unknown // se serializa a JSON
  newData?: unknown // se serializa a JSON
  appUser?: string | null
  idOrigin?: number // default web
  changedAt?: Date // default now (la BD igual tiene DEFAULT)
}

export async function writeTransactionLog(entry: TransactionLogEntry): Promise<void> {
  const action = entry.action.slice(0, 10) // respeta NVARCHAR(10)
  const appUser = (entry.appUser ?? 'system').slice(0, 128)
  const idOrigin = entry.idOrigin ?? ID_ORIGIN_WEB
  const oldData = entry.oldData != null ? JSON.stringify(entry.oldData) : null
  const newData = entry.newData != null ? JSON.stringify(entry.newData) : null

  try {
    await prisma.$executeRaw`
      INSERT INTO Audit.TransactionLog (
        TenantID, UserID, TableName, Action,
        OldData, NewData, ChangedAt, AppUser, IdOrigin
      )
      VALUES (
        CAST(${entry.tenantId} AS uniqueidentifier),
        ${entry.userId ?? null},
        ${entry.tableName},
        ${action},
        ${oldData},
        ${newData},
        SYSUTCDATETIME(),
        ${appUser},
        ${idOrigin}
      )
    `
  } catch (error) {
    // Auditoría nunca bloquea el flujo principal. No loguear datos sensibles.
    console.error('[TRANSACTION_LOG_INSERT_ERROR]', {
      tableName: entry.tableName,
      action,
      tenantId: entry.tenantId,
      error
    })
  }
}

import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { PERM, withPermission } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL ?? '';

// IsUrl=1 → FilePath ya es URL completa (docs legacy). IsUrl=0 → key en el bucket nuevo.
const resolveUrl = (filePath: string, isUrl: boolean): string => {
  const src = (filePath ?? '').trim();

  if (!src) return '';
  if (isUrl || src.startsWith('http://') || src.startsWith('https://')) return src;

  const key = src.replace(/^\/+/, '');

  return S3_PUBLIC_BASE_URL ? `${S3_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${key}` : key;
};

type FileRow = {
  FileID: number;
  DocumentTypeID: number | null;
  DocumentTypeName: string | null;
  FilePath: string;
  IsUrl: boolean | number;
};

export const GET = withPermission(
  'employees',
  async (_req, { tenantId }, context: RouteContext) => {
    const { id } = await context.params;
    const employeeId = Number(id);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return NextResponse.json({ message: 'Empleado inválido.' }, { status: 400 });
    }

    return withTenantContext(tenantId, async tx => {
      const rows = await tx.$queryRaw<FileRow[]>(
        Prisma.sql`
          SELECT
            f.FileID,
            f.DocumentTypeID,
            dt.Name AS DocumentTypeName,
            f.FilePath,
            f.IsUrl
          FROM HumanCapital.EmployeeFiles f
          LEFT JOIN HumanCapital.DocumentTypes dt
            ON dt.DocumentTypeID = f.DocumentTypeID
          WHERE f.TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND f.EmployeeID = ${employeeId}
          ORDER BY dt.Name
        `
      );

      return NextResponse.json({
        data: rows.map(row => ({
          fileId: row.FileID,
          documentTypeId: row.DocumentTypeID ?? null,
          documentTypeName: row.DocumentTypeName ?? null,
          url: resolveUrl(row.FilePath, Boolean(row.IsUrl)),
          isUrl: Boolean(row.IsUrl)
        }))
      });
    });
  },
  { bit: PERM.R }
);

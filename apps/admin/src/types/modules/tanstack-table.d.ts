import '@tanstack/react-table';
import type { RowData } from '@tanstack/react-table';
import type { RankingInfo } from '@tanstack/match-sorter-utils';

// Augmentaciones centralizadas de TanStack Table para todo el proyecto.
// Mantener TODOS los campos OPCIONALES: así ninguna tabla obliga a las demás a proveer un meta que no usan.
declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    updateData?: (rowIndex: number, columnId: string, value: unknown) => void
    openDetail?: (row: TData) => void,
  }

  // La interface FilterFns no necesita declarase si solo se usa con fuzzy
  /* interface FilterFns {
    fuzzy?: FilterFn<unknown>
  } */

  interface FilterMeta {
    itemRank?: RankingInfo
  }
}

// REGLA: NO declarar `declare module '@tanstack/react-table'` en componentes.
// Toda augmentación de TableMeta / FilterFns / FilterMeta va AQUÍ, otras augmentaciones de forma global también.
// Campos OPCIONALES para que ninguna tabla obligue a las demás.
// (Centralizado tras encontrar augmentaciones duplicadas y frágiles en todo el repo.)
// Error de motivo "Invalid module name in augmentation, module cannot be found."

// Helpers compartidos del módulo. El prefijo "_" evita que Next lo trate como ruta.

import { Prisma } from '@prisma/client';

export interface Pieza { cl: number | string; pzs: string };
export interface PiezaEdit extends Pieza { id: number | string };

export const isMissing = (v: unknown): boolean => v === undefined || v === null || v === '';

/** Multi-row VALUES parametrizado para las tablas de piezas: (IdVM, Clave, Piezas). */
export function piezasValues(idVM: number, lista: Pieza[], claveIsChar: boolean): Prisma.Sql {
  return Prisma.join(
    lista.map(p => Prisma.sql`(${idVM}, ${claveIsChar ? String(p.cl) : Number(p.cl)}, ${String(p.pzs)})`),
    ', ',
  );
}

/** Ids enteros saneados para cláusulas IN (equivalente parametrizado del safeIds legacy). */
export function safeIds(arr: unknown): number[] {
  return (Array.isArray(arr) ? arr : []).map(x => parseInt(String(x), 10)).filter(n => !isNaN(n));
}

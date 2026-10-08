import { NextRequest } from 'next/server';
import { iniciarActa } from '@/lib/acta-srv';
import { syncInfraccionRelations } from '@/lib/infraccion-relations';
import { loadInfraccionByUuid } from '@/lib/load-infraccion';
import { infraccionToRow } from '@/lib/mappers';
import { check, handle, HttpError, uuid as nuevoUuid } from '@/lib/srv';
import type { Infraccion, InfraccionRow } from '@/lib/types';

/** Campos que solo asigna el sistema: nunca se toman del cliente (numeración, fecha, firma, estado). */
const PROTEGIDOS = [
  'legajo_number', 'legajo_anio', 'legajo_numero_acta', 'legajo_fecha', 'legajo_caratula',
  'infraccion_tipo_id', 'infraccion_tipo_nombre', 'date_created', 'uuid',
] as const;

export async function POST(req: NextRequest) {
  const dto = (await req.json()) as Infraccion;
  return handle(req, async ({ user, db }) => {
    let existing: InfraccionRow | null = null;
    if (dto.uuid) {
      const { data } = await db.from('infraccion').select('*').eq('uuid', dto.uuid).maybeSingle();
      existing = (data as InfraccionRow) ?? null;
    }
    if (!existing) {
      const creada = await iniciarActa(db, user, dto.infraccionTipoNombre, dto.uuid || nuevoUuid());
      const { data } = await db.from('infraccion').select('*').eq('id', creada.id).single();
      existing = data as InfraccionRow;
    }
    check(existing.estado_faltas === 'Borrador', 'El acta ya fue firmada: es inmutable. Use «Subsanar» desde la causa para dejar constancia de una corrección.', 409);

    const row = infraccionToRow({ ...dto, uuid: existing.uuid }) as Record<string, unknown>;
    for (const k of PROTEGIDOS) delete row[k];
    const { error } = await db.from('infraccion').update(row).eq('id', existing.id);
    if (error) throw new HttpError(500, error.message);
    await syncInfraccionRelations(db, existing.id, dto.leyesNombre, dto.dependenciasNombre);
    return loadInfraccionByUuid(existing.uuid);
  }, 'labrar');
}

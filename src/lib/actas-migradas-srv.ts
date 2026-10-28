import { CAMPOS_MIGRADA, fechaMigrada, type ActaMigrada } from './actas-migradas';
import { controlarAdjuntos } from './adjuntos-srv';
import { tipoVisible } from './dominio';
import { check, HttpError, nombreUsuario, uuid, type Db } from './srv';
import type { UsuarioRow } from './types';

export const COLUMNAS_LISTA = 'uuid, infraccion_tipo_id, numero_acta, fecha, legajo, infractor_nombre, infractor_documento, dominio, articulos, lugar, inspector, observaciones, archivo_nombre, lote, cargado_por, cargado_at';

/** Normaliza los datos de un acta migrada: documento solo dígitos, dominio en mayúsculas sin espacios, fecha ISO. */
export function normalizar(datos: Record<string, unknown>): Partial<ActaMigrada> {
  const out: Record<string, string | null> = {};
  for (const c of CAMPOS_MIGRADA) {
    if (!(c.k in datos)) continue;
    let v = String(datos[c.k] ?? '').trim();
    if (c.k === 'infractor_documento') v = v.replace(/\D/g, '');
    if (c.k === 'dominio') v = v.toUpperCase().replace(/[\s-]/g, '');
    if (c.k === 'fecha') {
      const f = fechaMigrada(v);
      check(!v || f, `Fecha inválida: «${v}» (use DD/MM/AAAA)`);
      v = f ?? '';
    }
    out[c.k] = v || null;
  }
  return out as Partial<ActaMigrada>;
}

/** Alta de un acta migrada (manual o una fila de la importación). El escaneo es opcional pero, cargado, no se cambia. */
export async function crearActaMigrada(db: Db, user: UsuarioRow, b: { tipo: number; datos: Record<string, unknown>; archivoNombre?: string; archivoRaw?: string; lote?: string }) {
  const tipo = Number(b.tipo);
  check([1, 2, 3].includes(tipo), 'Indique el tipo de acta');
  check(tipoVisible(user, tipo), 'No gestiona ese tipo de acta', 403);
  const datos = normalizar(b.datos ?? {});
  check(datos.numero_acta, 'Indique el número de acta');
  if (b.archivoRaw) {
    check(String(b.archivoRaw).startsWith('data:'), 'Archivo inválido');
    await controlarAdjuntos(db, [{ nombre: b.archivoNombre, raw: b.archivoRaw }]);
  }
  const { data: ya } = await db.from('acta_migrada').select('uuid').eq('infraccion_tipo_id', tipo).eq('numero_acta', datos.numero_acta!).maybeSingle();
  check(!ya, `El acta ${datos.numero_acta} ya está cargada`, 409);
  const fila = {
    uuid: uuid(), infraccion_tipo_id: tipo, ...datos, archivo_nombre: b.archivoRaw ? (b.archivoNombre || 'acta') : null, archivo_raw: b.archivoRaw || null,
    lote: b.lote || null, cargado_por: nombreUsuario(user), cargado_at: Date.now(),
  };
  const { error } = await db.from('acta_migrada').insert(fila);
  if (error) {
    if (error.code === '23505') throw new HttpError(409, `El acta ${datos.numero_acta} ya está cargada`);
    throw new HttpError(500, /acta_migrada/.test(error.message) ? 'Falta correr sql/038 en la base.' : error.message);
  }
  return { uuid: fila.uuid };
}

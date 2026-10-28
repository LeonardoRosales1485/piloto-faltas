import { NextRequest } from 'next/server';
import { CAMPOS_MIGRADA } from '@/lib/actas-migradas';
import { COLUMNAS_LISTA, normalizar } from '@/lib/actas-migradas-srv';
import { controlarAdjuntos } from '@/lib/adjuntos-srv';
import { tipoVisible } from '@/lib/dominio';
import { check, handle, HttpError, nombreUsuario } from '@/lib/srv';

type Ctx = { params: Promise<{ uuid: string }> };

/** Detalle del acta migrada con su escaneo y las correcciones de datos. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { uuid } = await ctx.params;
  return handle(req, async ({ db, user }) => {
    const { data } = await db.from('acta_migrada').select(`${COLUMNAS_LISTA}, archivo_raw, correcciones_json`).eq('uuid', uuid).maybeSingle();
    const a = data as Record<string, unknown> | null;
    check(a && tipoVisible(user, Number(a.infraccion_tipo_id)), 'Acta no encontrada', 404);
    return a;
  }, 'verActasMigradas');
}

type Body = { datos?: Record<string, unknown>; archivoNombre?: string; archivoRaw?: string };

/**
 * Corrige datos del acta migrada (queda registro de quién, cuándo, antes y después). El escaneo no se reemplaza:
 * solo se puede agregar si el acta se cargó sin él.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { uuid } = await ctx.params;
  const b = (await req.json()) as Body;
  return handle(req, async ({ db, user }) => {
    const { data } = await db.from('acta_migrada').select('id, infraccion_tipo_id, archivo_raw, correcciones_json, ' + CAMPOS_MIGRADA.map((c) => c.k).join(', ')).eq('uuid', uuid).maybeSingle();
    const a = data as unknown as Record<string, unknown> | null;
    check(a && tipoVisible(user, Number(a.infraccion_tipo_id)), 'Acta no encontrada', 404);
    const cambios: Record<string, { antes: string; despues: string }> = {};
    const upd: Record<string, unknown> = {};
    const nuevos = normalizar(b.datos ?? {}) as Record<string, string | null>;
    for (const [k, v] of Object.entries(nuevos)) {
      const antes = String(a![k] ?? '');
      if (String(v ?? '') !== antes) { cambios[k] = { antes, despues: String(v ?? '') }; upd[k] = v; }
    }
    if ('numero_acta' in upd) check(upd.numero_acta, 'El número de acta no puede quedar vacío');
    if (b.archivoRaw) {
      check(!a!.archivo_raw, 'El escaneo ya está cargado: es el original y no se reemplaza', 409);
      check(String(b.archivoRaw).startsWith('data:'), 'Archivo inválido');
      await controlarAdjuntos(db, [{ nombre: b.archivoNombre, raw: b.archivoRaw }]);
      upd.archivo_raw = b.archivoRaw;
      upd.archivo_nombre = b.archivoNombre || 'acta';
      cambios.archivo = { antes: '', despues: b.archivoNombre || 'acta' };
    }
    check(Object.keys(upd).length, 'No cambió ningún dato');
    let previas: unknown[] = [];
    try { previas = JSON.parse(String(a!.correcciones_json ?? '[]')) as unknown[]; } catch { previas = []; }
    upd.correcciones_json = JSON.stringify([...previas, { fecha: Date.now(), usuario: nombreUsuario(user), campos: cambios }]);
    const { error } = await db.from('acta_migrada').update(upd).eq('id', a!.id as number);
    if (error) throw new HttpError(error.code === '23505' ? 409 : 500, error.code === '23505' ? 'Ya hay otra acta con ese número' : error.message);
    return { ok: true };
  }, 'cargarActasMigradas');
}

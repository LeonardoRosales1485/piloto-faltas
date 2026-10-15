import { NextRequest } from 'next/server';
import { ESTADOS, puede } from '@/lib/dominio';
import { check, handle, HttpError, nombreUsuario, uuid, type Db } from '@/lib/srv';
import { normalizarHtml } from '@/lib/campos';
import { datosDe, validarPlantilla, type DatosPlantilla } from '@/lib/plantillas';

/**
 * Plantillas publicadas. Con ?todas=1 (pantalla de plantillas) incluye las inactivas, los borradores y el uso.
 * El resto del sistema (causa) recibe solo las activas, sin borradores.
 */
export async function GET(req: NextRequest) {
  const todas = req.nextUrl.searchParams.get('todas') === '1';
  return handle(req, async ({ db, user }) => {
    if (todas) check(puede(user, 'verPlantillas') || puede(user, 'plantillas'), 'Sin permiso', 403);
    let q = db.from('plantilla').select('*').order('categoria').order('titulo');
    if (!todas) q = q.eq('activa', 1);
    const { data } = await q;
    const filas = (data ?? []) as Record<string, unknown>[];
    if (!todas) return filas.map((p) => { const { borrador_json, ...resto } = p; void borrador_json; return resto; });
    const { data: uso } = await db.from('plantilla_uso').select('plantilla_id, usos, ultimo_uso');
    const porId = new Map(((uso ?? []) as { plantilla_id: number; usos: number; ultimo_uso: number }[]).map((u) => [Number(u.plantilla_id), u]));
    return filas.map((p) => ({ ...p, usos: porId.get(Number(p.id))?.usos ?? 0, ultimo_uso: porId.get(Number(p.id))?.ultimo_uso ?? null }));
  }, 'verCausas');
}

function leerDatos(b: Record<string, unknown>): DatosPlantilla {
  const d = datosDe((b.datos ?? {}) as Record<string, unknown>);
  d.titulo = d.titulo.trim().slice(0, 200);
  d.contenido_html = normalizarHtml(d.contenido_html);
  check(!d.estado_resultante || ESTADOS.some((e) => e.nombre === d.estado_resultante), 'Estado inválido');
  check(!d.estados_origen || d.estados_origen.every((x) => ESTADOS.some((e) => e.nombre === x)), 'Estado de origen inválido');
  return d;
}

async function plantilla(db: Db, id: number) {
  const { data } = await db.from('plantilla').select('*').eq('id', id).maybeSingle();
  if (!data) throw new HttpError(404, 'Plantilla inexistente');
  return data as Record<string, unknown>;
}

function columnas(d: DatosPlantilla) {
  return {
    titulo: d.titulo, categoria: d.categoria, tipo_acta: d.tipo_acta, contenido_html: d.contenido_html,
    estado_resultante: d.estado_resultante, estados_origen: d.estados_origen ? JSON.stringify(d.estados_origen) : null,
    requiere_revision: d.requiere_revision, numerable: d.numerable,
  };
}

/**
 * Acciones sobre plantillas (SF-36):
 * - borrador: guarda los cambios sin afectar los escritos que se generan (crea la plantilla si es nueva).
 * - publicar: los cambios pasan a usarse y se guarda una versión en el historial.
 * - descartar: vuelve a la versión publicada.
 * - activar: la habilita o deshabilita para generar escritos.
 */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as Record<string, unknown>;
  return handle(req, async ({ db, user }) => {
    const quien = nombreUsuario(user);
    const ahora = Date.now();
    const id = b.id ? Number(b.id) : null;
    switch (String(b.accion ?? '')) {
      case 'borrador': {
        const d = leerDatos(b);
        check(d.titulo, 'Falta el título');
        if (!id) {
          const codigo = d.titulo.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '_').slice(0, 40) + '_' + ahora.toString(36).toUpperCase();
          const { data, error } = await db.from('plantilla').insert({
            ...columnas(d), uuid: uuid(), codigo, activa: 0, date_created: ahora,
            borrador_json: JSON.stringify(d), borrador_por: quien, borrador_at: ahora,
          }).select('id').single();
          if (error) throw new HttpError(500, error.message);
          return { id: (data as { id: number }).id };
        }
        const p = await plantilla(db, id);
        // Si nunca se publicó, los datos «publicados» siguen al borrador (no se usan: está inactiva).
        const extra = p.publicada_at ? {} : columnas(d);
        await db.from('plantilla').update({ ...extra, borrador_json: JSON.stringify(d), borrador_por: quien, borrador_at: ahora }).eq('id', id);
        return { id };
      }
      case 'publicar': {
        check(id, 'Guarde la plantilla antes de publicarla');
        const p = await plantilla(db, id);
        const d = b.datos ? leerDatos(b) : p.borrador_json ? datosDe(JSON.parse(String(p.borrador_json)) as Record<string, unknown>) : null;
        check(d, 'No hay cambios para publicar');
        const errores = validarPlantilla(d).filter((o) => o.nivel === 'error');
        check(!errores.length, errores.map((e) => e.texto).join(' '));
        const { data: ult } = await db.from('plantilla_version').select('version').eq('plantilla_id', id).order('version', { ascending: false }).limit(1).maybeSingle();
        const version = Number((ult as { version?: number } | null)?.version ?? 0) + 1;
        const { error } = await db.from('plantilla_version').insert({
          plantilla_id: id, version, datos_json: JSON.stringify(d), nota: String(b.nota ?? '').trim().slice(0, 500) || null, publicada_por: quien, publicada_at: ahora,
        });
        if (error) throw new HttpError(500, error.message);
        await db.from('plantilla').update({
          ...columnas(d), borrador_json: null, borrador_por: null, borrador_at: null, publicada_at: ahora, publicada_por: quien,
          ...(p.publicada_at ? {} : { activa: 1 }),
        }).eq('id', id);
        return { id, version };
      }
      case 'descartar': {
        check(id, 'Plantilla inexistente');
        const p = await plantilla(db, id);
        check(p.publicada_at, 'La plantilla nunca se publicó: no hay una versión a la que volver');
        await db.from('plantilla').update({ borrador_json: null, borrador_por: null, borrador_at: null }).eq('id', id);
        return { id };
      }
      case 'activar': {
        check(id, 'Plantilla inexistente');
        const p = await plantilla(db, id);
        const activa = b.activa ? 1 : 0;
        check(!activa || p.publicada_at, 'Publique la plantilla antes de habilitarla');
        await db.from('plantilla').update({ activa }).eq('id', id);
        return { id, activa };
      }
      default:
        throw new HttpError(400, 'Acción desconocida');
    }
  }, 'plantillas');
}

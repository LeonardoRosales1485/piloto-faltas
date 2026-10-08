import { NextRequest } from 'next/server';
import { ESTADOS } from '@/lib/dominio';
import { check, handle, uuid } from '@/lib/srv';
import { normalizarHtml } from '@/lib/campos';

export async function GET(req: NextRequest) {
  const todas = req.nextUrl.searchParams.get('todas') === '1';
  return handle(req, async ({ db }) => {
    let q = db.from('plantilla').select('*').order('categoria').order('titulo');
    if (!todas) q = q.eq('activa', 1);
    const { data } = await q;
    return data ?? [];
  }, 'verCausas');
}

/** Alta y edición de plantillas con su regla de cambio de estado (SF-36). */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as Record<string, unknown>;
  return handle(req, async ({ db }) => {
    check(String(b.titulo ?? '').trim(), 'Falta el título');
    check(String(b.contenido_html ?? '').trim(), 'Falta el contenido');
    const estado = b.estado_resultante ? String(b.estado_resultante) : null;
    check(!estado || ESTADOS.some((e) => e.nombre === estado), 'Estado inválido');
    const fila = {
      titulo: String(b.titulo).trim(), categoria: String(b.categoria || 'General'), tipo_acta: String(b.tipo_acta || 'todas'),
      contenido_html: normalizarHtml(String(b.contenido_html)), estado_resultante: estado, requiere_revision: Number(b.requiere_revision ? 1 : 0),
      numerable: Number(b.numerable ? 1 : 0), activa: Number(b.activa === 0 || b.activa === false ? 0 : 1),
    };
    if (b.id) {
      const { error } = await db.from('plantilla').update(fila).eq('id', Number(b.id));
      if (error) throw new Error(error.message);
      return { id: Number(b.id) };
    }
    const codigo = String(b.titulo).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '_').slice(0, 50) + '_' + Date.now().toString(36).toUpperCase();
    const { data, error } = await db.from('plantilla').insert({ ...fila, uuid: uuid(), codigo, date_created: Date.now() }).select('id').single();
    if (error) throw new Error(error.message);
    return data;
  }, 'parametrizar');
}

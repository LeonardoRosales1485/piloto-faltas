import { NextRequest } from 'next/server';
import { puede, tipoActa, tipoVisible } from '@/lib/dominio';
import { check, causaPorId, handle } from '@/lib/srv';
import { normalizarHtml } from '@/lib/campos';
import { aplicarCampos, camposDeCausa, precargarCompletar } from '@/lib/causa-srv';
import { tiposDePlantilla } from '@/lib/plantillas';

type Fila = { id: number; legajo_numero_acta: string; infraccion_tipo_nombre: string | null; infraccion_tipo_id: number | null };

/**
 * Vista previa de una plantilla (aunque no esté guardada) con los datos de una causa real. Solo lee: no genera
 * ningún escrito. Sin número de acta usa la causa más reciente del tipo de la plantilla.
 */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as { html?: string; acta?: string; tipo_acta?: string };
  return handle(req, async ({ db, user }) => {
    check(puede(user, 'verPlantillas') || puede(user, 'plantillas'), 'Sin permiso', 403);
    check(String(b.html ?? '').trim(), 'La plantilla no tiene texto');
    const tipos = tiposDePlantilla(b.tipo_acta);
    let q = db.from('infraccion').select('id, legajo_numero_acta, infraccion_tipo_nombre, infraccion_tipo_id').neq('estado_faltas', 'Borrador').neq('estado_faltas', 'Anulada');
    const acta = String(b.acta ?? '').trim();
    q = acta ? q.ilike('legajo_numero_acta', `%${acta.replace(/[%_]/g, '')}%`) : q;
    const { data } = await q.order('id', { ascending: false }).limit(40);
    const filas = ((data ?? []) as Fila[]).filter((f) => tipoVisible(user, f.infraccion_tipo_id));
    const elegida = acta
      ? filas.find((f) => f.legajo_numero_acta?.toLowerCase() === acta.toLowerCase()) ?? filas[0]
      : filas.find((f) => tipos.includes(tipoActa(f.infraccion_tipo_nombre))) ?? filas[0];
    check(elegida, acta ? `No se encontró el acta «${acta}»` : 'No hay causas para la vista previa');
    const c = await causaPorId(db, elegida.id);
    const html = await precargarCompletar(db, c, aplicarCampos(normalizarHtml(String(b.html)), await camposDeCausa(db, c, user)));
    return {
      html,
      causa: { uuid: c.uuid, acta: c.legajo_numero_acta, titular: c.infractor_razon_social || c.infractor_nombre || 'NN', estado: c.estado_faltas, tipo: tipoActa(c.infraccion_tipo_nombre) },
      otroTipo: !tipos.includes(tipoActa(c.infraccion_tipo_nombre)),
    };
  }, 'verCausas');
}

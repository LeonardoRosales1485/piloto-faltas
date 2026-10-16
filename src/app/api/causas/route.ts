import { NextRequest } from 'next/server';
import { BANDEJAS, enBandeja, vencidoSinPresentacion, type BandejaId, type FilaCausa } from '@/lib/bandejas';
import { HIST_VENCIDO } from '@/lib/camino';
import { handle } from '@/lib/srv';
import { tipoVisible } from '@/lib/dominio';

type Body = { bandeja?: BandejaId; texto?: string; tipo?: string; estado?: string; anio?: string; page?: number; size?: number };

const CAMPOS = 'id, uuid, infraccion_tipo_id, estado_faltas, infraccion_tipo_nombre, legajo_numero_acta, legajo_number, legajo_anio, legajo_fecha, infractor_nombre, infractor_razon_social, infractor_documento_numero, infractor_cuit, vehiculo_numero_dominio, medida_vigente, vence_plazo_at, notificada_at, firmada_at, monto_estimado, inspector_nombre, date_created';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  return handle(req, async ({ db, user }) => {
    const { data, error } = await db.from('infraccion').select(CAMPOS).not('estado_faltas', 'in', '("Borrador","Anulada")').order('id', { ascending: false }).limit(5000);
    if (error) throw new Error(error.message);
    const filas = ((data ?? []) as unknown as (FilaCausa & { infraccion_tipo_id: number })[]).filter((f) => tipoVisible(user, f.infraccion_tipo_id));
    const ahora = Date.now();
    const { data: bol } = await db.from('boleta').select('infraccion_id').eq('estado', 'emitida').lt('vencimiento', ahora);
    const cuotasVencidas = new Set(((bol ?? []) as { infraccion_id: number }[]).map((b) => b.infraccion_id));
    const { data: pres } = await db.from('presentacion').select('infraccion_id, estado').neq('estado', 'rechazada');
    const pendientes = new Set<number>();
    const conPresentacion = new Set<number>();
    for (const p of (pres ?? []) as { infraccion_id: number; estado: string }[]) { conPresentacion.add(p.infraccion_id); if (p.estado === 'pendiente') pendientes.add(p.infraccion_id); }
    const enB = (f: FilaCausa, b: BandejaId) => enBandeja(f, b, ahora, cuotasVencidas, pendientes, conPresentacion);
    // Vencimiento sin presentación: se calcula al listar y se deja constancia en el historial la primera vez que se detecta.
    const vencidas = filas.filter((f) => vencidoSinPresentacion(f, ahora, conPresentacion));
    if (vencidas.length) {
      const { data: ya } = await db.from('causa_historial').select('infraccion_id').eq('accion', HIST_VENCIDO).in('infraccion_id', vencidas.map((f) => f.id));
      const registradas = new Set(((ya ?? []) as { infraccion_id: number }[]).map((h) => h.infraccion_id));
      const nuevas = vencidas.filter((f) => !registradas.has(f.id));
      if (nuevas.length) await db.from('causa_historial').insert(nuevas.map((f) => ({ infraccion_id: f.id, usuario: 'Sistema', accion: HIST_VENCIDO, detalle: 'No hubo pago voluntario ni descargo dentro del plazo. Pasa a la bandeja «Para fallo».', fecha: ahora })));
    }
    const conteos: Record<string, number> = {};
    for (const b of BANDEJAS) conteos[b.id] = filas.filter((f) => enB(f, b.id)).length;
    const t = (body.texto ?? '').toLowerCase().trim();
    let lista = filas.filter((f) => enB(f, body.bandeja ?? 'activas'));
    if (body.tipo) lista = lista.filter((f) => f.infraccion_tipo_nombre === body.tipo);
    if (body.estado) lista = lista.filter((f) => f.estado_faltas === body.estado);
    if (body.anio) lista = lista.filter((f) => String(f.legajo_anio ?? '') === String(body.anio));
    if (t) lista = lista.filter((f) => [f.legajo_numero_acta, f.legajo_number, `${f.legajo_number}/${f.legajo_anio}`, f.legajo_anio, f.infractor_nombre, f.infractor_razon_social, f.infractor_documento_numero, f.infractor_cuit, f.vehiculo_numero_dominio].some((v) => String(v ?? '').toLowerCase().includes(t)));
    const size = body.size ?? 15;
    const page = body.page ?? 0;
    const marcar = (f: FilaCausa) => ({ ...f, marca: pendientes.has(f.id) ? 'Presentación a resolver' : vencidoSinPresentacion(f, ahora, conPresentacion) ? 'Sin presentación (vencido el plazo)' : null });
    return { content: lista.slice(page * size, page * size + size).map(marcar), totalElements: lista.length, totalPages: Math.max(1, Math.ceil(lista.length / size)), page, size, conteos, cuotasVencidas: [...cuotasVencidas] };
  }, 'verCausas');
}

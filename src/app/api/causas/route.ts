import { NextRequest } from 'next/server';
import { BANDEJAS, enBandeja, type BandejaId, type FilaCausa } from '@/lib/bandejas';
import { handle } from '@/lib/srv';
import { tipoVisible } from '@/lib/dominio';

type Body = { bandeja?: BandejaId; texto?: string; tipo?: string; estado?: string; page?: number; size?: number };

const CAMPOS = 'id, uuid, infraccion_tipo_id, estado_faltas, infraccion_tipo_nombre, legajo_numero_acta, legajo_number, legajo_anio, legajo_fecha, infractor_nombre, infractor_razon_social, infractor_documento_numero, infractor_cuit, vehiculo_numero_dominio, medida_vigente, vence_plazo_at, notificada_at, firmada_at, monto_estimado, inspector_nombre, date_created';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  return handle(req, async ({ db, user }) => {
    const { data, error } = await db.from('infraccion').select(CAMPOS).not('estado_faltas', 'in', '("Borrador","Anulada")').order('id', { ascending: false }).limit(5000);
    if (error) throw new Error(error.message);
    const filas = ((data ?? []) as unknown as (FilaCausa & { infraccion_tipo_id: number })[]).filter((f) => tipoVisible(user.rol, f.infraccion_tipo_id));
    const ahora = Date.now();
    const { data: bol } = await db.from('boleta').select('infraccion_id').eq('estado', 'emitida').lt('vencimiento', ahora);
    const cuotasVencidas = new Set(((bol ?? []) as { infraccion_id: number }[]).map((b) => b.infraccion_id));
    const conteos: Record<string, number> = {};
    for (const b of BANDEJAS) conteos[b.id] = filas.filter((f) => enBandeja(f, b.id, ahora, cuotasVencidas)).length;
    const t = (body.texto ?? '').toLowerCase().trim();
    let lista = filas.filter((f) => enBandeja(f, body.bandeja ?? 'activas', ahora, cuotasVencidas));
    if (body.tipo) lista = lista.filter((f) => f.infraccion_tipo_nombre === body.tipo);
    if (body.estado) lista = lista.filter((f) => f.estado_faltas === body.estado);
    if (t) lista = lista.filter((f) => [f.legajo_numero_acta, f.legajo_number, f.infractor_nombre, f.infractor_razon_social, f.infractor_documento_numero, f.infractor_cuit, f.vehiculo_numero_dominio].some((v) => String(v ?? '').toLowerCase().includes(t)));
    const size = body.size ?? 15;
    const page = body.page ?? 0;
    return { content: lista.slice(page * size, page * size + size), totalElements: lista.length, totalPages: Math.max(1, Math.ceil(lista.length / size)), page, size, conteos, cuotasVencidas: [...cuotasVencidas] };
  }, 'verCausas');
}

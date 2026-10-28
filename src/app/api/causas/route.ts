import { NextRequest } from 'next/server';
import { BANDEJAS, enBandeja, vencidoSinPresentacion, type BandejaId, type BandejaTrabajoId, type FilaCausa } from '@/lib/bandejas';
import { conBandejas } from '@/lib/bandejas-srv';
import { HIST_VENCIDO } from '@/lib/camino';
import { handle } from '@/lib/srv';
import { tipoVisible } from '@/lib/dominio';

type Body = { bandeja?: BandejaId; /** Bandeja de trabajo (menú lateral); si viene, manda sobre `bandeja`. */ trabajo?: BandejaTrabajoId; texto?: string; tipo?: string; estado?: string; anio?: string; page?: number; size?: number };

const CAMPOS = 'id, uuid, infraccion_tipo_id, estado_faltas, infraccion_tipo_nombre, legajo_numero_acta, legajo_number, legajo_anio, legajo_fecha, infractor_nombre, infractor_razon_social, infractor_documento_numero, infractor_cuit, vehiculo_numero_dominio, medida_vigente, vence_plazo_at, notificada_at, firmada_at, monto_estimado, inspector_nombre, date_created, retencion_de_vehiculo, vehiculo_liberado_at';

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
    // Bandejas de trabajo: cada causa en una sola, calculada por el sistema (minuta 20/10).
    const conB = await conBandejas(db, filas);
    const bandejaDe = new Map(conB.lista.map((f) => [f.id, f.bandeja]));
    let lista = body.trabajo
      ? (t ? filas : filas.filter((f) => bandejaDe.get(f.id) === body.trabajo))
      : filas.filter((f) => enB(f, body.bandeja ?? 'activas'));
    if (body.tipo) lista = lista.filter((f) => f.infraccion_tipo_nombre === body.tipo);
    if (body.estado) lista = lista.filter((f) => f.estado_faltas === body.estado);
    if (body.anio) lista = lista.filter((f) => String(f.legajo_anio ?? '') === String(body.anio));
    if (t) lista = lista.filter((f) => [f.legajo_numero_acta, f.legajo_number, `${f.legajo_number}/${f.legajo_anio}`, f.legajo_anio, f.infractor_nombre, f.infractor_razon_social, f.infractor_documento_numero, f.infractor_cuit, f.vehiculo_numero_dominio].some((v) => String(v ?? '').toLowerCase().includes(t)));
    const size = body.size ?? 15;
    const page = body.page ?? 0;
    // Reunión 27/10: estado del fallo en curso (en vez de «fallo en espera»): a la firma o a la firma del Intendente.
    const pagina = lista.slice(page * size, page * size + size);
    const fallos = new Map<number, string>();
    const responsables = new Map<number, string>();
    if (pagina.length) {
      const { data: fd } = await db.from('documento').select('infraccion_id, estado, plantilla!inner(categoria)').in('infraccion_id', pagina.map((f) => f.id)).eq('plantilla.categoria', 'Fallo').in('estado', ['en_revision', 'para_firma']);
      for (const x of (fd ?? []) as { infraccion_id: number; estado: string }[]) fallos.set(x.infraccion_id, x.estado === 'para_firma' ? 'Fallo a la firma del Intendente' : 'Fallo a la firma');
      // Responsable de la causa (sql/035). Consulta aparte: si la columna no existe todavía, se omite.
      const { data: rd, error: re } = await db.from('infraccion').select('id, responsable').in('id', pagina.map((f) => f.id));
      if (!re) for (const x of (rd ?? []) as { id: number; responsable: string | null }[]) if (x.responsable) responsables.set(x.id, x.responsable);
    }
    const marcar = (f: FilaCausa) => ({ ...f, responsable: responsables.get(f.id) ?? null, bandeja: bandejaDe.get(f.id) ?? null, marca: pendientes.has(f.id) ? 'Presentación a resolver' : fallos.get(f.id) ?? (vencidoSinPresentacion(f, ahora, conPresentacion) ? 'Sin presentación (vencido el plazo)' : null) });
    return { content: pagina.map(marcar), totalElements: lista.length, totalPages: Math.max(1, Math.ceil(lista.length / size)), page, size, conteos, conteosTrabajo: conB.conteos, cuotasVencidas: [...cuotasVencidas] };
  }, 'verCausas');
}

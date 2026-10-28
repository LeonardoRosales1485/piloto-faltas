import { NextRequest } from 'next/server';
import { tiposPermitidos } from '@/lib/dominio';
import { COLUMNAS_LISTA, crearActaMigrada } from '@/lib/actas-migradas-srv';
import { check, handle, HttpError } from '@/lib/srv';

/**
 * Actas migradas (previas a este sistema): búsqueda. ?q= (n.° de acta, DNI/CUIT, dominio o nombre), ?tipo=1|2|3,
 * ?desde= / ?hasta= (AAAA-MM-DD), ?pagina=. Sin el escaneo (se pide aparte). Cada usuario ve sus tipos de acta.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get('q') || '').trim().replace(/[,()]/g, ' ');
  const tipo = Number(sp.get('tipo') || 0);
  const desde = sp.get('desde') || '';
  const hasta = sp.get('hasta') || '';
  const pagina = Math.max(0, Number(sp.get('pagina') || 0));
  const TAM = 50;
  return handle(req, async ({ db, user }) => {
    let query = db.from('acta_migrada').select(COLUMNAS_LISTA, { count: 'exact' })
      .order('fecha', { ascending: false, nullsFirst: false }).order('id', { ascending: false }).range(pagina * TAM, pagina * TAM + TAM - 1);
    const permitidos = tiposPermitidos(user);
    if (permitidos) query = query.in('infraccion_tipo_id', permitidos);
    if (tipo) query = query.eq('infraccion_tipo_id', tipo);
    if (desde) query = query.gte('fecha', desde);
    if (hasta) query = query.lte('fecha', hasta);
    if (q) {
      const dig = q.replace(/\D/g, '');
      const dom = q.toUpperCase().replace(/[\s-]/g, '');
      const ors = [`numero_acta.ilike.%${q}%`, `infractor_nombre.ilike.%${q}%`, `dominio.ilike.%${dom}%`, `legajo.ilike.%${q}%`];
      if (dig.length >= 6) ors.push(`infractor_documento.ilike.%${dig}%`);
      query = query.or(ors.join(','));
    }
    const { data, error, count } = await query;
    if (error) throw new HttpError(500, /acta_migrada/.test(error.message) ? 'Falta correr sql/038 en la base.' : error.message);
    // Qué actas tienen escaneo (sin traer los archivos).
    const uuids = ((data ?? []) as { uuid: string }[]).map((x) => x.uuid);
    const { data: con } = uuids.length ? await db.from('acta_migrada').select('uuid').in('uuid', uuids).not('archivo_raw', 'is', null) : { data: [] };
    const conArchivo = new Set(((con ?? []) as { uuid: string }[]).map((x) => x.uuid));
    return { lista: ((data ?? []) as { uuid: string }[]).map((x) => ({ ...x, tieneArchivo: conArchivo.has(x.uuid) })), total: count ?? 0, pagina, tam: TAM };
  }, 'verActasMigradas');
}

type Body = { tipo: number; datos: Record<string, unknown>; archivoNombre?: string; archivoRaw?: string; lote?: string };

/** Alta de un acta migrada (carga manual o una fila de la importación masiva; la pantalla manda de a una). */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as Body;
  return handle(req, async ({ db, user }) => {
    check(b && typeof b === 'object', 'Datos inválidos');
    return crearActaMigrada(db, user, b);
  }, 'cargarActasMigradas');
}

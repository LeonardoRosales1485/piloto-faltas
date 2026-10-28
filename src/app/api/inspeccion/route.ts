import { NextRequest } from 'next/server';
import { tipoVisible } from '@/lib/dominio';
import { handle } from '@/lib/srv';
import { calcularEstadoLiberacion, type BoletaLib } from '@/lib/liberacion-srv';
import { esBoletaLiberacion } from '@/lib/dominio';
import { validezLiberacionMs } from '@/lib/tarifas';

const CAMPOS = 'id, uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_numero_acta, legajo_fecha, firmada_at, estado_faltas, inspector_nombre, inspector_username, inspector_legajo, vehiculo_numero_dominio, vehiculo_tipo_nombre, vehiculo_numero_licencia, infractor_nombre, infractor_razon_social, infractor_documento_numero, domicilio_infraccion_calle, domicilio_infraccion_numero, retencion_de_licencia, retencion_de_vehiculo, medida_vigente, estadia_ingreso_at, vehiculo_liberado_at, vehiculo_liberacion_json';

type Fila = Record<string, unknown> & { id: number; infraccion_tipo_id: number; firmada_at: number | null; vehiculo_liberado_at: number | null; vehiculo_liberacion_json: string | null; estadia_ingreso_at: number | null };

/**
 * Portal de inspectores (reunión 27/10): consulta de solo lectura de actas labradas, retenciones (licencias y vehículos)
 * y vehículos en el playón con el estado de su liberación. ?vista=actas|retenciones|playon, ?q= (acta, dominio, DNI,
 * licencia o inspector), ?desde= / ?hasta= (ms).
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const vista = sp.get('vista') || 'actas';
  const q = (sp.get('q') || '').trim();
  const desde = Number(sp.get('desde') || 0);
  const hasta = Number(sp.get('hasta') || 0);
  return handle(req, async ({ db, user }) => {
    let query = db.from('infraccion').select(CAMPOS).not('firmada_at', 'is', null).not('estado_faltas', 'in', '("Borrador","Anulada")').order('id', { ascending: false }).limit(vista === 'actas' ? 300 : 1000);
    if (vista === 'retenciones') query = query.or('retencion_de_licencia.eq.1,retencion_de_vehiculo.eq.1');
    if (vista === 'playon') query = query.eq('retencion_de_vehiculo', 1).is('vehiculo_liberado_at', null);
    if (desde) query = query.gte('firmada_at', desde);
    if (hasta) query = query.lte('firmada_at', hasta);
    if (q) {
      const s = q.replace(/[,()]/g, ' ').trim();
      const dom = s.toUpperCase().replace(/\s|-/g, '');
      query = query.or([`legajo_numero_acta.ilike.%${s}%`, `vehiculo_numero_dominio.ilike.%${dom}%`, `infractor_documento_numero.ilike.%${s}%`, `vehiculo_numero_licencia.ilike.%${s}%`, `inspector_nombre.ilike.%${s}%`, `inspector_legajo.ilike.%${s}%`].join(','));
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const filas = ((data ?? []) as unknown as Fila[]).filter((f) => tipoVisible(user, f.infraccion_tipo_id));
    const base = (f: Fila) => ({
      uuid: f.uuid, acta: f.legajo_numero_acta, tipo: f.infraccion_tipo_nombre, fecha: f.legajo_fecha, firmadaAt: f.firmada_at, estado: f.estado_faltas,
      inspector: f.inspector_nombre || f.inspector_username, legajoInspector: f.inspector_legajo, dominio: f.vehiculo_numero_dominio,
      vehiculo: f.vehiculo_tipo_nombre, licencia: f.vehiculo_numero_licencia, infractor: f.infractor_razon_social || f.infractor_nombre || 'Sin identificar',
      documento: f.infractor_documento_numero, lugar: [f.domicilio_infraccion_calle, f.domicilio_infraccion_numero].filter(Boolean).join(' '),
      retieneLicencia: Number(f.retencion_de_licencia) === 1, retieneVehiculo: Number(f.retencion_de_vehiculo) === 1, medidaVigente: Number(f.medida_vigente) === 1,
    });
    if (vista !== 'playon') return { lista: filas.map(base) };

    // Playón: estado de la liberación de cada vehículo (boletas de acarreo y estadía, disposición y vigencia).
    const ids = filas.map((f) => f.id);
    const { data: bol } = ids.length ? await db.from('boleta').select('infraccion_id, monto, estado, detalle_json, vencimiento').in('infraccion_id', ids).neq('estado', 'anulada') : { data: [] };
    const boletas = ((bol ?? []) as (BoletaLib & { infraccion_id: number })[]).filter((b) => esBoletaLiberacion(b));
    const validez = await validezLiberacionMs(db);
    const ahora = Date.now();
    return {
      lista: filas.map((f) => {
        const lib = calcularEstadoLiberacion({ id: f.id, retencion_de_vehiculo: 1, vehiculo_liberado_at: f.vehiculo_liberado_at, vehiculo_liberacion_json: f.vehiculo_liberacion_json }, boletas.filter((b) => b.infraccion_id === f.id), validez);
        const ingreso = Number(f.estadia_ingreso_at || f.firmada_at);
        return { ...base(f), ingreso, dias: Math.max(0, Math.floor((ahora - ingreso) / 86400000)), liberacion: lib.estado, vigenteHasta: lib.vigenteHasta };
      }),
    };
  }, 'portalInspectores');
}

import { NextRequest } from 'next/server';
import { tipoVisible } from '@/lib/dominio';
import { handle } from '@/lib/srv';
import { calculoLiberacion } from '@/lib/tarifas';

type Fila = {
  id: number; uuid: string; infraccion_tipo_id: number; legajo_numero_acta: string; legajo_fecha: string | null; firmada_at: number | null;
  vehiculo_numero_dominio: string | null; vehiculo_tipo_nombre: string | null; estadia_ingreso_at: number | null; vehiculo_liberado_at: number | null;
  vehiculo_liberacion_json: string | null; infractor_nombre: string | null; infractor_razon_social: string | null; estado_faltas: string;
};

/** Retenciones de vehículos (como stg): listado, estadísticas y total estimado para liberar. Filtro por fecha de ingreso. */
export async function GET(req: NextRequest) {
  const desde = Number(req.nextUrl.searchParams.get('desde') || 0);
  const hasta = Number(req.nextUrl.searchParams.get('hasta') || 0);
  return handle(req, async ({ db, user }) => {
    const { data, error } = await db.from('infraccion')
      .select('id, uuid, infraccion_tipo_id, legajo_numero_acta, legajo_fecha, firmada_at, vehiculo_numero_dominio, vehiculo_tipo_nombre, estadia_ingreso_at, vehiculo_liberado_at, vehiculo_liberacion_json, infractor_nombre, infractor_razon_social, estado_faltas')
      .eq('retencion_de_vehiculo', 1).not('firmada_at', 'is', null).not('estado_faltas', 'in', '("Borrador","Anulada")').order('id', { ascending: false }).limit(2000);
    if (error) throw new Error(error.message);
    const filas = ((data ?? []) as Fila[]).filter((f) => tipoVisible(user.rol, f.infraccion_tipo_id))
      .map((f) => ({ ...f, ingreso: Number(f.estadia_ingreso_at || f.firmada_at) }))
      .filter((f) => (!desde || f.ingreso >= desde) && (!hasta || f.ingreso <= hasta));
    const ids = filas.map((f) => f.id);
    const { data: bol } = ids.length ? await db.from('boleta').select('infraccion_id, monto, estado, detalle_json').in('infraccion_id', ids).neq('estado', 'anulada') : { data: [] };
    const boletasLib = ((bol ?? []) as { infraccion_id: number; monto: number; estado: string; detalle_json: string | null }[]).filter((b) => String(b.detalle_json ?? '').includes('"liberacion":true'));
    const lista = await Promise.all(filas.map(async (f) => {
      const liberado = Boolean(f.vehiculo_liberado_at);
      let calc: Awaited<ReturnType<typeof calculoLiberacion>>;
      if (liberado && f.vehiculo_liberacion_json) calc = JSON.parse(f.vehiculo_liberacion_json);
      else calc = await calculoLiberacion(db, f.vehiculo_tipo_nombre, f.ingreso);
      const b = boletasLib.filter((x) => x.infraccion_id === f.id);
      return {
        uuid: f.uuid, acta: f.legajo_numero_acta, dominio: f.vehiculo_numero_dominio, tipoVehiculo: f.vehiculo_tipo_nombre, clase: calc.claseNombre,
        infractor: f.infractor_razon_social || f.infractor_nombre, ingreso: f.ingreso, liberadoAt: f.vehiculo_liberado_at, dias: calc.dias,
        estado: liberado ? 'Liberado' : 'Retenido', calculo: calc, pagado: b.some((x) => x.estado === 'definitiva'),
      };
    }));
    const pendiente = lista.filter((x) => x.estado === 'Retenido' || !x.pagado).reduce((a, x) => a + x.calculo.total, 0);
    const recaudado = lista.filter((x) => x.estado === 'Liberado' && x.pagado).reduce((a, x) => a + x.calculo.total, 0);
    return {
      estadisticas: { retenidos: lista.filter((x) => x.estado === 'Retenido').length, liberados: lista.filter((x) => x.estado === 'Liberado').length, totales: lista.length, pendiente, recaudado, total: pendiente + recaudado },
      lista,
    };
  }, 'gestionarCausas');
}

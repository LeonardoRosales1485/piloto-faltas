import { NextRequest } from 'next/server';
import { pagoAConciliar, TIPOS_ACTA, tipoActa, tipoVisible } from '@/lib/dominio';
import { discriminarBoleta, rangoMes } from '@/lib/informe-tribunal';
import { check, handle } from '@/lib/srv';

type Fila = {
  numero: string; concepto: string | null; detalle_json: string | null; monto: number; a_nombre_de: string | null;
  pagado_at: number | null; acreditado_at?: number | null; confirmado_por: string | null;
  infraccion: { infraccion_tipo_id: number; infraccion_tipo_nombre: string; legajo_numero_acta: string; uuid: string } | null;
};

/** Informe mensual para el Tribunal de Cuentas: pagos por fecha de acreditación, discriminados por concepto. */
export async function GET(req: NextRequest) {
  const mes = req.nextUrl.searchParams.get('mes') || '';
  return handle(req, async ({ db, user }) => {
    check(/^\d{4}-\d{2}$/.test(mes), 'Indique el mes (AAAA-MM)');
    const [desde, hasta] = rangoMes(mes);
    const campos = 'numero, concepto, detalle_json, monto, a_nombre_de, pagado_at, confirmado_por, infraccion(infraccion_tipo_id, infraccion_tipo_nombre, legajo_numero_acta, uuid)';
    // Con sql/032 se filtra por fecha de acreditación (o la de pago si no la tiene); sin la columna, por la de pago.
    const r1 = await db.from('boleta').select(`${campos}, acreditado_at`).eq('estado', 'definitiva')
      .or(`and(acreditado_at.gte.${desde},acreditado_at.lt.${hasta}),and(acreditado_at.is.null,pagado_at.gte.${desde},pagado_at.lt.${hasta})`)
      .order('id').limit(5000);
    const r = r1.error ? await db.from('boleta').select(campos).eq('estado', 'definitiva').gte('pagado_at', desde).lt('pagado_at', hasta).order('id').limit(5000) : r1;
    if (r.error) throw new Error(r.error.message);
    const data = r.data as unknown[];
    const filas = ((data ?? []) as unknown as Fila[]).filter((b) => tipoVisible(user, b.infraccion?.infraccion_tipo_id)).map((b) => {
      const d = discriminarBoleta(b);
      return {
        fecha: Number(b.acreditado_at ?? b.pagado_at), boleta: b.numero, acta: b.infraccion?.legajo_numero_acta ?? '-', causaUuid: b.infraccion?.uuid ?? null,
        tipo: TIPOS_ACTA[tipoActa(String(b.infraccion?.infraccion_tipo_nombre ?? ''))].corto, concepto: b.concepto, aNombre: b.a_nombre_de,
        ...d, total: Number(b.monto), aConciliar: pagoAConciliar(b),
      };
    }).sort((a, b) => a.fecha - b.fecha);
    const suma = (k: 'multas' | 'derechoOficina' | 'acarreo' | 'estadia' | 'total', xs = filas) => Math.round(xs.reduce((s, f) => s + f[k], 0) * 100) / 100;
    const totales = { multas: suma('multas'), derechoOficina: suma('derechoOficina'), acarreo: suma('acarreo'), estadia: suma('estadia'), total: suma('total'), cantidad: filas.length };
    const porTipo = [...new Set(filas.map((f) => f.tipo))].map((t) => {
      const xs = filas.filter((f) => f.tipo === t);
      return { tipo: t, cantidad: xs.length, multas: suma('multas', xs), derechoOficina: suma('derechoOficina', xs), acarreo: suma('acarreo', xs), estadia: suma('estadia', xs), total: suma('total', xs) };
    });
    return { mes, filas, totales, porTipo, aConciliar: filas.filter((f) => f.aConciliar).length };
  }, 'verReportes');
}

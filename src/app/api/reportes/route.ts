import { NextRequest } from 'next/server';
import { handle } from '@/lib/srv';

/** Estadísticas básicas: actas por tipo, estado, mes y artículo; medidas; pagos acreditados (SF-71 a SF-73). */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const desde = p.get('desde') ? new Date(`${p.get('desde')}T00:00`).getTime() : 0;
  const hasta = p.get('hasta') ? new Date(`${p.get('hasta')}T23:59`).getTime() : Date.now() + 1;
  return handle(req, async ({ db }) => {
    const { data: actas } = await db.from('infraccion').select('id, infraccion_tipo_nombre, estado_faltas, firmada_at, date_created, retencion_de_licencia, retencion_de_vehiculo, medidas_preventivas, medida_vigente').not('estado_faltas', 'in', '("Borrador","Anulada")');
    const lista = ((actas ?? []) as Record<string, unknown>[]).filter((a) => { const t = Number(a.firmada_at || a.date_created); return t >= desde && t <= hasta; });
    const cuenta = (f: (a: Record<string, unknown>) => string) => lista.reduce<Record<string, number>>((acc, a) => { const k = f(a); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
    const ids = lista.map((a) => a.id as number);
    const { data: rel } = ids.length ? await db.from('infraccion_ley').select('ley_nombre, infraccion_id').in('infraccion_id', ids) : { data: [] };
    const porArticulo = ((rel ?? []) as { ley_nombre: string }[]).reduce<Record<string, number>>((acc, r) => { acc[r.ley_nombre] = (acc[r.ley_nombre] ?? 0) + 1; return acc; }, {});
    const { data: bol } = await db.from('boleta').select('monto, pagado_at, estado, concepto, infraccion(infraccion_tipo_nombre)').eq('estado', 'definitiva');
    const pagos = ((bol ?? []) as unknown as { monto: number; pagado_at: number; infraccion: { infraccion_tipo_nombre: string } | null }[]).filter((b) => Number(b.pagado_at) >= desde && Number(b.pagado_at) <= hasta);
    const pagosPorMes = pagos.reduce<Record<string, number>>((acc, b) => { const d = new Date(Number(b.pagado_at)); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')} · ${b.infraccion?.infraccion_tipo_nombre ?? '-'}`; acc[k] = (acc[k] ?? 0) + Number(b.monto); return acc; }, {});
    // Anuladas en el período (no cuentan como actas): abandonadas por inspectores y descartadas a mano.
    const { data: anul } = await db.from('infraccion').select('anulada_motivo, date_created').eq('estado_faltas', 'Anulada');
    const anuladas = ((anul ?? []) as { anulada_motivo: string | null; date_created: number }[]).filter((a) => Number(a.date_created) >= desde && Number(a.date_created) <= hasta);
    const abandonadas = anuladas.filter((a) => /^acta abandonada/i.test(a.anulada_motivo ?? '')).length;
    return {
      anuladas: { abandonadas, descartadas: anuladas.length - abandonadas },
      total: lista.length,
      porTipo: cuenta((a) => String(a.infraccion_tipo_nombre)),
      porEstado: cuenta((a) => String(a.estado_faltas)),
      porMes: cuenta((a) => { const d = new Date(Number(a.firmada_at || a.date_created)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }),
      porArticulo,
      medidas: {
        licencias: lista.filter((a) => Number(a.retencion_de_licencia) === 1).length,
        vehiculos: lista.filter((a) => Number(a.retencion_de_vehiculo) === 1).length,
        contravencion: lista.filter((a) => String(a.medidas_preventivas ?? '[]') !== '[]').length,
        vigentes: lista.filter((a) => Number(a.medida_vigente) === 1).length,
      },
      recaudado: pagos.reduce((a, b) => a + Number(b.monto), 0),
      pagosPorMes,
    };
  }, 'verReportes');
}

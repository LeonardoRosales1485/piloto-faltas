import { NextRequest } from 'next/server';
import { reservar } from '@/lib/acta-srv';
import { valorizacion } from '@/lib/causa-srv';
import { estadoFinal, pesos, puede } from '@/lib/dominio';
import { cambiarEstado, causaPorUuid, check, handle, historial, nombreUsuario } from '@/lib/srv';

type Body = { uuids: string[]; derivar?: boolean };

/**
 * Exportación para Apremios: reserva un número de lote, toma el monto de cada causa en este momento
 * (valorización − pagos acreditados), lo deja en el historial y, si se pide, pasa la causa a «En Apremios».
 * El PDF lo arma el navegador con estos datos (/imprimir/apremios/<lote>).
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  return handle(req, async ({ user, db }) => {
    check(puede(user.rol, 'gestionarCausas'), 'Sin permiso', 403);
    const uuids = [...new Set((body.uuids ?? []).filter(Boolean))];
    check(uuids.length > 0, 'Seleccione al menos una causa');
    check(uuids.length <= 200, 'Máximo 200 causas por exportación');
    const anio = new Date().getFullYear();
    const lote = `APR-${anio}-${String(await reservar(db, `APR-${anio}`)).padStart(4, '0')}`;
    const ahora = Date.now();
    const quien = nombreUsuario(user);
    const causas = [];
    for (const u of uuids) {
      const c = await causaPorUuid(db, u);
      const v = await valorizacion(db, c);
      const { data: bol } = await db.from('boleta').select('monto, estado').eq('infraccion_id', c.id);
      const pagado = ((bol ?? []) as { monto: number; estado: string }[]).filter((b) => b.estado === 'definitiva').reduce((s, b) => s + Number(b.monto), 0);
      const saldo = Math.max(0, Math.round((v.multa - pagado) * 100) / 100);
      const derivar = Boolean(body.derivar) && c.estado_faltas !== 'En Apremios' && !estadoFinal(c.estado_faltas);
      const detalle = `Lote ${lote} · multa ${pesos(v.multa)} · pagado ${pesos(pagado)} · saldo ${pesos(saldo)}`;
      if (derivar) await cambiarEstado(db, c, 'En Apremios', quien, 'Derivación a Apremios (exportación)', detalle);
      else await historial(db, c.id, quien, 'Exportado para Apremios', detalle);
      causas.push({ uuid: c.uuid, multa: v.multa, pagado, saldo, uf: v.uf, unidades: v.unidades, derivada: derivar });
    }
    return { lote, fecha: ahora, usuario: quien, causas };
  });
}

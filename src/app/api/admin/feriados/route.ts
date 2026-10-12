import { NextRequest } from 'next/server';
import { check, handle } from '@/lib/srv';

export async function GET(req: NextRequest) {
  return handle(req, async ({ db }) => (await db.from('feriado').select('*').order('fecha')).data ?? [], 'verCausas');
}

/** Alta o baja de un feriado para el cálculo de días hábiles. */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as { fecha: string; descripcion?: string; borrar?: boolean };
  return handle(req, async ({ db }) => {
    check(/^\d{4}-\d{2}-\d{2}$/.test(b.fecha ?? ''), 'Fecha inválida');
    if (b.borrar) await db.from('feriado').delete().eq('fecha', b.fecha);
    else await db.from('feriado').upsert({ fecha: b.fecha, descripcion: b.descripcion ?? '' });
    return { ok: true };
  }, 'feriados');
}

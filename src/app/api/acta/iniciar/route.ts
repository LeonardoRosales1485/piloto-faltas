import { NextRequest } from 'next/server';
import { iniciarActa } from '@/lib/acta-srv';
import { check, handle, uuid } from '@/lib/srv';
import { modulosDe, type ModuloActa } from '@/lib/dominio';
import { loadInfraccionByUuid } from '@/lib/load-infraccion';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { tipo: string; uuid?: string };
  return handle(req, async ({ user, db }) => {
    check(modulosDe(user).includes(body.tipo as ModuloActa), 'No tiene autorizado labrar este tipo de acta', 403);
    const row = await iniciarActa(db, user, body.tipo, body.uuid || uuid());
    const acta = await loadInfraccionByUuid(row.uuid);
    return 'retomada' in row ? { ...acta, retomada: true } : acta;
  }, 'labrar');
}

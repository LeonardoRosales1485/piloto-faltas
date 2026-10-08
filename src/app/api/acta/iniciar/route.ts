import { NextRequest } from 'next/server';
import { iniciarActa } from '@/lib/acta-srv';
import { handle, uuid } from '@/lib/srv';
import { loadInfraccionByUuid } from '@/lib/load-infraccion';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { tipo: string; uuid?: string };
  return handle(req, async ({ user, db }) => {
    const row = await iniciarActa(db, user, body.tipo, body.uuid || uuid());
    return loadInfraccionByUuid(row.uuid);
  }, 'labrar');
}

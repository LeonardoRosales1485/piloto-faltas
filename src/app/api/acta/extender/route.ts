import { NextRequest } from 'next/server';
import { extenderLabrado } from '@/lib/acta-srv';
import { handle } from '@/lib/srv';

/** «Extender tiempo» del labrado (reunión 27/10): suma el plazo del tipo de acta al vencimiento actual. */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { uuid: string };
  return handle(req, async ({ user, db }) => extenderLabrado(db, user, body.uuid), 'labrar');
}

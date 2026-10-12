import { NextRequest } from 'next/server';
import { handle } from '@/lib/srv';

/** Correos no-reply enviados por el sistema (simulados en el piloto). */
export async function GET(req: NextRequest) {
  return handle(req, async ({ db }) => (await db.from('correo_saliente').select('*').order('id', { ascending: false }).limit(200)).data ?? [], 'parametrizar');
}

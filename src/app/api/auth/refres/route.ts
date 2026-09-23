import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    return jsonOk({ valid: true, username: user.username });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Token inválido';
    return jsonFail(status, msg);
  }
}

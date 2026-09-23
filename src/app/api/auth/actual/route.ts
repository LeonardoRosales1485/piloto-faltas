import { NextRequest } from 'next/server';
import { requireUser, toUsuarioDto } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    return jsonOk(toUsuarioDto(user));
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}

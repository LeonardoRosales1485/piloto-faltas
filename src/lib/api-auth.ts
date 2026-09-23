import { NextRequest } from 'next/server';
import { requireUser } from './auth';
import { jsonFail } from './http-data';
import type { UsuarioRow } from './types';

export async function requireUserOrFail(
  req: NextRequest,
): Promise<UsuarioRow | ReturnType<typeof jsonFail>> {
  try {
    return await requireUser(req);
  } catch (e) {
    const err = e as Error & { status?: number };
    return jsonFail(err.status ?? 401, err.message);
  }
}

export function isFailResponse(
  value: UsuarioRow | ReturnType<typeof jsonFail>,
): value is ReturnType<typeof jsonFail> {
  return value instanceof Response;
}

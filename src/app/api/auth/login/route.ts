import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { toUsuarioDto } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { issueToken } from '@/lib/jwt';
import { createServerClient } from '@/lib/supabase-server';
import type { UsuarioRow } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    const username = (body.username ?? '').trim();
    const password = body.password ?? '';
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('username', username)
      .maybeSingle();
    if (error || !data) {
      return jsonFail(401, 'Usuario o contraseña incorrectos');
    }
    const row = data as UsuarioRow;
    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      return jsonFail(401, 'Usuario o contraseña incorrectos');
    }
    const token = await issueToken(row.username);
    return jsonOk(toUsuarioDto(row, token));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error de login';
    return jsonFail(500, msg);
  }
}

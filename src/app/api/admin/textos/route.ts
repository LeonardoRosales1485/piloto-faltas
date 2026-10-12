import { NextRequest } from 'next/server';
import { check, handle } from '@/lib/srv';

export async function GET(req: NextRequest) {
  return handle(req, async ({ db }) => (await db.from('texto_portal').select('*').order('llave')).data ?? [], 'verCausas');
}

/** Textos del portal editables por Faltas sin desarrollo (SF-68). */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as { llave: string; texto: string };
  return handle(req, async ({ db }) => {
    check(b.texto?.trim(), 'El texto no puede quedar vacío');
    await db.from('texto_portal').update({ texto: b.texto.trim() }).eq('llave', b.llave);
    return { ok: true };
  }, 'textos');
}

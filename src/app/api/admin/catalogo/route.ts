import { NextRequest } from 'next/server';
import { check, handle } from '@/lib/srv';

/** Listas administrables desde el back office (reunión 27/10: marcas y modelos de alcoholímetros). */
const TIPOS = ['alcoholimetro_marca', 'alcoholimetro_modelo'];

export async function GET(req: NextRequest) {
  const tipo = req.nextUrl.searchParams.get('tipo') || '';
  return handle(req, async ({ db }) => {
    check(TIPOS.includes(tipo), 'Lista inválida');
    const { data, error } = await db.from('catalogo').select('id, nombre').eq('tipo', tipo).order('nombre');
    if (error) throw new Error(error.message);
    return data ?? [];
  }, 'parametrizar');
}

export async function POST(req: NextRequest) {
  const b = (await req.json()) as { tipo?: string; nombre?: string };
  return handle(req, async ({ db }) => {
    const tipo = String(b.tipo ?? '');
    const nombre = String(b.nombre ?? '').trim();
    check(TIPOS.includes(tipo), 'Lista inválida');
    check(nombre, 'Escriba el nombre');
    const { data: ya } = await db.from('catalogo').select('id').eq('tipo', tipo).eq('nombre', nombre).maybeSingle();
    check(!ya, 'Ya está en la lista', 409);
    const { error } = await db.from('catalogo').insert({ tipo, nombre });
    if (error) throw new Error(error.message);
    return { ok: true };
  }, 'parametrizar');
}

export async function DELETE(req: NextRequest) {
  const tipo = req.nextUrl.searchParams.get('tipo') || '';
  const id = Number(req.nextUrl.searchParams.get('id'));
  return handle(req, async ({ db }) => {
    check(TIPOS.includes(tipo) && id > 0, 'Lista inválida');
    const { error } = await db.from('catalogo').delete().eq('id', id).eq('tipo', tipo);
    if (error) throw new Error(error.message);
    return { ok: true };
  }, 'parametrizar');
}

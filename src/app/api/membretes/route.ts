import { NextRequest } from 'next/server';
import { check, handle, HttpError } from '@/lib/srv';

const CAMPOS = 'id, nombre, categorias, imagen_raw, titulo, subtitulo, activo, date_updated';

/** Membretes por tipo de documento (reunión 27/10). Los lee cualquier usuario del back office para imprimir. */
export async function GET(req: NextRequest) {
  return handle(req, async ({ db }) => {
    const { data, error } = await db.from('membrete').select(CAMPOS).order('id');
    // Sin sql/035 la tabla no existe: se usa el membrete fijo del municipio.
    return error ? [] : (data ?? []);
  });
}

type Body = { id?: number; nombre?: string; categorias?: string[]; imagenRaw?: string | null; titulo?: string; subtitulo?: string; activo?: boolean };

export async function POST(req: NextRequest) {
  const b = (await req.json()) as Body;
  return handle(req, async ({ db }) => {
    const nombre = String(b.nombre ?? '').trim();
    check(nombre, 'Escriba el nombre del membrete');
    const img = b.imagenRaw ? String(b.imagenRaw) : null;
    check(!img || /^data:image\/(png|jpe?g|svg\+xml|webp);base64,/.test(img), 'El logo debe ser una imagen PNG, JPG, SVG o WEBP');
    check(!img || img.length < 700_000, 'El logo es muy pesado (máximo ~500 KB)');
    const fila = {
      nombre, categorias: (b.categorias ?? []).map((x) => String(x).trim()).filter(Boolean).join(','), imagen_raw: img,
      titulo: String(b.titulo ?? '').trim() || 'MUNICIPALIDAD DE MALVINAS ARGENTINAS', subtitulo: String(b.subtitulo ?? '').trim(),
      activo: b.activo === false ? 0 : 1, date_updated: Date.now(),
    };
    const r = b.id ? await db.from('membrete').update(fila).eq('id', b.id) : await db.from('membrete').insert(fila);
    if (r.error) throw new HttpError(500, /membrete/.test(r.error.message) ? 'Falta correr sql/035 en la base.' : r.error.message);
    return { ok: true };
  }, 'parametrizar');
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get('id'));
  return handle(req, async ({ db }) => {
    check(id > 0, 'Membrete inválido');
    const { error } = await db.from('membrete').delete().eq('id', id);
    if (error) throw new HttpError(500, error.message);
    return { ok: true };
  }, 'parametrizar');
}

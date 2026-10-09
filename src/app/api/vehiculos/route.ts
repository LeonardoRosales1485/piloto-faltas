import { NextRequest } from 'next/server';
import { check, handle } from '@/lib/srv';

type Marca = { id: number; nombre: string; activa: boolean; modelos: { id: number; nombre: string; tipo_vehiculo: string | null; activa: boolean }[] };

/** Marcas con sus modelos. ?todas=1 incluye las inactivas (para la administración). */
export async function GET(req: NextRequest) {
  const todas = req.nextUrl.searchParams.get('todas') === '1';
  return handle(req, async ({ db }) => {
    const [{ data: marcas, error }, { data: modelos }] = await Promise.all([
      db.from('vehiculo_marca').select('id, nombre, activa').order('nombre'),
      db.from('vehiculo_modelo').select('id, marca_id, nombre, tipo_vehiculo, activa').order('nombre'),
    ]);
    if (error) throw new Error(error.message);
    const porMarca = new Map<number, Marca['modelos']>();
    for (const m of (modelos ?? []) as (Marca['modelos'][number] & { marca_id: number })[]) {
      if (!todas && !m.activa) continue;
      (porMarca.get(m.marca_id) ?? porMarca.set(m.marca_id, []).get(m.marca_id)!).push({ id: m.id, nombre: m.nombre, tipo_vehiculo: m.tipo_vehiculo, activa: m.activa });
    }
    return ((marcas ?? []) as Omit<Marca, 'modelos'>[]).filter((m) => todas || m.activa).map((m) => ({ ...m, modelos: porMarca.get(m.id) ?? [] }));
  });
}

type Body =
  | { accion: 'marca'; id?: number; nombre?: string; activa?: boolean }
  | { accion: 'modelo'; id?: number; marca_id?: number; nombre?: string; tipo_vehiculo?: string; activa?: boolean };

/** Alta / edición / baja lógica de marcas y modelos (solo administrador). */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as Body;
  return handle(req, async ({ db }) => {
    const nombre = String(b.nombre ?? '').trim();
    if (b.accion === 'marca') {
      if (b.id) {
        const cambios: Record<string, unknown> = {};
        if (nombre) cambios.nombre = nombre;
        if (typeof b.activa === 'boolean') cambios.activa = b.activa;
        const { error } = await db.from('vehiculo_marca').update(cambios).eq('id', b.id);
        if (error) throw new Error(error.message.includes('duplicate') ? 'Ya existe una marca con ese nombre' : error.message);
      } else {
        check(nombre, 'Indique el nombre de la marca');
        const { error } = await db.from('vehiculo_marca').insert({ nombre });
        if (error) throw new Error(error.message.includes('duplicate') ? 'Ya existe una marca con ese nombre' : error.message);
      }
      return { ok: true };
    }
    check(b.accion === 'modelo', 'Acción inválida');
    if (b.id) {
      const cambios: Record<string, unknown> = {};
      if (nombre) cambios.nombre = nombre;
      if (b.tipo_vehiculo !== undefined) cambios.tipo_vehiculo = b.tipo_vehiculo || null;
      if (typeof b.activa === 'boolean') cambios.activa = b.activa;
      const { error } = await db.from('vehiculo_modelo').update(cambios).eq('id', b.id);
      if (error) throw new Error(error.message.includes('duplicate') ? 'Esa marca ya tiene un modelo con ese nombre' : error.message);
    } else {
      check(nombre && b.marca_id, 'Indique la marca y el nombre del modelo');
      const { error } = await db.from('vehiculo_modelo').insert({ marca_id: b.marca_id, nombre, tipo_vehiculo: b.tipo_vehiculo || null });
      if (error) throw new Error(error.message.includes('duplicate') ? 'Esa marca ya tiene un modelo con ese nombre' : error.message);
    }
    return { ok: true };
  }, 'parametrizar');
}

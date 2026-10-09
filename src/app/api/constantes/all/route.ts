import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { leyFromRow } from '@/lib/mappers';
import { createServerClient } from '@/lib/supabase-server';
import type { CatalogoRow, Constantes, LeyRow } from '@/lib/types';

function opt(id: number, nombre: string) {
  return { id, nombre };
}

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const supabase = createServerClient();
    const tipos = [
      'documento',
      'provincia',
      'localidad',
      'partido',
      'vehiculo',
      'dependencia',
      'estado',
      'ley_categoria',
      'medida_contravencion',
      'tipo_societario',
      'motivo_archivo',
      'municipio',
    ] as const;

    const byTipo: Record<string, { id: number; nombre: string }[]> = {};
    for (const tipo of tipos) {
      const { data } = await supabase.from('catalogo').select('*').eq('tipo', tipo).order('id', { ascending: true });
      byTipo[tipo] = ((data ?? []) as CatalogoRow[]).map((c) => opt(Number(c.id), c.nombre));
    }

    const { data: leyesData } = await supabase.from('ley').select('*').order('id', { ascending: true });
    const dto: Constantes = {
      documentoTipos: byTipo.documento ?? [],
      provincias: byTipo.provincia ?? [],
      localidades: byTipo.localidad ?? [],
      partidos: byTipo.partido ?? [],
      vehiculoTipos: byTipo.vehiculo ?? [],
      dependencias: byTipo.dependencia ?? [],
      estados: byTipo.estado ?? [],
      leyCategorias: byTipo.ley_categoria ?? [],
      leyes: ((leyesData ?? []) as LeyRow[]).map(leyFromRow),
      infraccionTipos: [opt(1, 'multas'), opt(2, 'contravenciones'), opt(3, 'sustancias')],
      medidasContravencion: byTipo.medida_contravencion ?? [],
      tiposSocietarios: byTipo.tipo_societario ?? [],
      motivosArchivo: byTipo.motivo_archivo ?? [],
      municipios: byTipo.municipio ?? [],
    } as Constantes;
    return jsonOk(dto);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}

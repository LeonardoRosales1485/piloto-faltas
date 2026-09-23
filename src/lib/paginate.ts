import type { PaginateFiltro, PaginateListModel, PaginateOrden } from './types';

/** Column maps matching backend PaginateSpecs (DB snake_case columns). */
export const INFRACCION_COLS: Record<string, string> = {
  infraccion_tipo_id: 'infraccion_tipo_id',
  infraccion_tipo_nombre: 'infraccion_tipo_nombre',
  infractor_nombre: 'infractor_nombre',
  legajo_numero_acta: 'legajo_numero_acta',
  legajo_number: 'legajo_number',
  vehiculo_numero_dominio: 'vehiculo_numero_dominio',
  legajo_fecha: 'legajo_fecha',
  estado: 'estado',
  uuid: 'uuid',
};

export const LEY_COLS: Record<string, string> = {
  infraccion_tipo_id: 'infraccion_tipo_id',
  articulo: 'articulo',
  nombre: 'nombre',
  uuid: 'uuid',
  categoria_nombre: 'categoria_nombre',
};

type QueryBuilder = {
  eq: (col: string, val: unknown) => QueryBuilder;
  ilike: (col: string, val: string) => QueryBuilder;
  gte: (col: string, val: string) => QueryBuilder;
  lte: (col: string, val: string) => QueryBuilder;
  order: (col: string, opts: { ascending: boolean }) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
};

function resolveInfraccionColumn(filtro: PaginateFiltro): string | null {
  const key = `${filtro.columna}|${filtro.tabla ?? ''}`;
  return INFRACCION_COLS[key] ?? INFRACCION_COLS[filtro.columna] ?? null;
}

function resolveLeyColumn(filtro: PaginateFiltro): string | null {
  const combined = `${filtro.columna}|${filtro.tabla ?? ''}`;
  if (combined.startsWith('nombre|ley_categoria')) {
    return 'categoria_nombre';
  }
  if (filtro.columna === 'nombre' && filtro.tabla === 'ley_categoria') {
    return 'categoria_nombre';
  }
  const only = filtro.columna.includes('|')
    ? filtro.columna.slice(0, filtro.columna.indexOf('|'))
    : filtro.columna;
  return LEY_COLS[only] ?? null;
}

function applyFiltro(query: QueryBuilder, column: string, filtro: PaginateFiltro): QueryBuilder {
  if (filtro.value === undefined || filtro.value === null || String(filtro.value).trim() === '') {
    return query;
  }
  const raw = String(filtro.value);
  const param = filtro.parametro ?? '=';

  if (column === 'infraccion_tipo_id') {
    let tipo = raw.includes('contrav') || raw === '2' ? 2 : 1;
    try {
      tipo = parseInt(raw.replace(/%/g, '').trim(), 10);
      if (Number.isNaN(tipo)) tipo = raw.includes('contrav') ? 2 : 1;
    } catch {
      // keep mapped
    }
    return query.eq(column, tipo);
  }

  if (param.toLowerCase() === 'like' || raw.includes('%')) {
    const needle = raw.replace(/%/g, '');
    return query.ilike(column, `%${needle}%`);
  }
  if (param === '>' || param === '>=') {
    return query.gte(column, raw);
  }
  if (param === '<' || param === '<=') {
    return query.lte(column, raw);
  }
  return query.eq(column, raw);
}

export function applyInfraccionFiltros<T extends QueryBuilder>(
  query: T,
  body: PaginateListModel,
): T {
  let q: QueryBuilder = query;
  for (const filtro of body.filtros ?? []) {
    const col = resolveInfraccionColumn(filtro);
    if (!col) continue;
    q = applyFiltro(q, col, filtro);
  }
  return q as T;
}

export function applyLeyFiltros<T extends QueryBuilder>(query: T, body: PaginateListModel): T {
  let q: QueryBuilder = query;
  for (const filtro of body.filtros ?? []) {
    const col = resolveLeyColumn(filtro);
    if (!col) continue;
    q = applyFiltro(q, col, filtro);
  }
  return q as T;
}

export function applyOrdenes<T extends QueryBuilder>(
  query: T,
  ordenes: PaginateOrden[] | undefined,
  defaultCol = 'id',
): T {
  let q: QueryBuilder = query;
  if (!ordenes?.length) {
    return q.order(defaultCol, { ascending: false }) as T;
  }
  for (const o of ordenes) {
    const col = o.columna || defaultCol;
    const asc = (o.direccion || 'desc').toLowerCase() === 'asc';
    q = q.order(col, { ascending: asc });
  }
  return q as T;
}

export function pageRange(body: PaginateListModel): { from: number; to: number; page: number; size: number } {
  const page = body.page ?? 0;
  const size = !body.size || body.size <= 0 ? 10 : body.size;
  const from = page * size;
  const to = from + size - 1;
  return { from, to, page, size };
}

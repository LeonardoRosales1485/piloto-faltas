import type {
  ConfiguracionItem,
  Constantes,
  FiltrosInfraccion,
  FiltrosLey,
  ImgModel,
  Infraccion,
  Ley,
  Paginado,
  Usuario,
} from './types';

type HttpData<T> = { data: T; status: number; message?: string | null };

interface PaginateFiltro {
  tabla: string;
  columna: string;
  parametro: string | null;
  value: unknown;
}

interface PaginateBody {
  page: number;
  size: number;
  filtros: PaginateFiltro[];
  relaciones: { tipo: string; tabla: string; columna: string; alias: string; columnaLocal: string }[];
  ordenes: { tabla: string; columna: string; direccion: string }[];
}

function paginate(page: number, size: number): PaginateBody {
  return { page, size, filtros: [], relaciones: [], ordenes: [] };
}

function addFiltro(
  list: PaginateBody,
  tabla: string,
  columna: string,
  parametro: string | null,
  value: unknown,
) {
  if (value === undefined || value === null || value === '') return;
  const resolved =
    parametro === 'like' && typeof value === 'string' && !value.includes('%') ? `%${value}%` : value;
  list.filtros.push({ tabla, columna, parametro, value: resolved });
}

const TOKEN_KEY = 'faltas-piloto-token';

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseData<T>(res: Response): Promise<T> {
  const body = (await res.json()) as HttpData<T>;
  if (!res.ok) {
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return body.data;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: authHeaders() });
  return parseData<T>(res);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  return parseData<T>(res);
}

async function del(path: string): Promise<void> {
  const res = await fetch(path, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) {
    const body = (await res.json()) as HttpData<null>;
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
}

export const http = { get, post, del };

export const apiClient = {
  iniciarActa(tipo: string) {
    return post<Infraccion>('/api/acta/iniciar', { tipo });
  },

  firmarActa(uuid: string, firmaInfractor: string | null) {
    return post<{ uuid: string; hash: string; acta: Infraccion }>('/api/acta/firmar', { uuid, firmaInfractor });
  },

  anularActa(uuid: string, motivo: string) {
    return post<{ ok: boolean }>('/api/acta/anular', { uuid, motivo });
  },

  login(username: string, password: string) {
    return post<Usuario>('/api/auth/login', { username, password });
  },

  actual() {
    return get<Usuario>('/api/auth/actual');
  },

  constantes() {
    return get<Constantes>('/api/constantes/all');
  },

  infracciones(tipo: string, filtros: FiltrosInfraccion, page = 0, size = 10) {
    const body = paginate(page, size);
    addFiltro(body, 't', 'infraccion_tipo_id', '=', tipo === 'contravenciones' ? 2 : tipo === 'sustancias' ? 3 : 1);
    addFiltro(body, 't', 'infractor_nombre', 'like', filtros.nombreInfractor);
    addFiltro(body, 't', 'legajo_numero_acta', 'like', filtros.acta);
    addFiltro(body, 't', 'legajo_number', 'like', filtros.legajo);
    addFiltro(body, 't', 'legajo_anio', '=', filtros.anio);
    addFiltro(body, 't', 'vehiculo_numero_dominio', 'like', filtros.patente);
    addFiltro(body, 't', 'legajo_fecha', '>=', filtros.fechaDesde);
    const hasta =
      filtros.fechaHasta && filtros.fechaHasta.length === 10
        ? `${filtros.fechaHasta}T23:59`
        : filtros.fechaHasta;
    addFiltro(body, 't', 'legajo_fecha', '<=', hasta);
    addFiltro(body, 't', 'estado_faltas', '=', filtros.estado);
    addFiltro(body, 't', 'inspector_username', '=', (filtros as FiltrosInfraccion & { inspector?: string }).inspector);
    body.ordenes.push({ tabla: 't', columna: 'id', direccion: 'desc' });
    return post<Paginado<Infraccion>>('/api/infraccion/paginate', body);
  },

  getInfraccion(uuid: string) {
    return get<Infraccion>(`/api/infraccion/uuid/${uuid}`);
  },

  saveInfraccion(dto: Infraccion) {
    return post<Infraccion>('/api/infraccion/save', dto);
  },

  deleteInfraccion(uuid: string) {
    return del(`/api/infraccion/delete/${uuid}`);
  },

  leyes(tipo: string, filtros: FiltrosLey, page = 0, size = 10) {
    const body = paginate(page, size);
    addFiltro(body, 't', 'infraccion_tipo_id', '=', tipo === 'multas' ? 1 : 2);
    addFiltro(body, 'ley_categoria', 'nombre', '=', filtros.categoria);
    addFiltro(body, 't', 'articulo', '=', filtros.articulo);
    addFiltro(body, 't', 'nombre', 'like', filtros.nombre);
    body.relaciones.push({
      tipo: 'inner',
      tabla: 'ley_categoria',
      columna: 'id',
      alias: 't',
      columnaLocal: 'categoria_id',
    });
    body.ordenes.push({ tabla: 't', columna: 'id', direccion: 'desc' });
    return post<Paginado<Ley>>('/api/ley/paginate', body);
  },

  getLey(uuid: string) {
    return get<Ley>(`/api/ley/uuid/${uuid}`);
  },

  saveLey(dto: Ley) {
    return post<Ley>('/api/ley/save', dto);
  },

  deleteLey(uuid: string) {
    return del(`/api/ley/delete/${uuid}`);
  },

  imagenes(infraccionUuid: string, page = 0, size = 50) {
    const body = paginate(page, size);
    addFiltro(body, 'infraccion', 'uuid', '=', infraccionUuid);
    body.relaciones.push({
      tipo: 'inner',
      tabla: 'infraccion',
      columna: 'id',
      alias: 't',
      columnaLocal: 'infraccion_id',
    });
    body.ordenes.push({ tabla: 't', columna: 'id', direccion: 'desc' });
    return post<Paginado<ImgModel>>('/api/infraccion/imagen/paginate', body);
  },

  saveImagen(dto: ImgModel) {
    return post<ImgModel>('/api/infraccion/imagen/save', dto);
  },

  deleteImagen(uuid: string) {
    return del(`/api/infraccion/imagen/delete/${uuid}`);
  },

  configAll() {
    return get<ConfiguracionItem[]>('/api/configuracion/all');
  },

  configSave(item: ConfiguracionItem) {
    return post<ConfiguracionItem>('/api/configuracion/save', item);
  },
};

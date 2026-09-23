export type Usuario = {
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  sector: string;
  rol: string;
  token?: string;
};

export type Infraccion = {
  uuid?: string;
  infraccionTipoNombre: string;
  legajoNumber?: string;
  legajoAnio?: string;
  legajoCaratula?: string;
  dependenciasNombre?: string[];
  legajoNumeroActa?: string;
  legajoFecha?: string;
  legajoObservada?: number;
  infractorNombre?: string;
  infractorPersonaTipo?: number;
  infractorDocumentoTipoNombre?: string;
  infractorDocumentoNumero?: string;
  domicilioInfraccionLocalidadNombre?: string;
  infractorDomicilio?: string;
  infractorDepartamento?: string;
  infractorProvinciaNombre?: string;
  infractorLocalidadNombre?: string;
  infractorPartidoNombre?: string;
  infractorFechaNacimiento?: string;
  infractorCodigoPostal?: string;
  infractorActividadEconomica?: string;
  vehiculoNumeroDominio?: string;
  vehiculoNumeroControlInterno?: string;
  vehiculoNumeroLicencia?: string;
  vehiculoTipoNombre?: string;
  vehiculoMunicipalidadEmisora?: string;
  domicilioInfraccionCalle?: string;
  domicilioInfraccionNumero?: string;
  leyesNombre?: string[];
  observaciones?: string;
  retencionDeLicencia?: number;
  retencionDeVehiculo?: number;
  estado?: string;
  metadata?: Record<string, string>;
  dateCreated?: number;
};

export type ImgModel = {
  uuid?: string;
  status?: number;
  dateCreated?: number;
  infraccionUuid?: string;
  previewKey?: string;
  fullKey?: string;
  previewRaw?: string;
  fullRaw?: string;
};

export type Ley = {
  uuid?: string;
  nombre: string;
  articulo: string;
  descripcion?: string;
  categoriaNombre?: string;
  multiplicador?: number;
  infraccionTipoNombre?: string;
};

export type OpcionCatalogo = {
  id: number;
  nombre: string;
};

export type Constantes = {
  documentoTipos: OpcionCatalogo[];
  provincias: OpcionCatalogo[];
  localidades: OpcionCatalogo[];
  partidos: OpcionCatalogo[];
  vehiculoTipos: OpcionCatalogo[];
  dependencias: OpcionCatalogo[];
  estados: OpcionCatalogo[];
  leyes: Ley[];
  leyCategorias: OpcionCatalogo[];
  infraccionTipos: OpcionCatalogo[];
};

export type FiltrosInfraccion = {
  nombreInfractor: string;
  acta: string;
  legajo: string;
  patente: string;
  fechaDesde: string;
  fechaHasta: string;
  estado: string;
};

export type FiltrosLey = {
  articulo: string;
  nombre: string;
  categoria: string;
};

export type ConfiguracionItem = {
  id?: number;
  llave: string;
  valor: string;
  publico?: string;
};

export type Paginado<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type PaginateFiltro = {
  tabla?: string;
  columna: string;
  parametro?: string | null;
  value: unknown;
};

export type PaginateOrden = {
  tabla?: string;
  columna: string;
  direccion: string;
};

export type PaginateListModel = {
  page: number;
  size: number;
  filtros?: PaginateFiltro[];
  relaciones?: unknown[];
  ordenes?: PaginateOrden[];
};

export type UsuarioRow = {
  id: number;
  uuid: string;
  username: string;
  password_hash: string;
  nombre: string;
  apellido: string;
  email: string | null;
  sector: string | null;
  rol: string;
  date_created: number;
};

export type InfraccionRow = {
  id: number;
  uuid: string;
  infraccion_tipo_id: number;
  infraccion_tipo_nombre: string;
  legajo_number: string | null;
  legajo_anio: string | null;
  legajo_caratula: string | null;
  legajo_numero_acta: string | null;
  legajo_fecha: string | null;
  legajo_observada: number | null;
  infractor_nombre: string | null;
  infractor_persona_tipo: number | null;
  infractor_documento_tipo_nombre: string | null;
  infractor_documento_numero: string | null;
  domicilio_infraccion_localidad_nombre: string | null;
  infractor_domicilio: string | null;
  infractor_departamento: string | null;
  infractor_provincia_nombre: string | null;
  infractor_localidad_nombre: string | null;
  infractor_partido_nombre: string | null;
  infractor_fecha_nacimiento: string | null;
  infractor_codigo_postal: string | null;
  infractor_actividad_economica: string | null;
  vehiculo_numero_dominio: string | null;
  vehiculo_numero_control_interno: string | null;
  vehiculo_numero_licencia: string | null;
  vehiculo_tipo_nombre: string | null;
  vehiculo_municipalidad_emisora: string | null;
  domicilio_infraccion_calle: string | null;
  domicilio_infraccion_numero: string | null;
  observaciones: string | null;
  retencion_de_licencia: number | null;
  retencion_de_vehiculo: number | null;
  estado: string | null;
  metadata_json: string | null;
  date_created: number;
};

export type LeyRow = {
  id: number;
  uuid: string;
  nombre: string;
  articulo: string;
  descripcion: string | null;
  categoria_nombre: string | null;
  multiplicador: number;
  infraccion_tipo_id: number;
  infraccion_tipo_nombre: string;
};

export type ImagenRow = {
  id: number;
  uuid: string;
  status: number | null;
  date_created: number;
  infraccion_id: number;
  preview_key: string | null;
  full_key: string | null;
  preview_raw: string | null;
  full_raw: string | null;
};

export type CatalogoRow = {
  id: number;
  tipo: string;
  nombre: string;
};

export type ConfiguracionRow = {
  id: number;
  llave: string;
  valor: string;
  publico: string;
};

import type {
  ImgModel,
  Infraccion,
  InfraccionRow,
  Ley,
  LeyRow,
  ImagenRow,
} from './types';

function readMetadata(json: string | null): Record<string, string> {
  if (!json) return {};
  try {
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return {};
  }
}

export function writeMetadata(metadata?: Record<string, string> | null): string {
  try {
    return JSON.stringify(metadata ?? {});
  } catch {
    return '{}';
  }
}

export function leyFromRow(l: LeyRow): Ley {
  return {
    uuid: l.uuid,
    nombre: l.nombre,
    articulo: l.articulo,
    descripcion: l.descripcion ?? undefined,
    categoriaNombre: l.categoria_nombre ?? undefined,
    multiplicador: l.multiplicador == null ? undefined : Number(l.multiplicador),
    infraccionTipoNombre: l.infraccion_tipo_nombre,
  };
}

export function infraccionFromRow(
  i: InfraccionRow,
  leyesNombre: string[] = [],
  dependenciasNombre: string[] = [],
): Infraccion {
  return {
    uuid: i.uuid,
    infraccionTipoNombre: i.infraccion_tipo_nombre,
    legajoNumber: i.legajo_number ?? undefined,
    legajoAnio: i.legajo_anio ?? undefined,
    legajoCaratula: i.legajo_caratula ?? undefined,
    legajoNumeroActa: i.legajo_numero_acta ?? undefined,
    legajoFecha: i.legajo_fecha ?? undefined,
    legajoObservada: i.legajo_observada ?? 0,
    infractorNombre: i.infractor_nombre ?? undefined,
    infractorPersonaTipo: i.infractor_persona_tipo ?? 0,
    infractorDocumentoTipoNombre: i.infractor_documento_tipo_nombre ?? undefined,
    infractorDocumentoNumero: i.infractor_documento_numero ?? undefined,
    domicilioInfraccionLocalidadNombre: i.domicilio_infraccion_localidad_nombre ?? undefined,
    infractorDomicilio: i.infractor_domicilio ?? undefined,
    infractorDepartamento: i.infractor_departamento ?? undefined,
    infractorProvinciaNombre: i.infractor_provincia_nombre ?? undefined,
    infractorLocalidadNombre: i.infractor_localidad_nombre ?? undefined,
    infractorPartidoNombre: i.infractor_partido_nombre ?? undefined,
    infractorFechaNacimiento: i.infractor_fecha_nacimiento ?? undefined,
    infractorCodigoPostal: i.infractor_codigo_postal ?? undefined,
    infractorActividadEconomica: i.infractor_actividad_economica ?? undefined,
    vehiculoNumeroDominio: i.vehiculo_numero_dominio ?? undefined,
    vehiculoNumeroControlInterno: i.vehiculo_numero_control_interno ?? undefined,
    vehiculoNumeroLicencia: i.vehiculo_numero_licencia ?? undefined,
    vehiculoLicenciaCategorias: i.vehiculo_licencia_categorias == null ? undefined : readList(i.vehiculo_licencia_categorias),
    vehiculoTipoNombre: i.vehiculo_tipo_nombre ?? undefined,
    vehiculoMunicipalidadEmisora: i.vehiculo_municipalidad_emisora ?? undefined,
    domicilioInfraccionCalle: i.domicilio_infraccion_calle ?? undefined,
    domicilioInfraccionNumero: i.domicilio_infraccion_numero ?? undefined,
    leyesNombre,
    dependenciasNombre,
    observaciones: i.observaciones ?? undefined,
    retencionDeLicencia: i.retencion_de_licencia ?? 0,
    retencionDeVehiculo: i.retencion_de_vehiculo ?? 0,
    estado: i.estado ?? 'Activo',
    dateCreated: i.date_created,
    metadata: readMetadata(i.metadata_json),
    estadoFaltas: i.estado_faltas ?? 'Iniciado',
    situacionInfractor: i.situacion_infractor ?? '',
    infractorCuit: i.infractor_cuit ?? undefined,
    infractorRazonSocial: i.infractor_razon_social ?? undefined,
    infractorEmail: i.infractor_email ?? undefined,
    infractorCalleAltura: i.infractor_calle_altura ?? undefined,
    entreCalle1: i.entre_calle_1 ?? undefined,
    entreCalle2: i.entre_calle_2 ?? undefined,
    gpsLat: i.gps_lat == null ? null : Number(i.gps_lat),
    gpsLng: i.gps_lng == null ? null : Number(i.gps_lng),
    ejido: i.ejido ?? undefined,
    nomenclaturaCatastral: i.nomenclatura_catastral ?? undefined,
    acarreo: i.acarreo ?? 0,
    medidasPreventivas: readList(i.medidas_preventivas),
    medidaVigente: i.medida_vigente ?? 0,
    vehiculoLiberadoAt: i.vehiculo_liberado_at == null ? null : Number(i.vehiculo_liberado_at),
    sustanciasDescripcion: i.sustancias_descripcion ?? undefined,
    inspectorUsername: i.inspector_username ?? undefined,
    inspectorNombre: i.inspector_nombre ?? undefined,
    inspectorLegajo: (i as { inspector_legajo?: string | null }).inspector_legajo ?? undefined,
    inspectorDependencia: (i as { inspector_dependencia?: string | null }).inspector_dependencia ?? undefined,
    firmaInfractor: i.firma_infractor ?? undefined,
    firmaInspectorHash: i.firma_inspector_hash ?? undefined,
    firmadaAt: i.firmada_at ?? null,
    anuladaMotivo: i.anulada_motivo ?? undefined,
    notificadaAt: i.notificada_at ?? null,
    vencePlazoAt: i.vence_plazo_at ?? null,
    visiblePortal: i.visible_portal ?? 1,
    montoEstimado: i.monto_estimado == null ? null : Number(i.monto_estimado),
  };
}

function readList(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function infraccionToRow(d: Infraccion, existing?: Partial<InfraccionRow>): Partial<InfraccionRow> {
  const tipoNombre = d.infraccionTipoNombre;
  return {
    ...existing,
    uuid: d.uuid,
    infraccion_tipo_nombre: tipoNombre,
    infraccion_tipo_id: tipoNombre === 'contravenciones' ? 2 : tipoNombre === 'sustancias' ? 3 : 1,
    legajo_number: d.legajoNumber ?? null,
    legajo_anio: d.legajoAnio ?? null,
    legajo_caratula: d.legajoCaratula ?? null,
    legajo_numero_acta: d.legajoNumeroActa ?? null,
    legajo_fecha: d.legajoFecha ?? null,
    legajo_observada: d.legajoObservada ?? 0,
    infractor_nombre: d.infractorNombre ?? null,
    infractor_persona_tipo: d.infractorPersonaTipo ?? 0,
    infractor_documento_tipo_nombre: d.infractorDocumentoTipoNombre ?? null,
    infractor_documento_numero: d.infractorDocumentoNumero ?? null,
    domicilio_infraccion_localidad_nombre: d.domicilioInfraccionLocalidadNombre ?? null,
    infractor_domicilio: d.infractorDomicilio ?? null,
    infractor_departamento: d.infractorDepartamento ?? null,
    infractor_provincia_nombre: d.infractorProvinciaNombre ?? null,
    infractor_localidad_nombre: d.infractorLocalidadNombre ?? null,
    infractor_partido_nombre: d.infractorPartidoNombre ?? null,
    infractor_fecha_nacimiento: d.infractorFechaNacimiento ?? null,
    infractor_codigo_postal: d.infractorCodigoPostal ?? null,
    infractor_actividad_economica: d.infractorActividadEconomica ?? null,
    vehiculo_numero_dominio: d.vehiculoNumeroDominio ? String(d.vehiculoNumeroDominio).toUpperCase().replace(/\s+/g, '') : null,
    vehiculo_numero_control_interno: d.vehiculoNumeroControlInterno ?? null,
    vehiculo_numero_licencia: d.vehiculoNumeroLicencia ?? null,
    vehiculo_tipo_nombre: d.vehiculoTipoNombre ?? null,
    vehiculo_municipalidad_emisora: d.vehiculoMunicipalidadEmisora ?? null,
    domicilio_infraccion_calle: d.domicilioInfraccionCalle ?? null,
    domicilio_infraccion_numero: d.domicilioInfraccionNumero ?? null,
    observaciones: d.observaciones ?? null,
    retencion_de_licencia: d.retencionDeLicencia ?? 0,
    retencion_de_vehiculo: d.retencionDeVehiculo ?? 0,
    estado: d.estado ?? 'Activo',
    metadata_json: writeMetadata(d.metadata),
    situacion_infractor: d.situacionInfractor || null,
    infractor_cuit: d.infractorCuit ?? null,
    infractor_razon_social: d.infractorRazonSocial ?? null,
    infractor_email: d.infractorEmail ?? null,
    infractor_calle_altura: d.infractorCalleAltura ?? null,
    entre_calle_1: d.entreCalle1 ?? null,
    entre_calle_2: d.entreCalle2 ?? null,
    gps_lat: d.gpsLat ?? null,
    gps_lng: d.gpsLng ?? null,
    ejido: d.ejido ?? null,
    nomenclatura_catastral: d.nomenclaturaCatastral ?? null,
    acarreo: d.acarreo ?? 0,
    medidas_preventivas: JSON.stringify(d.medidasPreventivas ?? []),
    // Solo si el formulario lo trae: así un acta sin categorías se guarda aunque todavía no se haya corrido sql/030.
    ...(Array.isArray(d.vehiculoLicenciaCategorias) ? { vehiculo_licencia_categorias: JSON.stringify(d.vehiculoLicenciaCategorias) } : {}),
    sustancias_descripcion: d.sustanciasDescripcion ?? null,
  };
}

export function leyToRow(d: Ley, existing?: Partial<LeyRow>): Partial<LeyRow> {
  const tipoNombre = d.infraccionTipoNombre ?? 'multas';
  return {
    ...existing,
    uuid: d.uuid,
    nombre: d.nombre,
    articulo: d.articulo,
    descripcion: d.descripcion ?? null,
    categoria_nombre: d.categoriaNombre ?? null,
    multiplicador: d.multiplicador ?? 1,
    infraccion_tipo_nombre: tipoNombre,
    infraccion_tipo_id: tipoNombre === 'contravenciones' ? 2 : tipoNombre === 'sustancias' ? 3 : 1,
  };
}

export function imagenFromRow(img: ImagenRow, infraccionUuid: string): ImgModel {
  return {
    uuid: img.uuid,
    status: img.status ?? 1,
    dateCreated: img.date_created,
    infraccionUuid,
    previewKey: img.preview_key ?? undefined,
    fullKey: img.full_key ?? undefined,
    previewRaw: img.preview_raw ?? undefined,
    fullRaw: img.full_raw ?? undefined,
  };
}

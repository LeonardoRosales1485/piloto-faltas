import { modulosDe, puede, tipoIdDe, tipoVisible, type ModuloActa, type Permiso } from './dominio';

/** Qué permiso exige cada sección del back office (P-22: matriz propuesta para el piloto). */
const RUTAS: { prefijo: string; permiso: Permiso }[] = [
  { prefijo: '/private/inicio', permiso: 'labrar' },
  { prefijo: '/private/crear-editar', permiso: 'labrar' },
  { prefijo: '/private/lista-infracciones', permiso: 'labrar' },
  { prefijo: '/private/causas', permiso: 'verCausas' },
  { prefijo: '/private/causa/', permiso: 'verCausas' },
  { prefijo: '/private/presentaciones', permiso: 'verPresentaciones' },
  { prefijo: '/private/escritos', permiso: 'verEscritos' },
  { prefijo: '/private/escrito/', permiso: 'verCausas' },
  { prefijo: '/private/pagos', permiso: 'verPagos' },
  { prefijo: '/private/reportes', permiso: 'verReportes' },
  { prefijo: '/private/correos', permiso: 'correos' },
  { prefijo: '/private/retenciones', permiso: 'retenciones' },
  { prefijo: '/private/plantillas', permiso: 'plantillas' },
  { prefijo: '/private/textos', permiso: 'textos' },
  { prefijo: '/private/feriados', permiso: 'feriados' },
  { prefijo: '/private/auditoria', permiso: 'auditoria' },
  { prefijo: '/private/finanzas', permiso: 'valores' },
  { prefijo: '/private/ordenanzas', permiso: 'ordenanzas' },
  { prefijo: '/private/usuarios', permiso: 'parametrizar' },
  { prefijo: '/private/marcas-modelos', permiso: 'marcasModelos' },
  { prefijo: '/private/inspectores', permiso: 'inspectores' },
  { prefijo: '/private/seguimiento-gps', permiso: 'seguimientoGps' },
  { prefijo: '/private/inspeccion', permiso: 'portalInspectores' },
  { prefijo: '/private/actas-migradas', permiso: 'verActasMigradas' },
  { prefijo: '/private/funciones', permiso: 'parametrizar' },
  { prefijo: '/private/labrado-config', permiso: 'parametrizar' },
  { prefijo: '/private/membretes', permiso: 'parametrizar' },
  { prefijo: '/private/sandbox', permiso: 'sandbox' },
  { prefijo: '/private/firma-intendente', permiso: 'firmaIntendente' },
];

type U = { rol?: string; sector?: string | null; modulosActa?: string[]; modulosEfectivos?: string[]; tiposActa?: number[] | null } | null | undefined;

export function rutaPermitida(path: string, rol?: string, user?: U): boolean {
  const p = path.split('?')[0];
  const r = RUTAS.find((x) => p.startsWith(x.prefijo));
  if (r && !puede(rol, r.permiso)) return false;
  // Los inspectores solo entran a los módulos de acta que tienen autorizados.
  const m = p.match(/^\/private\/(?:crear-editar|lista-infracciones)\/(multas|contravenciones|sustancias)/);
  // Ordenanzas: cada usuario solo las de su alcance (tipos de acta que gestiona).
  const o = p.match(/^\/private\/ordenanzas\/(multas|contravenciones|sustancias)/);
  if (o && !tipoVisible(user ? { ...user, rol } : rol, tipoIdDe(o[1]))) return false;
  // Tipos de acta habilitados: tipo de inspector + permisos «Actas de …» (calculados en el servidor).
  if (m) return modulosDe({ rol, sector: user?.sector, modulosActa: user?.modulosActa, modulosEfectivos: user?.modulosEfectivos }).includes(m[1] as ModuloActa);
  return true;
}

/** Los inspectores de contravenciones (sector «Inspecciones Generales» o similar) arrancan en ese formulario. */
export function tipoInspector(sector?: string | null): 'multas' | 'contravenciones' {
  return /contrav|inspecciones generales|bromatolog/i.test(sector ?? '') ? 'contravenciones' : 'multas';
}

export function inicioPara(rol?: string, sector?: string | null, modulosActa?: string[]): string {
  if (rol === 'Inspector') return '/private/inicio';
  if (rol === 'Tributario') return '/private/finanzas';
  if (rol === 'Intendente') return '/private/firma-intendente';
  return '/private/causas';
}

/** Compatibilidad con el código anterior. */
export function inspectorForbidden(pathname: string, rol?: string, user?: U): boolean {
  return !rutaPermitida(pathname, rol, user);
}

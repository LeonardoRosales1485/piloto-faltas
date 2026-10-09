import { modulosDe, puede, type ModuloActa, type Permiso } from './dominio';

/** Qué permiso exige cada sección del back office (P-22: matriz propuesta para el piloto). */
const RUTAS: { prefijo: string; permiso: Permiso }[] = [
  { prefijo: '/private/crear-editar', permiso: 'labrar' },
  { prefijo: '/private/lista-infracciones', permiso: 'labrar' },
  { prefijo: '/private/causas', permiso: 'verCausas' },
  { prefijo: '/private/causa/', permiso: 'verCausas' },
  { prefijo: '/private/presentaciones', permiso: 'verCausas' },
  { prefijo: '/private/escritos', permiso: 'verCausas' },
  { prefijo: '/private/escrito/', permiso: 'verCausas' },
  { prefijo: '/private/pagos', permiso: 'verCausas' },
  { prefijo: '/private/reportes', permiso: 'verCausas' },
  { prefijo: '/private/correos', permiso: 'verCausas' },
  { prefijo: '/private/plantillas', permiso: 'parametrizar' },
  { prefijo: '/private/textos', permiso: 'parametrizar' },
  { prefijo: '/private/feriados', permiso: 'parametrizar' },
  { prefijo: '/private/auditoria', permiso: 'auditoria' },
  { prefijo: '/private/finanzas', permiso: 'valores' },
  { prefijo: '/private/ordenanzas', permiso: 'parametrizar' },
  { prefijo: '/private/usuarios', permiso: 'parametrizar' },
  { prefijo: '/private/inspectores', permiso: 'inspectores' },
  { prefijo: '/private/seguimiento-gps', permiso: 'inspectores' },
  { prefijo: '/private/sandbox', permiso: 'parametrizar' },
];

type U = { rol?: string; sector?: string | null; modulosActa?: string[] } | null | undefined;

export function rutaPermitida(path: string, rol?: string, user?: U): boolean {
  const p = path.split('?')[0];
  const r = RUTAS.find((x) => p.startsWith(x.prefijo));
  if (r && !puede(rol, r.permiso)) return false;
  // Los inspectores solo entran a los módulos de acta que tienen autorizados.
  const m = p.match(/^\/private\/(?:crear-editar|lista-infracciones)\/(multas|contravenciones|sustancias)/);
  if (m && rol === 'Inspector') return modulosDe({ rol, sector: user?.sector, modulosActa: user?.modulosActa }).includes(m[1] as ModuloActa);
  return true;
}

/** Los inspectores de contravenciones (sector «Inspecciones Generales» o similar) arrancan en ese formulario. */
export function tipoInspector(sector?: string | null): 'multas' | 'contravenciones' {
  return /contrav|inspecciones generales|bromatolog/i.test(sector ?? '') ? 'contravenciones' : 'multas';
}

export function inicioPara(rol?: string, sector?: string | null, modulosActa?: string[]): string {
  if (rol === 'Inspector') return `/private/crear-editar/${modulosDe({ rol, sector, modulosActa })[0] ?? tipoInspector(sector)}`;
  if (rol === 'Tributario') return '/private/finanzas';
  return '/private/causas';
}

/** Compatibilidad con el código anterior. */
export function inspectorForbidden(pathname: string, rol?: string, user?: U): boolean {
  return !rutaPermitida(pathname, rol, user);
}

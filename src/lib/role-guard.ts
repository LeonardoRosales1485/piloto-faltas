import { puede, type Permiso } from './dominio';

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
];

export function rutaPermitida(path: string, rol?: string): boolean {
  const r = RUTAS.find((x) => path.split('?')[0].startsWith(x.prefijo));
  return !r || puede(rol, r.permiso);
}

/** Los inspectores de contravenciones (sector «Inspecciones Generales» o similar) arrancan en ese formulario. */
export function tipoInspector(sector?: string | null): 'multas' | 'contravenciones' {
  return /contrav|inspecciones generales|bromatolog/i.test(sector ?? '') ? 'contravenciones' : 'multas';
}

export function inicioPara(rol?: string, sector?: string | null): string {
  if (rol === 'Inspector') return `/private/crear-editar/${tipoInspector(sector)}`;
  if (rol === 'Tributario') return '/private/finanzas';
  return '/private/causas';
}

/** Compatibilidad con el código anterior. */
export function inspectorForbidden(pathname: string, rol?: string): boolean {
  return !rutaPermitida(pathname, rol);
}

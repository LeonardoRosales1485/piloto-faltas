/**
 * Reglas de dominio compartidas entre cliente y servidor.
 * Fuente: Informe de requerimientos (Anexo I de estados) y análisis funcional del 07/10/2026.
 */

// ---------------------------------------------------------------------------
// Tipos de acta (RN-01): tránsito T, contravención C, sustancias alimenticias S
// ---------------------------------------------------------------------------
export type TipoActa = 'multas' | 'contravenciones' | 'sustancias';

export const TIPOS_ACTA: Record<TipoActa, { id: number; serie: 'T' | 'C' | 'S'; titulo: string; corto: string; plural: string }> = {
  multas: { id: 1, serie: 'T', titulo: 'Acta de tránsito', corto: 'Tránsito', plural: 'Multas de Tránsito' },
  contravenciones: { id: 2, serie: 'C', titulo: 'Acta de contravención', corto: 'Contravención', plural: 'Contravenciones' },
  sustancias: { id: 3, serie: 'S', titulo: 'Acta de sustancias alimenticias', corto: 'Sustancias', plural: 'Sustancias alimenticias' },
};

export function tipoActa(nombre?: string | null): TipoActa {
  if (nombre === 'contravenciones' || nombre === 'sustancias') return nombre;
  return 'multas';
}

export function tipoIdDe(nombre?: string | null): number {
  return TIPOS_ACTA[tipoActa(nombre)].id;
}

/** Contravención y sustancias comparten régimen (descargo y pago pueden convivir, 15 días). */
export function esContravencional(nombre?: string | null): boolean {
  return tipoActa(nombre) !== 'multas';
}

// ---------------------------------------------------------------------------
// Roles (P-22: la matriz definitiva la define BOD; esta es la propuesta del piloto)
// ---------------------------------------------------------------------------
export const ROLES = {
  admin: 'Administrador',
  agente: 'Usuario',
  inspector: 'Inspector',
  directora: 'Directora',
  abogada: 'Abogada',
  tributario: 'Tributario',
  becario: 'Becario',
} as const;

export const ROL_ETIQUETA: Record<string, string> = {
  Administrador: 'Administrador funcional',
  Usuario: 'Agente de Faltas',
  Inspector: 'Inspector',
  Directora: 'Directora de Faltas',
  Abogada: 'Abogada (contravenciones)',
  Tributario: 'Usuario tributario',
  Becario: 'Becario',
};

const BACK_OFFICE = ['Administrador', 'Usuario', 'Directora', 'Abogada', 'Becario'];

const GESTION = ['Administrador', 'Usuario', 'Directora', 'Abogada'];
const ESCRITOS = ['Administrador', 'Usuario', 'Directora', 'Abogada', 'Becario'];
const SUPERVISION = ['Directora', 'Abogada', 'Administrador'];
const ADMIN = ['Administrador'];

/** Valores por defecto de cada permiso. El Administrador puede cambiarlos por tipo de usuario o por usuario. */
export const PERMISOS = {
  labrar: ['Inspector', 'Administrador'],
  verCausas: BACK_OFFICE,
  gestionarCausas: GESTION,
  cambiarEstadoManual: GESTION,
  subsanar: GESTION,
  archivar: GESTION,
  memos: ESCRITOS,
  verPresentaciones: BACK_OFFICE,
  resolverPresentaciones: GESTION,
  verEscritos: BACK_OFFICE,
  redactarEscritos: ESCRITOS,
  firmar: ['Directora', 'Abogada'],
  verPagos: BACK_OFFICE,
  emitirBoletas: GESTION,
  confirmarPagos: GESTION,
  retenciones: GESTION,
  verReportes: BACK_OFFICE,
  valores: ['Tributario', 'Directora', 'Administrador'],
  ordenanzas: SUPERVISION,
  inspectores: SUPERVISION,
  seguimientoGps: SUPERVISION,
  auditoria: SUPERVISION,
  plantillas: ADMIN,
  textos: ADMIN,
  feriados: ADMIN,
  marcasModelos: ADMIN,
  correos: ADMIN,
  sandbox: ADMIN,
  parametrizar: ADMIN,
} as const;

export type Permiso = keyof typeof PERMISOS;

/**
 * Alcance por tipo de acta: la Directora ve sólo tránsito (1); la Abogada, contravenciones (2) y
 * sustancias alimenticias (3). null = sin restricción.
 */
export function tiposPermitidos(rol: string | undefined | null): number[] | null {
  if (rol === 'Directora') return [1];
  if (rol === 'Abogada') return [2, 3];
  return null;
}

export function tipoVisible(rol: string | undefined | null, tipoId: number | string | null | undefined): boolean {
  const t = tiposPermitidos(rol);
  return !t || t.includes(Number(tipoId));
}

/** Descripción de cada permiso para el ABM (qué secciones habilita). */
export const PERMISO_INFO: Record<Permiso, { g: string; t: string; d: string }> = {
  labrar: { g: 'Actas', t: 'Labrar actas', d: 'Inicio del inspector, labrado y borradores (según los tipos de acta asignados)' },
  verCausas: { g: 'Causas', t: 'Ver causas', d: 'Bandeja de causas y detalle de la causa' },
  gestionarCausas: { g: 'Causas', t: 'Gestionar causas', d: 'Acciones generales de la causa: notificar, derivar, ajustar valorización, presentación en mesa' },
  cambiarEstadoManual: { g: 'Causas', t: 'Cambiar estado manualmente', d: 'Acción «Cambiar estado»' },
  subsanar: { g: 'Causas', t: 'Subsanar datos', d: 'Corrección de datos del acta con motivo' },
  archivar: { g: 'Causas', t: 'Archivar, reingresar y desestimar', d: 'Cierre y reapertura de causas' },
  memos: { g: 'Causas', t: 'Memos internos', d: 'Escribir memos internos en la causa' },
  verPresentaciones: { g: 'Presentaciones', t: 'Ver presentaciones', d: 'Bandeja «Presentaciones»' },
  resolverPresentaciones: { g: 'Presentaciones', t: 'Resolver presentaciones', d: 'Aceptar, observar o rechazar descargos, pagos, cuotas y apelaciones' },
  verEscritos: { g: 'Escritos', t: 'Ver escritos', d: 'Bandeja «Escritos y firma»' },
  redactarEscritos: { g: 'Escritos', t: 'Redactar escritos', d: 'Generar y editar escritos, adjuntar documentos' },
  firmar: { g: 'Escritos', t: 'Firmar escritos', d: 'Firma digital de resoluciones, disposiciones y fallos' },
  verPagos: { g: 'Pagos', t: 'Ver pagos', d: 'Sección «Pagos»' },
  emitirBoletas: { g: 'Pagos', t: 'Emitir boletas', d: 'Boletas de multa y de estadía' },
  confirmarPagos: { g: 'Pagos', t: 'Confirmar pagos', d: 'Acreditar pagos (a verificar → definitivo)' },
  retenciones: { g: 'Pagos', t: 'Retenciones', d: 'Sección «Retenciones» y liberación de vehículos' },
  verReportes: { g: 'Gestión', t: 'Reportes', d: 'Sección «Reportes»' },
  valores: { g: 'Gestión', t: 'Valores y tarifas', d: 'Unidad tributaria, acarreos, estadías, derecho de oficina' },
  ordenanzas: { g: 'Gestión', t: 'Ordenanzas', d: 'Alta y edición de ordenanzas y artículos' },
  inspectores: { g: 'Gestión', t: 'Inspectores', d: 'ABM de inspectores' },
  seguimientoGps: { g: 'Gestión', t: 'Seguimiento GPS', d: 'Mapa de seguimiento de inspectores' },
  auditoria: { g: 'Gestión', t: 'Auditoría', d: 'Registro de auditoría' },
  plantillas: { g: 'Configuración', t: 'Plantillas de escritos', d: 'Alta y edición de plantillas' },
  textos: { g: 'Configuración', t: 'Textos del portal', d: 'Textos que ve el infractor' },
  feriados: { g: 'Configuración', t: 'Feriados', d: 'Días no hábiles para los plazos' },
  marcasModelos: { g: 'Configuración', t: 'Marcas y modelos', d: 'Catálogo de vehículos del labrado' },
  correos: { g: 'Configuración', t: 'Registro de correos', d: 'Correos enviados por el sistema' },
  sandbox: { g: 'Configuración', t: 'Opciones sandbox', d: 'Borrar, guardar y cargar datos de prueba' },
  parametrizar: { g: 'Configuración', t: 'Usuarios y permisos', d: 'ABM de usuarios, tipos de usuario y permisos' },
};

export type Overrides = Partial<Record<Permiso, boolean>>;

/**
 * Permisos efectivos: el permiso particular del usuario tiene prioridad sobre el de su tipo (rol), y el del tipo
 * (si el administrador lo cambió) sobre el valor por defecto de PERMISOS. El Administrador nunca pierde «Configuración»
 * (para no quedar sin acceso al ABM).
 */
export function permisosEfectivos(rol: string, delRol: Overrides = {}, delUsuario: Overrides = {}): Permiso[] {
  return (Object.keys(PERMISOS) as Permiso[]).filter((p) => {
    if (rol === 'Administrador' && p === 'parametrizar') return true;
    if (delUsuario[p] !== undefined) return Boolean(delUsuario[p]);
    if (delRol[p] !== undefined) return Boolean(delRol[p]);
    return (PERMISOS[p] as readonly string[]).includes(rol);
  });
}

type CtxPermisos = { rol: string; permisos: string[] } | null;
let resolverPermisos: (() => CtxPermisos) | null = null;
/** El servidor (por request) y el navegador (usuario logueado) registran de dónde salen los permisos efectivos. */
export function registrarResolverPermisos(fn: () => CtxPermisos) { resolverPermisos = fn; }

/**
 * ¿El rol/usuario tiene el permiso? Acepta el rol (usa los permisos efectivos del usuario en curso si coincide) o un
 * objeto con `permisos` ya calculados.
 */
export function puede(rol: string | { rol?: string | null; permisos?: string[] } | undefined | null, permiso: Permiso): boolean {
  if (!rol) return false;
  if (typeof rol === 'object') {
    if (Array.isArray(rol.permisos)) return rol.permisos.includes(permiso);
    return puede(rol.rol, permiso);
  }
  const ctx = resolverPermisos?.();
  if (ctx && ctx.rol === rol && Array.isArray(ctx.permisos)) return ctx.permisos.includes(permiso);
  return (PERMISOS[permiso] as readonly string[]).includes(rol);
}

// ---------------------------------------------------------------------------
// Estados de la causa (Anexo I). Se usan tal cual.
// ---------------------------------------------------------------------------
export type FamiliaEstado = 'inicio' | 'medida' | 'presentacion' | 'fallo' | 'externo' | 'archivo' | 'otro';

export const ESTADOS: { nombre: string; familia: FamiliaEstado; portal: string; final?: boolean }[] = [
  { nombre: 'Borrador', familia: 'otro', portal: 'En labrado' },
  { nombre: 'Anulada', familia: 'otro', portal: 'Anulada', final: true },
  { nombre: 'Iniciado', familia: 'inicio', portal: 'Iniciada' },
  { nombre: 'En notificación', familia: 'inicio', portal: 'En notificación' },
  { nombre: 'Notificado', familia: 'inicio', portal: 'Notificada' },
  { nombre: 'Archivo no notificado', familia: 'archivo', portal: 'Archivada', final: true },
  { nombre: 'Con Resolución', familia: 'medida', portal: 'Con medida preventiva' },
  { nombre: 'Resolución (medidas preventivas)', familia: 'medida', portal: 'Con medida preventiva' },
  { nombre: 'En notificación de resolución', familia: 'medida', portal: 'Con medida preventiva' },
  { nombre: 'Reso notificada', familia: 'medida', portal: 'Con medida preventiva' },
  { nombre: 'Archivo Reso no notificada', familia: 'archivo', portal: 'Con medida preventiva' },
  { nombre: 'En notificación de disposición', familia: 'medida', portal: 'Con medida preventiva' },
  { nombre: 'Descargo', familia: 'presentacion', portal: 'Descargo en análisis' },
  { nombre: 'Causa observada', familia: 'presentacion', portal: 'Descargo inválido' },
  { nombre: 'Esp. Acreditar Pago', familia: 'presentacion', portal: 'Pago pendiente de acreditación' },
  { nombre: 'Cuotas', familia: 'presentacion', portal: 'En plan de cuotas' },
  { nombre: 'Archivo por pago', familia: 'archivo', portal: 'Pagada', final: true },
  { nombre: 'Con Fallo', familia: 'fallo', portal: 'Con fallo' },
  { nombre: 'En notificación de fallo', familia: 'fallo', portal: 'Con fallo' },
  { nombre: 'Fallo notificado', familia: 'fallo', portal: 'Fallo notificado' },
  { nombre: 'Archivo absolución', familia: 'archivo', portal: 'Absuelta', final: true },
  { nombre: 'Archivo fallo no notificado', familia: 'archivo', portal: 'Archivada', final: true },
  { nombre: 'En Juzgado', familia: 'externo', portal: 'En Juzgado de Paz' },
  { nombre: 'En Apremios', familia: 'externo', portal: 'En Apremios' },
  { nombre: 'Pago en Apremios', familia: 'archivo', portal: 'Pagada en Apremios', final: true },
  { nombre: 'Archivo judicial', familia: 'archivo', portal: 'Archivada', final: true },
  { nombre: 'Espera respuesta', familia: 'otro', portal: 'En trámite' },
  { nombre: 'Archivo nulidad', familia: 'archivo', portal: 'Archivada', final: true },
  { nombre: 'Archivo por Art. 5', familia: 'archivo', portal: 'Archivada', final: true },
  { nombre: 'Archivo por Doc. (falta de mérito)', familia: 'archivo', portal: 'Archivada', final: true },
  { nombre: 'Archivo solicitud del área', familia: 'archivo', portal: 'Archivada', final: true },
  { nombre: 'Despacho Directora', familia: 'otro', portal: 'En trámite' },
  { nombre: 'Archivo prescripción', familia: 'archivo', portal: 'Archivada', final: true },
  { nombre: 'Archivo Ley 14.547', familia: 'archivo', portal: 'Archivada', final: true },
  { nombre: 'Archivado', familia: 'archivo', portal: 'Archivada', final: true },
  { nombre: 'Desestimada', familia: 'archivo', portal: 'Desestimada', final: true },
];

export const ESTADOS_CAUSA = ESTADOS.filter((e) => e.nombre !== 'Borrador' && e.nombre !== 'Anulada');

export function infoEstado(nombre?: string | null) {
  return ESTADOS.find((e) => e.nombre === nombre) ?? { nombre: nombre ?? '-', familia: 'otro' as FamiliaEstado, portal: nombre ?? '-' };
}

export function estadoFinal(nombre?: string | null): boolean {
  return Boolean(ESTADOS.find((e) => e.nombre === nombre)?.final);
}

export const FAMILIA_ETIQUETA: Record<FamiliaEstado, string> = {
  inicio: 'Inicio y notificación',
  medida: 'Medida preventiva',
  presentacion: 'Presentaciones y pago',
  fallo: 'Fallo',
  externo: 'Gestión externa',
  archivo: 'Archivo',
  otro: 'Otros',
};

/** Estados desde los que el infractor todavía puede pedir pago voluntario o presentar descargo. */
export const ESTADOS_PRE_FALLO = ['Iniciado', 'En notificación', 'Notificado', 'Causa observada', 'Descargo', 'Reso notificada', 'Resolución (medidas preventivas)', 'Con Resolución', 'En notificación de resolución'];

// ---------------------------------------------------------------------------
// Situación del infractor al labrar
// ---------------------------------------------------------------------------
export const SITUACIONES = [
  { v: 'presente', t: 'Presente' },
  { v: 'ausente', t: 'Ausente' },
  { v: 'se_niega', t: 'Presente, se niega a firmar' },
  { v: 'nn', t: 'No identificado (NN)' },
] as const;

export function formatearNumeroActa(serie: string, n: number): string {
  return `${serie}-${String(n).padStart(6, '0')}`;
}

export function pesos(n?: number | null): string {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
}

export function fechaCorta(ms?: number | string | null): string {
  if (ms == null || ms === '') return '-';
  const d = typeof ms === 'number' ? new Date(ms) : new Date(ms);
  if (Number.isNaN(d.getTime())) return String(ms);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fechaHora(ms?: number | string | null): string {
  if (ms == null || ms === '') return '-';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(ms);
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Identificador legible y único de un artículo: «Ordenanza 261/2022 · Art. 45». */
export function claveLey(l: { nombre: string; articulo?: string | null }): string {
  return l.articulo ? `${l.nombre} · ${l.articulo}` : l.nombre;
}

/** Resuelve las claves guardadas en el acta contra el catálogo (acepta datos viejos guardados solo con el nombre). */
export function resolverLeyes<T extends { nombre: string; articulo?: string | null }>(claves: string[], catalogo: T[]): T[] {
  const out: T[] = [];
  for (const k of claves) {
    const l = catalogo.find((x) => claveLey(x) === k) ?? catalogo.find((x) => x.nombre === k);
    if (l && !out.includes(l)) out.push(l);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Módulos de acta que puede labrar cada inspector (tipos de inspector)
// ---------------------------------------------------------------------------
export const MODULOS_ACTA = [
  { v: 'multas', t: 'Tránsito' },
  { v: 'contravenciones', t: 'Contravenciones' },
  { v: 'sustancias', t: 'Sustancias alimenticias' },
] as const;
export type ModuloActa = (typeof MODULOS_ACTA)[number]['v'];

/** Módulos autorizados: los del usuario; si no tiene, se deducen de la dependencia. Los no inspectores ven todos. */
export function modulosDe(u: { rol?: string | null; modulosActa?: string | string[] | null; modulos_acta?: string | null; sector?: string | null } | null | undefined): ModuloActa[] {
  if (!u) return [];
  const todos = MODULOS_ACTA.map((m) => m.v) as ModuloActa[];
  if (u.rol !== 'Inspector') return todos;
  const raw = u.modulosActa ?? u.modulos_acta;
  const lista = (Array.isArray(raw) ? raw : String(raw ?? '').split(',')).map((x) => x.trim()).filter((x): x is ModuloActa => (todos as string[]).includes(x));
  if (lista.length) return lista;
  const s = u.sector ?? '';
  return [/bromatolog/i.test(s) ? 'sustancias' : /contrav|inspecciones generales/i.test(s) ? 'contravenciones' : 'multas'];
}

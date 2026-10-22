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
  responsable: 'Responsable',
  tributario: 'Tributario',
  becario: 'Becario',
} as const;

export const ROL_ETIQUETA: Record<string, string> = {
  Administrador: 'Administrador funcional',
  Usuario: 'Agente',
  Inspector: 'Inspector',
  Directora: 'Directora (tránsito)',
  Responsable: 'Responsable de área',
  Tributario: 'Usuario tributario',
  Becario: 'Becario',
};

const BACK_OFFICE = ['Administrador', 'Usuario', 'Directora', 'Responsable', 'Becario'];

const GESTION = ['Administrador', 'Usuario', 'Directora', 'Responsable'];
const ESCRITOS = ['Administrador', 'Usuario', 'Directora', 'Responsable', 'Becario'];
const SUPERVISION = ['Directora', 'Responsable', 'Administrador'];
const ADMIN = ['Administrador'];

/** Valores por defecto de cada permiso. El Administrador puede cambiarlos por tipo de usuario o por usuario. */
export const PERMISOS = {
  // Directora y Responsables también labran (actas en mesa o en operativos), solo de su área.
  labrar: ['Inspector', 'Administrador', 'Directora', 'Responsable'],
  actasTransito: ['Inspector', 'Administrador', 'Directora', 'Responsable'],
  actasContravenciones: ['Inspector', 'Administrador', 'Directora', 'Responsable'],
  actasSustancias: ['Inspector', 'Administrador', 'Directora', 'Responsable'],
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
  firmar: ['Directora', 'Responsable'],
  verPagos: BACK_OFFICE,
  emitirBoletas: GESTION,
  confirmarPagos: GESTION,
  retenciones: GESTION,
  verReportes: BACK_OFFICE,
  valores: ['Tributario', 'Directora', 'Administrador'],
  ordenanzas: SUPERVISION,
  inspectores: SUPERVISION,
  seguimientoGps: SUPERVISION,
  depuracionPos: ['Inspector'],
  auditoria: SUPERVISION,
  verPlantillas: ESCRITOS,
  plantillas: ADMIN,
  textos: ADMIN,
  feriados: ADMIN,
  marcasModelos: ADMIN,
  correos: ADMIN,
  sandbox: ADMIN,
  parametrizar: ADMIN,
} as const;

export type Permiso = keyof typeof PERMISOS;

/** Usuario con lo necesario para calcular su alcance (rol y tipos de acta que gestiona). */
export type ConAlcance = { rol?: string | null; modulosActa?: string | string[] | null; modulos_acta?: string | null; tiposActa?: number[] | null } | string | null | undefined;

/**
 * Alcance por tipo de acta (ids 1 tránsito, 2 contravenciones, 3 sustancias). Cada área tiene su responsable
 * (Directora en tránsito, Responsable en contravenciones y en sustancias) y sus agentes: el alcance sale de los
 * «tipos de acta que gestiona» del usuario. Sin tipos cargados: la Directora ve tránsito, el Responsable
 * contravenciones y el resto (Administrador, agentes generales, Becario, Tributario) todo. null = sin restricción.
 */
export function tiposPermitidos(u: ConAlcance): number[] | null {
  if (!u) return null;
  if (typeof u === 'string') return u === 'Directora' ? [1] : u === 'Responsable' ? [2] : null;
  if (Array.isArray(u.tiposActa)) return u.tiposActa.length ? u.tiposActa : null;
  if (!u.rol || !['Directora', 'Responsable', 'Usuario'].includes(u.rol)) return null;
  // Solo el dato guardado (modulos_acta): el modulosActa del navegador es calculado y para no inspectores trae todos.
  const lista = String(u.modulos_acta ?? '').split(',').map((x) => x.trim()).filter((x) => x in TIPOS_ACTA) as TipoActa[];
  if (lista.length) return lista.map((t) => TIPOS_ACTA[t].id);
  return tiposPermitidos(u.rol);
}

export function tipoVisible(u: ConAlcance, tipoId: number | string | null | undefined): boolean {
  const t = tiposPermitidos(u);
  return !t || t.includes(Number(tipoId));
}

/** Descripción de cada permiso para el ABM (qué secciones habilita). */
export const PERMISO_INFO: Record<Permiso, { g: string; t: string; d: string }> = {
  labrar: { g: 'Actas', t: 'Labrar actas', d: 'Inicio del inspector, labrado y borradores (según los tipos de acta asignados)' },
  actasTransito: { g: 'Actas', t: 'Actas de tránsito', d: 'Ver y labrar actas de tránsito en la app de inspectores. Por tipo de usuario se suma al «tipo de inspector»; dado al usuario, lo habilita aunque no sea de ese tipo' },
  actasContravenciones: { g: 'Actas', t: 'Actas de contravención', d: 'Ver y labrar actas de contravención en la app de inspectores. Por tipo de usuario se suma al «tipo de inspector»; dado al usuario, lo habilita aunque no sea de ese tipo' },
  actasSustancias: { g: 'Actas', t: 'Actas de sustancias alimenticias', d: 'Ver y labrar actas de sustancias alimenticias en la app de inspectores. Por tipo de usuario se suma al «tipo de inspector»; dado al usuario, lo habilita aunque no sea de ese tipo' },
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
  depuracionPos: { g: 'Actas', t: 'Depuración en el POS', d: '7 toques seguidos sobre «Mis borradores» muestran todas las actas de sus tipos (solo para pruebas)' },
  auditoria: { g: 'Gestión', t: 'Auditoría', d: 'Registro de auditoría' },
  verPlantillas: { g: 'Escritos', t: 'Ver plantillas', d: 'Consultar las plantillas de escritos, su historial y el mapa de estados (sin editar)' },
  plantillas: { g: 'Configuración', t: 'Plantillas de escritos', d: 'Alta, edición y publicación de plantillas' },
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
/**
 * Funciones fuera del alcance del piloto: el código queda, pero la pantalla se oculta salvo que el administrador
 * la active en «Configuración › Funciones opcionales» (clave en `configuracion`, valor «1» = visible).
 */
export const FUNCIONES_OPCIONALES: readonly { llave: string; permiso: Permiso; titulo: string; detalle: string }[] = [
  { llave: 'mostrar_seguimiento_gps', permiso: 'seguimientoGps', titulo: 'Seguimiento GPS', detalle: 'Mapa con la posición y el recorrido de los inspectores (datos simulados). No es requerimiento del piloto.' },
  { llave: 'permitir_depuracion_pos', permiso: 'depuracionPos', titulo: 'Depuración en el POS («easter egg»)', detalle: 'Con esto activo, 7 toques seguidos sobre la lista «Mis borradores» le muestran al inspector todas las actas de sus tipos, no solo sus borradores. Solo para pruebas: la minuta del 20/10 pide que el inspector no tenga listado de actas firmadas.' },
];

/** Modo «Solo Tránsito» (minuta 20/10: la prueba piloto es solo de Tránsito). Clave en `configuracion`, «1» = activo. */
export const SOLO_TRANSITO = 'solo_transito';

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
/**
 * Clases y subclases de la Licencia Nacional de Conducir (Ley 24.449, art. 16; listado vigente de la ANSV:
 * argentina.gob.ar/seguridadvial/licencianacional/clasesysubclases). Una licencia puede tener varias.
 */
export const CATEGORIAS_LICENCIA: readonly { v: string; d: string }[] = [
  { v: 'A.1.1', d: 'Ciclomotores hasta 50 cc' },
  { v: 'A.1.2', d: 'Motocicletas hasta 150 cc' },
  { v: 'A.1.3', d: 'Motocicletas de 150 a 300 cc' },
  { v: 'A.1.4', d: 'Motocicletas de más de 300 cc' },
  { v: 'A.2.1', d: 'Triciclos y cuatriciclos sin cabina hasta 300 cc' },
  { v: 'A.2.2', d: 'Triciclos y cuatriciclos sin cabina de más de 300 cc' },
  { v: 'A.3', d: 'Triciclos y cuatriciclos cabinados' },
  { v: 'B.1', d: 'Automóviles, utilitarios y camionetas hasta 3500 kg' },
  { v: 'B.2', d: 'B.1 con acoplado de hasta 750 kg o casa rodante' },
  { v: 'C.1', d: 'Camiones de 3500 a 12.000 kg' },
  { v: 'C.2', d: 'Camiones de 12.000 a 24.000 kg' },
  { v: 'C.3', d: 'Camiones de más de 24.000 kg' },
  { v: 'D.1', d: 'Transporte de pasajeros hasta 8 plazas' },
  { v: 'D.2', d: 'Transporte de pasajeros de 9 a 20 plazas' },
  { v: 'D.3', d: 'Transporte de pasajeros de más de 20 plazas' },
  { v: 'D.4', d: 'Servicios de urgencia y emergencia' },
  { v: 'E.1', d: 'Clase C o D con remolque o articulado' },
  { v: 'E.2', d: 'Maquinaria especial no agrícola' },
  { v: 'F', d: 'Vehículo adaptado a la condición física del titular' },
  { v: 'G.1', d: 'Tractores agrícolas' },
  { v: 'G.2', d: 'Maquinaria especial agrícola' },
  { v: 'G.3', d: 'Tren agrícola' },
];

/** Categorías de licencia en el orden del listado oficial (las desconocidas, al final). */
export function ordenarCategoriasLicencia(lista?: string[] | null): string[] {
  const orden = CATEGORIAS_LICENCIA.map((c) => c.v);
  const pos = (v: string) => { const i = orden.indexOf(v); return i < 0 ? orden.length : i; };
  return [...new Set(lista ?? [])].sort((a, b) => pos(a) - pos(b) || a.localeCompare(b));
}

type BoletaLike = { concepto?: string | null; detalle_json?: string | null };
/** Boleta de acarreo y estadía emitida desde Retenciones al liberar el vehículo. */
/**
 * Requisitos para entregar un vehículo retenido (minuta 20/10): la entrega es solo presencial en la sede de Faltas y
 * se acredita cada uno al registrar la liberación.
 */
export const REQUISITOS_LIBERACION = ['Titularidad del vehículo', 'Formulario 08 certificado', 'Póliza de seguro vigente', 'Licencia de conducir habilitante'] as const;

export function esBoletaLiberacion(b: BoletaLike): boolean {
  return String(b.detalle_json ?? '').includes('"liberacion":true');
}
/** Boletas de depósito (liberación o estadía sola): se cobran al retirar el vehículo, aparte de la multa (Anexo V). */
export function esBoletaDeposito(b: BoletaLike): boolean {
  return esBoletaLiberacion(b) || String(b.concepto ?? '').startsWith('Estadía en depósito');
}

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

/** Huso horario oficial: el servidor (Vercel) corre en UTC y los dispositivos pueden estar mal configurados. */
export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

/** Fecha y hora en Argentina, por partes y como «AAAA-MM-DDTHH:MM» (formato del campo fecha y hora del acta). */
export function ahoraArgentina(ms: number = Date.now()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(ms)).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return { anio: Number(p.year), mes: Number(p.month), dia: Number(p.day), hora: p.hour, minuto: p.minute, iso: `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` };
}

export function fechaCorta(ms?: number | string | null): string {
  if (ms == null || ms === '') return '-';
  const d = typeof ms === 'number' ? new Date(ms) : new Date(ms);
  if (Number.isNaN(d.getTime())) return String(ms);
  // Marcas de tiempo (número): siempre en hora argentina. Textos «AAAA-MM-DDTHH:MM»: ya son hora local, se muestran tal cual.
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', ...(typeof ms === 'number' ? { timeZone: ZONA_HORARIA } : {}) });
}

export function fechaHora(ms?: number | string | null): string {
  if (ms == null || ms === '') return '-';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(ms);
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', ...(typeof ms === 'number' ? { timeZone: ZONA_HORARIA } : {}) });
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

/** Permiso que habilita cada tipo de acta en la app de inspectores. */
export const PERMISO_TIPO_ACTA: Record<ModuloActa, Permiso> = {
  multas: 'actasTransito',
  contravenciones: 'actasContravenciones',
  sustancias: 'actasSustancias',
};

/**
 * Módulos autorizados: los del usuario; si no tiene, se deducen de la dependencia. Los no inspectores ven todos.
 * Si el servidor ya calculó los módulos efectivos (tipo de inspector + permisos), se usan esos.
 */
export function modulosDe(u: { rol?: string | null; modulosActa?: string | string[] | null; modulos_acta?: string | null; sector?: string | null; modulosEfectivos?: string[] | null } | null | undefined): ModuloActa[] {
  if (!u) return [];
  const todos = MODULOS_ACTA.map((m) => m.v) as ModuloActa[];
  if (Array.isArray(u.modulosEfectivos)) return todos.filter((t) => u.modulosEfectivos!.includes(t));
  if (u.rol !== 'Inspector') return todos;
  const raw = u.modulosActa ?? u.modulos_acta;
  const lista = (Array.isArray(raw) ? raw : String(raw ?? '').split(',')).map((x) => x.trim()).filter((x): x is ModuloActa => (todos as string[]).includes(x));
  if (lista.length) return lista;
  const s = u.sector ?? '';
  return [/bromatolog/i.test(s) ? 'sustancias' : /contrav|inspecciones generales/i.test(s) ? 'contravenciones' : 'multas'];
}

/**
 * Tipos de acta que el usuario ve y labra en la app de inspectores: su tipo de inspector (o todos si no es inspector),
 * filtrado por el permiso de cada tipo. Un permiso dado al usuario puntualmente (sí o no) manda sobre su tipo de inspector.
 */
export function modulosConPermisos(
  u: { rol?: string | null; modulos_acta?: string | null; sector?: string | null },
  permisos: string[],
  delUsuario: Overrides = {},
): ModuloActa[] {
  // Inspector: su tipo de inspector. Back office: el área que gestiona (Directora tránsito, cada Responsable la suya).
  const alcance = u.rol === 'Inspector' ? null : tiposPermitidos(u);
  const base = alcance
    ? (MODULOS_ACTA.map((m) => m.v) as ModuloActa[]).filter((t) => alcance.includes(TIPOS_ACTA[t].id))
    : modulosDe({ rol: u.rol, modulos_acta: u.modulos_acta, sector: u.sector });
  return (MODULOS_ACTA.map((m) => m.v) as ModuloActa[]).filter((t) => {
    const p = PERMISO_TIPO_ACTA[t];
    if (delUsuario[p] !== undefined) return Boolean(delUsuario[p]);
    return base.includes(t) && permisos.includes(p);
  });
}

/**
 * Documento o CUIT sin separadores (puntos, espacios, guiones) y en mayúsculas, para guardarlo y compararlo igual
 * en el acta y en la cuenta del portal: «47.313.755 » y «47313755» son el mismo documento (QA UI-CONT-08).
 */
export function normalizarDocumento(v: string | null | undefined): string | null {
  const s = String(v ?? '').toUpperCase().replace(/[\s.\-/]/g, '');
  return s || null;
}

/** Patrón (regex de Postgres) que encuentra un número aunque esté guardado con puntos, espacios o guiones. */
export function patronDocumento(digitos: string): string {
  return `^[^0-9]*${digitos.split('').join('[^0-9]*')}[^0-9]*$`;
}

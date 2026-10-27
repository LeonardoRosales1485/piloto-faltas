import type { Infraccion } from '@/lib/types';
import { ahoraArgentina, type TipoActa } from '@/lib/dominio';

export const MAX_IMAGENES = 5;

export type Paso = { id: 'acta' | 'lugar' | 'infractor' | 'vehiculo' | 'articulos' | 'fotos' | 'firma'; corto: string; titulo: string; ayuda: string };

const TODOS: Paso[] = [
  { id: 'acta', corto: 'Acta', titulo: 'Datos del acta', ayuda: 'Número, legajo y fecha se asignan solos' },
  { id: 'lugar', corto: 'Lugar de infracción', titulo: 'Lugar de infracción', ayuda: 'Use el GPS para completar la ubicación' },
  { id: 'infractor', corto: 'Infractor', titulo: 'Datos del infractor', ayuda: 'Indique primero si el infractor está presente, ausente o no identificado' },
  { id: 'vehiculo', corto: 'Vehículo', titulo: 'Datos del vehículo', ayuda: 'Vehículo involucrado' },
  { id: 'articulos', corto: 'Artículos', titulo: 'Artículos y medidas', ayuda: 'Normas infringidas y medidas adoptadas' },
  { id: 'fotos', corto: 'Fotos', titulo: 'Imágenes y observaciones', ayuda: 'Hasta 5 imágenes' },
  { id: 'firma', corto: 'Firma', titulo: 'Revisión y firma', ayuda: 'Revise los datos antes de firmar: después no se pueden modificar' },
];

export function pasosPara(tipo: TipoActa, situacion?: string): Paso[] {
  return TODOS.filter((p) => {
    if (p.id === 'vehiculo' && tipo === 'contravenciones') return false;
    return true;
  });
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Fecha y hora actuales en hora argentina (aunque el dispositivo tenga otro huso). */
export function nowLocalInputValue() {
  return ahoraArgentina().iso;
}

export function toDateTimeLocal(value?: string) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toDateInput(value?: string) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Ejido urbano aproximado del partido de Malvinas Argentinas (piloto).
 * El polígono oficial lo debe proveer Catastro; mientras tanto se usa un rectángulo.
 */
export function ejidoPorGps(lat: number, lng: number): 'dentro' | 'fuera' {
  return lat <= -34.42 && lat >= -34.54 && lng <= -58.62 && lng >= -58.77 ? 'dentro' : 'fuera';
}

export function vacia(tipo: string): Infraccion {
  return {
    uuid: '',
    infraccionTipoNombre: tipo,
    legajoNumber: '',
    legajoAnio: '',
    legajoCaratula: '',
    dependenciasNombre: [],
    legajoNumeroActa: '',
    legajoFecha: nowLocalInputValue(),
    legajoObservada: 0,
    infractorNombre: '',
    infractorPersonaTipo: 0,
    infractorDocumentoTipoNombre: 'DNI',
    infractorDocumentoNumero: '',
    domicilioInfraccionLocalidadNombre: '',
    infractorDomicilio: '',
    infractorDepartamento: '',
    infractorProvinciaNombre: 'Buenos Aires',
    infractorLocalidadNombre: '',
    infractorPartidoNombre: 'Malvinas Argentinas',
    vehiculoNumeroDominio: '',
    vehiculoNumeroControlInterno: '',
    vehiculoNumeroLicencia: '',
    vehiculoTipoNombre: '',
    vehiculoMunicipalidadEmisora: '',
    domicilioInfraccionCalle: '',
    domicilioInfraccionNumero: '',
    leyesNombre: [],
    observaciones: '',
    retencionDeLicencia: 0,
    retencionDeVehiculo: 0,
    estado: 'Activo',
    metadata: {},
    situacionInfractor: '',
    medidasPreventivas: [],
    acarreo: 0,
  };
}

export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(String(reader.result));
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Datos obligatorios que faltan para poder firmar, agrupados por paso del wizard.
 * Mismas reglas que valida `firmarActa` en el servidor (src/lib/acta-srv.ts): mantener ambas en sintonía.
 */
export function faltantesPorPaso(form: Partial<Infraccion>, firma: string | null, cantImagenes = 0): Partial<Record<Paso['id'], string[]>> {
  const out: Partial<Record<Paso['id'], string[]>> = {};
  const add = (p: Paso['id'], t: string) => { (out[p] ??= []).push(t); };
  const txt = (v: unknown) => String(v ?? '').trim();
  const sit = form.situacionInfractor ?? '';
  if (!sit) add('infractor', 'situación del infractor');
  if (!txt(form.domicilioInfraccionCalle)) add('lugar', 'calle del lugar de infracción');
  if (form.infraccionTipoNombre === 'multas' && !txt(form.metadata?.sentidoCirculacion)) add('lugar', 'sentido de circulación');
  if (sit !== 'nn') {
    // Ausente: nombre y documento pueden no conocerse en el momento; se cargan si se pueden constatar.
    if (sit !== 'ausente' && !txt(form.infractorNombre) && !txt(form.infractorRazonSocial)) add('infractor', 'nombre o razón social');
    // Ausente: el documento (o CUIT) puede no conocerse en el momento; se carga si se puede constatar.
    if (sit !== 'ausente' && !txt(form.infractorDocumentoNumero) && !txt(form.infractorCuit)) add('infractor', 'documento o CUIT');
    if ((sit === 'presente' || sit === 'se_niega') && !txt(form.infractorDomicilio)) add('infractor', 'domicilio');
  }
  if (form.infraccionTipoNombre !== 'contravenciones') {
    if (!txt(form.vehiculoNumeroDominio)) add('vehiculo', 'dominio');
    if (!txt(form.vehiculoTipoNombre)) add('vehiculo', 'tipo de vehículo');
    if (form.infraccionTipoNombre === 'multas') {
      if (!txt(form.metadata?.marca)) add('vehiculo', 'marca');
      if (!txt(form.metadata?.modelo)) add('vehiculo', 'modelo');
    }
  }
  if (!(form.leyesNombre ?? []).length) add('articulos', 'al menos un artículo');
  if (cantImagenes < 1) add('fotos', 'al menos una foto');
  if (sit === 'presente' && !firma) add('firma', 'firma del infractor (o marcar que se negó)');
  return out;
}

export const DESCONOCIDO = 'Desconocido';

/**
 * Completa con «Desconocido» los datos obligatorios que faltan (mismas reglas que faltantesPorPaso).
 * Sin identificación de la persona → «No identificado». No toca artículos, fotos ni firma.
 * Se usa para registrar un «Acta incompleta» (número anulado, no se firma).
 */
export function completarConDesconocido(form: Partial<Infraccion>): Partial<Infraccion> {
  const f: Partial<Infraccion> = { ...form, metadata: { ...(form.metadata ?? {}) } };
  const txt = (v: unknown) => String(v ?? '').trim();
  if (!f.situacionInfractor) f.situacionInfractor = 'nn';
  const sit = f.situacionInfractor;
  if (!txt(f.domicilioInfraccionCalle)) f.domicilioInfraccionCalle = DESCONOCIDO;
  if (f.infraccionTipoNombre === 'multas' && !txt(f.metadata!.sentidoCirculacion)) f.metadata!.sentidoCirculacion = DESCONOCIDO;
  if (sit !== 'nn') {
    if (sit !== 'ausente' && !txt(f.infractorNombre) && !txt(f.infractorRazonSocial)) {
      if (f.infractorPersonaTipo === 1) f.infractorRazonSocial = DESCONOCIDO; else f.infractorNombre = DESCONOCIDO;
    }
    if (sit !== 'ausente' && !txt(f.infractorDocumentoNumero) && !txt(f.infractorCuit)) f.infractorDocumentoNumero = DESCONOCIDO;
    if ((sit === 'presente' || sit === 'se_niega') && !txt(f.infractorDomicilio)) f.infractorDomicilio = DESCONOCIDO;
  }
  if (f.infraccionTipoNombre !== 'contravenciones') {
    if (!txt(f.vehiculoNumeroDominio)) f.vehiculoNumeroDominio = DESCONOCIDO;
    if (!txt(f.vehiculoTipoNombre)) f.vehiculoTipoNombre = DESCONOCIDO;
    if (f.infraccionTipoNombre === 'multas') {
      if (!txt(f.metadata!.marca)) f.metadata!.marca = DESCONOCIDO;
      if (!txt(f.metadata!.modelo)) f.metadata!.modelo = DESCONOCIDO;
    }
  }
  return f;
}

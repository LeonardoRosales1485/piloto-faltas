import type { Infraccion } from '@/lib/types';
import type { TipoActa } from '@/lib/dominio';

export const MAX_IMAGENES = 5;

export type Paso = { id: 'acta' | 'lugar' | 'infractor' | 'vehiculo' | 'articulos' | 'fotos' | 'firma'; corto: string; titulo: string; ayuda: string };

const TODOS: Paso[] = [
  { id: 'acta', corto: 'Acta', titulo: 'Datos del acta', ayuda: 'Número, legajo y fecha se asignan solos' },
  { id: 'lugar', corto: 'Lugar', titulo: 'Lugar del hecho', ayuda: 'Use el GPS para completar la ubicación' },
  { id: 'infractor', corto: 'Infractor', titulo: 'Datos del infractor', ayuda: 'Obligatorios si el infractor está presente' },
  { id: 'vehiculo', corto: 'Vehículo', titulo: 'Datos del vehículo', ayuda: 'Vehículo involucrado' },
  { id: 'articulos', corto: 'Artículos', titulo: 'Artículos y medidas', ayuda: 'Normas infringidas y medidas adoptadas' },
  { id: 'fotos', corto: 'Fotos', titulo: 'Imágenes y observaciones', ayuda: 'Hasta 5 imágenes' },
  { id: 'firma', corto: 'Firma', titulo: 'Revisión y firma', ayuda: 'Revise los datos antes de firmar: después no se pueden modificar' },
];

export function pasosPara(tipo: TipoActa, situacion?: string): Paso[] {
  return TODOS.filter((p) => {
    if (p.id === 'vehiculo' && tipo === 'contravenciones') return false;
    if (p.id === 'infractor' && situacion === 'nn') return false;
    return true;
  });
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function nowLocalInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    situacionInfractor: 'presente',
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

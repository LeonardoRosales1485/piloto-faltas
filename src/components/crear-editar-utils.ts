import type { Infraccion } from '@/lib/types';

export const MAX_IMAGENES = 5;
export const TOTAL_PASOS = 6;

export const PASOS = [
  { numero: 1, corto: 'Expediente' },
  { numero: 2, corto: 'Infractor' },
  { numero: 3, corto: 'Vehículo' },
  { numero: 4, corto: 'Domicilio' },
  { numero: 5, corto: 'Artículos' },
  { numero: 6, corto: 'Fotos' },
];

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

export function vacia(tipo: string): Infraccion {
  return {
    uuid: crypto.randomUUID(),
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
    infractorFechaNacimiento: '',
    infractorCodigoPostal: '',
    infractorActividadEconomica: '',
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
    dateCreated: Date.now(),
  };
}

export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = () => {
      const raw = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const max = 1024;
        let { width, height } = img;
        if (width > max || height > max) {
          const scale = Math.min(max / width, max / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(raw);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => resolve(raw);
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}

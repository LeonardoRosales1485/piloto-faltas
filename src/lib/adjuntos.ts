/**
 * Límites de los adjuntos (minuta 20/10: tamaño, formatos y fojas). Valores PROVISORIOS en la configuración
 * (sql/032: adjuntos_max_mb, adjuntos_max_archivos, adjuntos_max_fojas) hasta que la Dirección los defina.
 * Se usa en el navegador (aviso antes de enviar) y en el servidor (control efectivo).
 */
export type LimitesAdjuntos = { maxMb: number; maxArchivos: number; maxFojas: number };
export const LIMITES_DEFECTO: LimitesAdjuntos = { maxMb: 3, maxArchivos: 10, maxFojas: 50 };
export const FORMATOS_ADJUNTOS: Record<string, string> = { 'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WEBP' };
export const ACCEPT_ADJUNTOS = Object.keys(FORMATOS_ADJUNTOS).join(',');

function decodificar(b64: string): string {
  if (typeof atob === 'function') return atob(b64);
  return Buffer.from(b64, 'base64').toString('latin1');
}

/** Tipo, tamaño (bytes) y fojas de un archivo en data URL. Imagen: 1 foja; PDF: cantidad de páginas. */
export function infoAdjunto(raw: string): { mime: string; bytes: number; fojas: number } {
  const m = /^data:([^;,]+)(;base64)?,/.exec(raw);
  const mime = (m?.[1] ?? '').toLowerCase();
  const datos = raw.slice(m ? m[0].length : 0);
  const bytes = Math.floor((datos.length * 3) / 4);
  let fojas = 1;
  if (mime === 'application/pdf') {
    try { fojas = Math.max(1, (decodificar(datos).match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length); } catch { fojas = 1; }
  }
  return { mime, bytes, fojas };
}

export function textoLimites(l: LimitesAdjuntos): string {
  return `PDF o imagen (JPG, PNG), hasta ${l.maxMb} MB por archivo, ${l.maxArchivos} archivos y ${l.maxFojas} fojas en total.`;
}

/** Devuelve el primer problema de la lista de adjuntos, o null si cumple los límites. */
export function validarAdjuntos(lista: { nombre?: string; raw: string }[], l: LimitesAdjuntos): string | null {
  if (lista.length > l.maxArchivos) return `Puede adjuntar hasta ${l.maxArchivos} archivos.`;
  let fojas = 0;
  for (const a of lista) {
    const i = infoAdjunto(String(a.raw ?? ''));
    const nombre = a.nombre ? `«${a.nombre}»` : 'El archivo';
    if (!FORMATOS_ADJUNTOS[i.mime]) return `${nombre} no tiene un formato admitido (PDF, JPG o PNG).`;
    if (i.bytes > l.maxMb * 1024 * 1024) return `${nombre} supera ${l.maxMb} MB.`;
    fojas += i.fojas;
  }
  if (fojas > l.maxFojas) return `Los adjuntos suman ${fojas} fojas; el máximo es ${l.maxFojas}.`;
  return null;
}

/**
 * En el navegador: lee el archivo como data URL y, si es una foto, la achica (lado mayor 1600 px, JPG 80 %) para que
 * entre en el límite y en el envío. Los PDF van tal cual.
 */
export async function leerAdjunto(f: File): Promise<string> {
  const raw = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
  if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 400 * 1024) return raw;
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = raw; });
    const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * escala);
    c.height = Math.round(img.height * escala);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const chica = c.toDataURL('image/jpeg', 0.8);
    return chica.length < raw.length ? chica : raw;
  } catch {
    return raw;
  }
}

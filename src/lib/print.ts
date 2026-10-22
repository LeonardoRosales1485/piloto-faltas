import type { Infraccion } from './types';
import { LEYENDAS_DEFECTO, leyendasDelActa, textosLeyendas } from './leyendas';
import { actaHtmlPorTipo, actaPublicaUrl, svgQr, type ActaExtras } from './acta-oficial';

function abrirVentana(titulo: string, cuerpo: string, estilos: string, ancho = 820): void {
  const win = window.open('', '_blank', `width=${ancho},height=640`);
  if (!win) return;
  win.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${titulo}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  ${estilos}
</style>
</head>
<body>${cuerpo}</body>
</html>`);
  win.document.close();
  win.focus();
  const lanzar = () => win.print();
  const imagenes = Array.from(win.document.images);
  const pendientes = imagenes.filter((img) => !img.complete);
  if (pendientes.length === 0) {
    setTimeout(lanzar, 250);
    return;
  }
  let listas = 0;
  const alCargar = () => {
    listas += 1;
    if (listas >= pendientes.length) setTimeout(lanzar, 150);
  };
  pendientes.forEach((img) => {
    img.addEventListener('load', alCargar);
    img.addEventListener('error', alCargar);
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatearFechaTicket(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function logoTicket(): string {
  const src = `${window.location.origin}/images/Municipio_malvinas_argentinas_logo.png`;
  return `<img class="t-logo" src="${src}" alt="" />`;
}

/**
 * Ticket para impresora térmica de 80 mm (Senraise H10S: 576 puntos a 203 dpi, ~72 mm imprimibles).
 * Solo negro puro (sin grises que la térmica convierte en tramado), letra grande y en negrita, sin cursiva, y alto
 * libre para que nunca se corte el contenido ni pase al ticket siguiente.
 */
function ticketCss(): string {
  return `
    @page { size: 80mm auto; margin: 0; }
    html, body { width: 80mm; margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; }
    .ticket { width: 72mm; margin: 0 auto; padding: 3mm 0 8mm; }
    .t-centro { text-align: center; }
    .t-logo { display: block; height: 18mm; margin: 0 auto 1.5mm; filter: grayscale(1) contrast(12) brightness(1.1); }
    .t-muni { margin: 0; font-size: 10pt; font-weight: 700; line-height: 1.2; }
    .t-dir { margin: 0 0 2mm; font-size: 9pt; font-weight: 700; }
    .t-tipo { margin: 2mm 0 0; font-size: 12pt; font-weight: 800; letter-spacing: .02em; }
    .t-numero { margin: 0 0 2mm; font-size: 22pt; font-weight: 900; letter-spacing: .03em; }
    .t-sep { border: 0; border-top: 2px dashed #000; margin: 2.5mm 0; }
    .t-campo { margin: 0 0 2mm; }
    .t-label { display: block; font-size: 8.5pt; font-weight: 800; letter-spacing: .04em; }
    .t-valor { display: block; font-size: 12pt; font-weight: 700; line-height: 1.25; word-wrap: break-word; }
    .t-art { margin: 0; padding-left: 0; list-style: none; }
    .t-art li { font-size: 11pt; font-weight: 700; line-height: 1.3; padding-left: 4mm; text-indent: -4mm; }
    .t-art li::before { content: '• '; }
    .t-aviso { margin: 3mm 0; padding: 2mm; border: 2px solid #000; font-size: 10pt; font-weight: 800; line-height: 1.3; text-align: center; }
    .t-leyenda-legal { margin: 2mm 0; font-size: 9pt; line-height: 1.3; text-align: justify; }
    .t-qr svg { width: 46mm; height: 46mm; display: block; margin: 1mm auto; }
    .t-leyenda { margin: 1mm 0 0; font-size: 10pt; font-weight: 800; text-align: center; }
    .t-codigo { margin: .5mm 0 0; font-size: 9pt; font-weight: 700; text-align: center; letter-spacing: .08em; }
  `;
}

/** Datos del ticket (los mismos para la impresión web y para la impresión nativa en el POS). */
export type DatosTicket = {
  titulo: string; numero: string; fecha: string; lugar: string; dominio: string; articulos: string[]; reparticion: string; url: string; codigo: string;
  /** Leyendas legales que corresponden al acta (boleta de inculpado, compactación). */
  leyendas: string[];
  /** Recuadro destacado; sin indicar, el aviso de no abonar a la autoridad. Vacío: sin recuadro (APK 1.0.2+). */
  aviso?: string;
  /** Título del bloque de artículos (por defecto «Disposición legal infringida»). */
  tituloArticulos?: string;
};

/**
 * Artículos del ticket con la descripción coloquial primero y la cita de la norma después (minuta 20/10:
 * «Falta VTV» antes que «Ordenanza … · Art. …»). Sin descripción en el catálogo, queda la cita sola.
 */
export function articulosParaCiudadano(infraccion: Infraccion): string[] {
  const claves = Array.isArray(infraccion.leyesNombre) ? infraccion.leyesNombre.filter(Boolean) : [];
  const detalle = infraccion.leyesDetalle ?? [];
  return claves.map((k, n) => {
    const d = detalle.find((x) => (x.articulo ? `${x.nombre} · ${x.articulo}` : x.nombre) === k) ?? detalle[n];
    const desc = String(d?.descripcion ?? '').trim();
    return desc ? `${desc} (${k})` : k;
  });
}

export function datosTicket(infraccion: Infraccion, textos: Record<string, string> = {}): DatosTicket {
  const lugar = [infraccion.domicilioInfraccionCalle, infraccion.domicilioInfraccionNumero].filter(Boolean).join(' ')
    + (infraccion.domicilioInfraccionLocalidadNombre ? `, ${infraccion.domicilioInfraccionLocalidadNombre}` : '');
  const tipo = infraccion.infraccionTipoNombre;
  return {
    titulo: tipo === 'contravenciones' ? 'ACTA DE CONTRAVENCIÓN' : tipo === 'sustancias' ? 'ACTA DE SUSTANCIAS ALIMENTICIAS' : 'ACTA DE TRÁNSITO',
    numero: infraccion.legajoNumeroActa || '-',
    fecha: formatearFechaTicket(infraccion.legajoFecha),
    lugar: lugar || '-',
    dominio: String(infraccion.vehiculoNumeroDominio || '').toUpperCase(),
    articulos: articulosParaCiudadano(infraccion),
    reparticion: tipo === 'contravenciones' ? 'CONTRAVENCIONES' : tipo === 'sustancias' ? 'SUSTANCIAS ALIMENTICIAS' : 'TRÁNSITO',
    url: infraccion.uuid ? actaPublicaUrl(infraccion.uuid) : window.location.origin,
    codigo: String(infraccion.firmaInspectorHash ?? '').slice(0, 8).toUpperCase(),
    leyendas: leyendasDelActa(infraccion, textos),
  };
}

type PuenteFlutter = { callHandler: (nombre: string, ...args: unknown[]) => Promise<unknown> };
/** App del POS (Flutter + senraise_printer): expone el handler «imprimirTicket» para imprimir con la impresora térmica nativa. */
function puentePos(): PuenteFlutter | null {
  const w = window as unknown as { flutter_inappwebview?: PuenteFlutter };
  return w.flutter_inappwebview?.callHandler ? w.flutter_inappwebview : null;
}
export function hayImpresoraPos(): boolean {
  return Boolean(puentePos());
}

/**
 * Ajustes de la impresora de ESTE equipo (pantalla «Prueba de impresora»: mantener apretada la versión al pie del login).
 * Se guardan en el navegador del POS. `impresora`: auto | senraise | nyx | bluetooth; `mac`: dispositivo Bluetooth elegido;
 * `columnas`: 32 (58 mm) o 48 (80 mm); `sinAcentos`, `qrTam`, `sinLogo`: para afinar impresoras ESC/POS.
 */
export type AjustesImpresora = { impresora?: 'auto' | 'senraise' | 'nyx' | 'bluetooth'; mac?: string; columnas?: number; sinAcentos?: boolean; qrTam?: number; sinLogo?: boolean };
const CLAVE_IMPRESORA = 'faltas.impresora';
export function leerAjustesImpresora(): AjustesImpresora {
  try { return JSON.parse(localStorage.getItem(CLAVE_IMPRESORA) ?? '{}') as AjustesImpresora; } catch { return {}; }
}
export function guardarAjustesImpresora(a: AjustesImpresora) {
  try { localStorage.setItem(CLAVE_IMPRESORA, JSON.stringify(a)); } catch { /* sin almacenamiento */ }
}

/** Llama a la app del POS con tiempo límite: si la impresora no responde, no queda esperando para siempre. */
async function llamarPos<T>(pos: PuenteFlutter, nombre: string, datos: unknown, ms = 35000): Promise<T> {
  return Promise.race([
    pos.callHandler(nombre, datos) as Promise<T>,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('La impresora no respondió')), ms)),
  ]);
}

/** Datos del equipo y de la impresora (pantalla de prueba). Null fuera de la app del POS. */
export async function infoImpresora(): Promise<Record<string, unknown> | null> {
  const pos = puentePos();
  if (!pos) return null;
  return llamarPos<Record<string, unknown>>(pos, 'infoImpresora', {}, 15000);
}

/** Imprime un ticket de prueba con los ajustes indicados. Devuelve la vía usada o lanza el error. */
export async function imprimirPrueba(a: AjustesImpresora): Promise<string> {
  const pos = puentePos();
  if (!pos) throw new Error('Solo funciona en la app del POS');
  const t: DatosTicket = {
    titulo: 'TICKET DE PRUEBA', numero: 'T-000000', fecha: formatearFechaTicket(new Date().toISOString()), lugar: 'Av. Pte. Perón 1500, Los Polvorines',
    dominio: 'AB123CD', articulos: ['Ordenanza 261/2022 · Art. 45 (prueba de tildes: ñ á é í ó ú)'], reparticion: 'TRÁNSITO',
    url: `${window.location.origin}/acta/prueba`, codigo: 'PRUEBA', leyendas: [LEYENDAS_DEFECTO.leyenda_compactacion],
  };
  const r = await llamarPos<{ ok?: boolean; via?: string; error?: string } | null>(pos, 'imprimirTicket', { ...t, ...a });
  if (r?.ok === false) throw new Error(r.error || 'No se pudo imprimir');
  return r?.via ?? 'senraise';
}

/** Aviso cuando la impresora del POS falla: ofrece la impresión del sistema (diálogo de Android). */
function avisoFalloImpresora(error: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.className = 'modal-fake-overlay';
    ov.innerHTML = `<div class="modal-fake modal-fake-sm" role="alertdialog" aria-modal="true" aria-label="No se pudo imprimir">
      <div class="modal-fake-header"><h2>No se pudo imprimir el ticket</h2></div>
      <div class="modal-fake-body"><p class="mb-2">${escapeHtml(error)}</p><p class="mb-0">Puede intentar con la impresión del sistema.</p></div>
      <div class="modal-fake-footer"><button type="button" class="btn btn-outline-secondary" data-r="0">Cerrar</button><button type="button" class="btn btn-primary" data-r="1">Imprimir con el sistema</button></div>
    </div>`;
    ov.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('[data-r]') as HTMLElement | null;
      if (!b) return;
      ov.remove();
      resolve(b.dataset.r === '1');
    });
    document.body.appendChild(ov);
    (ov.querySelector('.btn-primary') as HTMLButtonElement | null)?.focus();
  });
}

/**
 * En la app del POS el <input type="file" capture> del WebView no devuelve la foto, así que la cámara/galería la abre
 * la app (handler «tomarFoto», image_picker) y devuelve las imágenes como data URL. Devuelve null si no hay app.
 */
export async function tomarFotosPos(max: number): Promise<File[] | null> {
  const pos = puentePos();
  if (!pos) return null;
  const r = (await pos.callHandler('tomarFoto', { max })) as { ok?: boolean; fotos?: string[]; error?: string } | null;
  if (!r?.ok) { if (r?.error) throw new Error(r.error); return []; }
  const files: File[] = [];
  for (const [i, url] of (r.fotos ?? []).entries()) {
    const blob = await (await fetch(url)).blob();
    files.push(new File([blob], `foto-${Date.now()}-${i}.jpg`, { type: blob.type || 'image/jpeg' }));
  }
  return files;
}

export function printActa(infraccion: Infraccion, extras: ActaExtras = {}): void {
  const { html, css } = actaHtmlPorTipo(infraccion, extras);
  abrirVentana('Acta de Infracción', html, css);
}

/** Modal «¿Imprimir el ticket?» para evitar impresiones por un toque accidental. Resuelve true si confirma. */
function confirmarImpresion(numero: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.className = 'modal-fake-overlay';
    ov.innerHTML = `<div class="modal-fake modal-fake-sm" role="dialog" aria-modal="true" aria-label="Imprimir ticket">
      <div class="modal-fake-header"><i class="fa-solid fa-print" aria-hidden="true"></i><h2>Imprimir ticket</h2><button type="button" aria-label="Cerrar" data-r="0">&times;</button></div>
      <div class="modal-fake-body"><p class="mb-0">¿Imprimir el ticket del acta <strong>${escapeHtml(numero || '')}</strong>?</p></div>
      <div class="modal-fake-footer"><button type="button" class="btn btn-secondary" data-r="0">Cancelar</button><button type="button" class="btn btn-primary" data-r="1"><i class="fa-solid fa-print" aria-hidden="true"></i> Imprimir</button></div>
    </div>`;
    const cerrar = (ok: boolean) => { ov.remove(); document.removeEventListener('keydown', tecla); resolve(ok); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(false); };
    ov.addEventListener('click', (e) => {
      if (e.target === ov) return cerrar(false);
      const r = (e.target as HTMLElement).closest('[data-r]')?.getAttribute('data-r');
      if (r != null) cerrar(r === '1');
    });
    document.addEventListener('keydown', tecla);
    document.body.appendChild(ov);
    (ov.querySelector('.btn-primary') as HTMLButtonElement | null)?.focus();
  });
}

export async function printTicket(infraccion: Infraccion, confirmar = true): Promise<void> {
  return imprimirDatosTicket(datosTicket(infraccion, await textosLeyendas()), confirmar);
}

/**
 * Ticket de retención (minuta 20/10): identifica el vehículo o la licencia retenidos con el número de acta y un QR,
 * para pegar en el parabrisas al ingresar al depósito o abrochar a la licencia. Uno por cada retención del acta.
 */
export async function printTicketRetencion(infraccion: Infraccion, que: 'vehiculo' | 'licencia'): Promise<void> {
  const base = datosTicket(infraccion);
  const meta = infraccion.metadata ?? {};
  const vehiculo = [infraccion.vehiculoTipoNombre, meta.marca, meta.modelo].filter((x) => x && x !== '-').join(' ');
  const t: DatosTicket = {
    ...base,
    titulo: que === 'vehiculo' ? 'RETENCIÓN DE VEHÍCULO' : 'RETENCIÓN DE LICENCIA',
    tituloArticulos: que === 'vehiculo' ? 'VEHÍCULO RETENIDO' : 'LICENCIA RETENIDA',
    articulos: que === 'vehiculo'
      ? [`Vehículo: ${vehiculo || '-'}`, `Dominio: ${base.dominio || 'sin dominio'}`]
      : [`Licencia N.° ${infraccion.vehiculoNumeroLicencia || '-'}`, `Titular: ${infraccion.infractorNombre || infraccion.infractorRazonSocial || '-'}`],
    reparticion: que === 'vehiculo' ? 'TRÁNSITO · DEPÓSITO MUNICIPAL' : 'TRÁNSITO · DIRECCIÓN DE FALTAS',
    aviso: que === 'vehiculo' ? 'PEGAR EN EL PARABRISAS DEL VEHÍCULO RETENIDO' : 'ABROCHAR A LA LICENCIA RETENIDA',
    leyendas: [`Corresponde al acta ${base.numero}. No retirar este comprobante: identifica ${que === 'vehiculo' ? 'el vehículo' : 'la licencia'} hasta su devolución.`],
  };
  return imprimirDatosTicket(t, true);
}

async function imprimirDatosTicket(t: DatosTicket, confirmar: boolean): Promise<void> {
  if (confirmar && !(await confirmarImpresion(t.numero))) return;
  // En el POS Senraise (app del inspector) imprime directo con la impresora térmica, sin diálogo.
  const pos = puentePos();
  if (pos) {
    let error = '';
    try {
      const r = await llamarPos<{ ok?: boolean; error?: string } | null>(pos, 'imprimirTicket', { ...t, ...leerAjustesImpresora() });
      if (!r || r.ok !== false) return;
      error = r.error || 'La impresora del equipo no respondió.';
    } catch (e) {
      error = e instanceof Error ? e.message : 'La impresora del equipo no respondió.';
    }
    console.warn('Impresora del POS:', error);
    // Si la impresora nativa falla, se avisa y se ofrece la impresión web (diálogo de Android).
    if (!(await avisoFalloImpresora(error))) return;
  }
  const campo = (label: string, valor: string) => `<div class="t-campo"><span class="t-label">${label}</span><span class="t-valor">${escapeHtml(valor)}</span></div>`;
  const cuerpo = `<div class="ticket">
    <div class="t-centro">${logoTicket()}<p class="t-muni">MUNICIPALIDAD DE MALVINAS ARGENTINAS</p><p class="t-dir">Dirección de Faltas</p></div>
    <hr class="t-sep" />
    <div class="t-centro"><p class="t-tipo">${t.titulo}</p><p class="t-numero">${escapeHtml(t.numero)}</p></div>
    ${campo('FECHA Y HORA', t.fecha)}
    ${campo('LUGAR', t.lugar)}
    ${t.dominio ? campo('DOMINIO', t.dominio) : ''}
    <div class="t-campo"><span class="t-label">${escapeHtml(t.tituloArticulos ?? 'DISPOSICIÓN LEGAL INFRINGIDA')}</span><ul class="t-art">${(t.articulos.length ? t.articulos : ['-']).map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul></div>
    ${campo('REPARTICIÓN', t.reparticion)}
    ${t.aviso === '' ? '' : `<div class="t-aviso">${escapeHtml(t.aviso ?? 'IMPORTANTE: no debe abonar monto de dinero alguno a la autoridad que confeccionó la presente acta.')}</div>`}
    ${t.leyendas.map((l) => `<p class="t-leyenda-legal">${escapeHtml(l)}</p>`).join('')}
    <div class="t-qr">${svgQr(t.url)}</div>
    <p class="t-leyenda">Escanee para ver el acta digital</p>
    ${t.codigo ? `<p class="t-codigo">Código: ${t.codigo}</p>` : ''}
  </div>`;
  abrirVentana('Ticket de infracción', cuerpo, ticketCss(), 340);
}

/** Dirección del control de liberación que escanea el corralón (QR de la disposición y de la constancia). */
export function liberacionUrl(uuid: string): string {
  const origen = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origen}/liberacion/${encodeURIComponent(uuid)}`;
}

/**
 * Constancia para el corralón (minuta 20/10): se entrega con la liberación registrada en Faltas. El QR lleva al control
 * de liberación, que dice si está vigente o vencida al momento de retirar el vehículo.
 */
export function printConstanciaLiberacion(x: { uuid: string; acta: string; dominio?: string | null; vehiculo?: string | null; vigenteHasta?: number | null }): void {
  const fecha = (ms?: number | null) => (ms ? new Date(ms).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '-');
  const cuerpo = `<div class="constancia">
    <div class="c-centro">${logoTicket()}<p class="c-muni">MUNICIPALIDAD DE MALVINAS ARGENTINAS</p><p>Dirección de Faltas</p></div>
    <h1>CONSTANCIA DE LIBERACIÓN DE VEHÍCULO</h1>
    <p><strong>Acta:</strong> ${escapeHtml(x.acta)}</p>
    <p><strong>Dominio:</strong> <span class="c-dominio">${escapeHtml(x.dominio || 'Sin dominio')}</span></p>
    <p><strong>Vehículo:</strong> ${escapeHtml(x.vehiculo || '-')}</p>
    <p><strong>Vigente hasta:</strong> ${fecha(x.vigenteHasta)}</p>
    <div class="c-qr">${svgQr(liberacionUrl(x.uuid), '50mm')}</div>
    <p class="c-ayuda">El depósito municipal escanea este código antes de entregar el vehículo. Si la liberación venció, no se entrega:
    debe volver a la Dirección de Faltas, que emite la boleta complementaria por la estadía adicional.</p>
  </div>`;
  abrirVentana('Constancia de liberación', cuerpo, `.constancia { max-width: 150mm; margin: 10mm auto; font-family: Arial, sans-serif; font-size: 11pt; color: #000; }
    .c-centro { text-align: center; } .c-centro img { max-height: 18mm; } .c-muni { font-weight: 700; margin: 2mm 0 0; }
    h1 { font-size: 14pt; text-align: center; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2mm 0; margin: 4mm 0; }
    .c-dominio { font-size: 16pt; font-weight: 700; letter-spacing: 2px; } .c-qr svg { display: block; margin: 4mm auto; }
    .c-ayuda { font-size: 9pt; text-align: center; }`);
}

export { actaPublicaUrl };

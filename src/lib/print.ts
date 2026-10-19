import type { Infraccion } from './types';
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
    .t-qr svg { width: 46mm; height: 46mm; display: block; margin: 1mm auto; }
    .t-leyenda { margin: 1mm 0 0; font-size: 10pt; font-weight: 800; text-align: center; }
    .t-codigo { margin: .5mm 0 0; font-size: 9pt; font-weight: 700; text-align: center; letter-spacing: .08em; }
  `;
}

/** Datos del ticket (los mismos para la impresión web y para la impresión nativa en el POS). */
export type DatosTicket = {
  titulo: string; numero: string; fecha: string; lugar: string; dominio: string; articulos: string[]; reparticion: string; url: string; codigo: string;
};

export function datosTicket(infraccion: Infraccion): DatosTicket {
  const lugar = [infraccion.domicilioInfraccionCalle, infraccion.domicilioInfraccionNumero].filter(Boolean).join(' ')
    + (infraccion.domicilioInfraccionLocalidadNombre ? `, ${infraccion.domicilioInfraccionLocalidadNombre}` : '');
  const tipo = infraccion.infraccionTipoNombre;
  return {
    titulo: tipo === 'contravenciones' ? 'ACTA DE CONTRAVENCIÓN' : tipo === 'sustancias' ? 'ACTA DE SUSTANCIAS ALIMENTICIAS' : 'ACTA DE TRÁNSITO',
    numero: infraccion.legajoNumeroActa || '-',
    fecha: formatearFechaTicket(infraccion.legajoFecha),
    lugar: lugar || '-',
    dominio: String(infraccion.vehiculoNumeroDominio || '').toUpperCase(),
    articulos: (Array.isArray(infraccion.leyesNombre) ? infraccion.leyesNombre.filter(Boolean) : []),
    reparticion: tipo === 'contravenciones' ? 'CONTRAVENCIONES' : tipo === 'sustancias' ? 'SUSTANCIAS ALIMENTICIAS' : 'TRÁNSITO',
    url: infraccion.uuid ? actaPublicaUrl(infraccion.uuid) : window.location.origin,
    codigo: String(infraccion.firmaInspectorHash ?? '').slice(0, 8).toUpperCase(),
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
  const t = datosTicket(infraccion);
  if (confirmar && !(await confirmarImpresion(t.numero))) return;
  // En el POS Senraise (app del inspector) imprime directo con la impresora térmica, sin diálogo.
  const pos = puentePos();
  if (pos) {
    try {
      const r = (await pos.callHandler('imprimirTicket', t)) as { ok?: boolean; error?: string } | null;
      if (!r || r.ok !== false) return;
      console.warn('Impresora del POS:', r.error);
    } catch (e) {
      console.warn('Impresora del POS no disponible', e);
    }
    // Si la impresora nativa falla, sigue con la impresión web (diálogo de Android).
  }
  const campo = (label: string, valor: string) => `<div class="t-campo"><span class="t-label">${label}</span><span class="t-valor">${escapeHtml(valor)}</span></div>`;
  const cuerpo = `<div class="ticket">
    <div class="t-centro">${logoTicket()}<p class="t-muni">MUNICIPALIDAD DE MALVINAS ARGENTINAS</p><p class="t-dir">Dirección de Faltas</p></div>
    <hr class="t-sep" />
    <div class="t-centro"><p class="t-tipo">${t.titulo}</p><p class="t-numero">${escapeHtml(t.numero)}</p></div>
    ${campo('FECHA Y HORA', t.fecha)}
    ${campo('LUGAR', t.lugar)}
    ${t.dominio ? campo('DOMINIO', t.dominio) : ''}
    <div class="t-campo"><span class="t-label">DISPOSICIÓN LEGAL INFRINGIDA</span><ul class="t-art">${(t.articulos.length ? t.articulos : ['-']).map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul></div>
    ${campo('REPARTICIÓN', t.reparticion)}
    <div class="t-aviso">IMPORTANTE: no debe abonar monto de dinero alguno a la autoridad que confeccionó la presente acta.</div>
    <div class="t-qr">${svgQr(t.url)}</div>
    <p class="t-leyenda">Escanee para ver el acta digital</p>
    ${t.codigo ? `<p class="t-codigo">Código: ${t.codigo}</p>` : ''}
  </div>`;
  abrirVentana('Ticket de infracción', cuerpo, ticketCss(), 340);
}

export { actaPublicaUrl };

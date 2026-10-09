import QRCode from 'qrcode';
import type { Infraccion } from './types';
import { actaHtmlPorTipo, type ActaExtras } from './acta-oficial';

function actaPublicaUrl(uuid: string): string {
  return `${window.location.origin}/acta/${encodeURIComponent(uuid)}`;
}

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
  return `<img class="ticket-logo" src="${src}" alt="Municipio de Malvinas Argentinas" />`;
}

function ticketCss(): string {
  return `
    @page { size: 52mm 137.15mm; margin: 0; }
    html, body {
      width: 52mm;
      height: 137.15mm;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ticket {
      width: 52mm;
      height: 137.15mm;
      margin: 0;
      padding: 5mm 2.8mm 3mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .ticket-logo-wrap {
      height: 22mm;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 0 2mm;
    }
    .ticket-logo {
      height: 24mm;
      width: auto;
      max-width: 22mm;
      object-fit: contain;
    }
    .ticket-linea {
      margin: 0;
      font-size: 9pt;
      line-height: 14.5pt;
      font-weight: 400;
    }
    .ticket-disp {
      margin: 4pt 0 0;
      font-size: 9pt;
      line-height: 11.5pt;
      font-weight: 500;
    }
    .ticket-disposiciones {
      margin: 2pt 0 3pt;
      padding: 0 0 0 13pt;
      list-style: disc;
    }
    .ticket-disposiciones li {
      margin: 0;
      font-size: 8pt;
      line-height: 9.4pt;
    }
    .ticket-aviso {
      margin: 8pt 0 0;
      font-size: 7pt;
      line-height: 8.2pt;
      font-style: italic;
      font-weight: 400;
    }
    .ticket-pie { margin-top: auto; text-align: center; }
    .ticket-qr svg {
      width: 40mm;
      height: 40mm;
      display: block;
      margin: 0 auto;
    }
    .ticket-leyenda {
      margin: 1.5mm 0 0;
      font-size: 7pt;
      line-height: 8.2pt;
      text-align: center;
    }
  `;
}

export function printActa(infraccion: Infraccion, extras: ActaExtras = {}): void {
  const { html, css } = actaHtmlPorTipo(infraccion, extras);
  abrirVentana('Acta de Infracción', html, css);
}

function svgQr(url: string): string {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const quiet = 2;
  const side = n + quiet * 2;
  const celdas: string[] = [];
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (qr.modules.get(x, y)) celdas.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-quiet} ${-quiet} ${side} ${side}" width="40mm" height="40mm"><rect x="${-quiet}" y="${-quiet}" width="${side}" height="${side}" fill="#ffffff"/><g fill="#000000">${celdas.join('')}</g></svg>`;
}

export async function printTicket(infraccion: Infraccion): Promise<void> {
  const leyes = Array.isArray(infraccion.leyesNombre) ? infraccion.leyesNombre.filter(Boolean) : [];
  const lugar =
    [infraccion.domicilioInfraccionCalle, infraccion.domicilioInfraccionNumero]
      .filter(Boolean)
      .join(' ') || '-';
  const reparticion =
    infraccion.infraccionTipoNombre === 'contravenciones' ? 'CONTRAVENCIONES' : infraccion.infraccionTipoNombre === 'sustancias' ? 'SUSTANCIAS ALIMENTICIAS' : 'MULTAS';
  const url = infraccion.uuid ? actaPublicaUrl(infraccion.uuid) : window.location.origin;
  const qr = svgQr(url);
  const items =
    leyes.length > 0
      ? leyes.map((ley) => `<li>${escapeHtml(ley)}</li>`).join('')
      : '<li>-</li>';
  const cuerpo = `<div class="ticket">
    <div class="ticket-logo-wrap">${logoTicket()}</div>
    <p class="ticket-linea">ACTA N°: ${escapeHtml(infraccion.legajoNumeroActa || '-')}</p>
    <p class="ticket-linea">FECHA: ${escapeHtml(formatearFechaTicket(infraccion.legajoFecha))}</p>
    <p class="ticket-linea">LUGAR: ${escapeHtml(lugar)}</p>
    <p class="ticket-linea">DOMINIO: ${escapeHtml(infraccion.vehiculoNumeroDominio || '-')}</p>
    <p class="ticket-disp">DISPOSICIÓN LEGAL<br/>INFRINGIDA:</p>
    <ul class="ticket-disposiciones">${items}</ul>
    <p class="ticket-linea">REPARTICIÓN: ${reparticion}</p>
    <p class="ticket-aviso">IMPORTANTE!: No debe abonar monto de dinero alguno a la autoridad que confeccionó la presente acta</p>
    <div class="ticket-pie">
      <div class="ticket-qr">${qr}</div>
      <p class="ticket-leyenda">Escanee para ver el acta digital</p>
    </div>
  </div>`;
  abrirVentana('Ticket de infracción', cuerpo, ticketCss(), 260);
}

export { actaPublicaUrl };

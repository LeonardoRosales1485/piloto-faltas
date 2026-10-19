import QRCode from 'qrcode';
import type { Infraccion } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** URL que abre el QR del acta: verificación pública del acta (sin fotos ni montos). */
export function actaPublicaUrl(uuid: string): string {
  const origen = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origen}/acta/${encodeURIComponent(uuid)}`;
}

/** Código QR como SVG en línea (nítido al imprimir, sin pedir imágenes al servidor). */
export function svgQr(url: string, lado = '40mm'): string {
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-quiet} ${-quiet} ${side} ${side}" width="${lado}" height="${lado}"><rect x="${-quiet}" y="${-quiet}" width="${side}" height="${side}" fill="#ffffff"/><g fill="#000000">${celdas.join('')}</g></svg>`;
}

/** QR del acta (RN 2.u): solo si el acta ya tiene identificador. */
function bloqueQr(i: Infraccion): string {
  if (!i.uuid) return '';
  return `<div class="at-qr">${svgQr(actaPublicaUrl(i.uuid), '22mm')}<span>Verificá la validez del acta</span></div>`;
}

// ---------------------------------------------------------------------------
// Acta de infracción de tránsito: diseño según el «Modelo de acta digital (Tránsito)» de la Dirección de Faltas.
// No incluye medidas en la vía pública ni acarreo porque el modelo no los trae (ver docs/pendientes-acta-transito.md).
// ---------------------------------------------------------------------------

/** `evidencia: false` imprime el acta sin la sección de imágenes (por defecto se muestran). */
export type ActaExtras = { imagenes?: string[]; evidencia?: boolean };

const v = (x: unknown) => escapeHtml(String(x ?? '').trim()) || '-';

function campo(label: string, valor: unknown, clase = '') {
  return `<div class="at-campo ${clase}"><span class="at-label">${label}</span><span class="at-valor">${v(valor)}</span></div>`;
}

export function actaTransitoCss(): string {
  return `
    @page { size: A4; margin: 10mm; }
    .acta-transito { position: relative; width: 190mm; margin: 0 auto; padding: 4mm 6mm; background: #fff; color: #111;
      font-family: Arial, Helvetica, sans-serif; font-size: 9pt; line-height: 1.25; box-sizing: border-box; }
    .acta-transito * { box-sizing: border-box; }
    .at-marca { position: absolute; top: 45%; left: 50%; width: 130mm; transform: translate(-50%, -50%); opacity: .045; filter: grayscale(1); pointer-events: none; }
    .at-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; margin-bottom: 6px; }
    .at-header .izq img { height: 24mm; }
    .at-header .centro { text-align: center; font-size: 6.5pt; text-transform: uppercase; color: #444; letter-spacing: .3px; }
    .at-header .centro strong { display: block; font-size: 16pt; color: #111; letter-spacing: 1px; margin: 1px 0; }
    .at-header .centro .sep { border-top: 1px dashed #999; width: 70%; margin: 2px auto; }
    .at-header .der { text-align: right; font-size: 6.5pt; text-transform: uppercase; color: #444; }
    .at-header .der img { height: 24mm; display: block; margin: 0 0 0 auto; }
    .at-titulo { margin: 4px 0 2px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .at-qr { text-align: center; font-size: 6pt; text-transform: uppercase; color: #444; flex: none; }
    .at-qr svg { display: block; margin: 0 auto 1px; }
    .at-titulo .num { font-size: 12pt; color: #444; } .at-titulo .num b { color: #111; }
    .at-titulo h1 { font-size: 15pt; margin: 0; }
    .at-fecha { color: #444; margin-bottom: 6px; } .at-fecha b { color: #111; }
    .at-seccion { position: relative; margin-top: 8px; break-inside: avoid; }
    .at-seccion h2 { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; margin: 0 0 3px; color: #222; }
    .at-fila { display: grid; gap: 4px 14px; margin-bottom: 4px; }
    .at-c2 { grid-template-columns: repeat(2, 1fr); } .at-c3 { grid-template-columns: repeat(3, 1fr); } .at-c4 { grid-template-columns: repeat(4, 1fr); }
    .at-campo { border-bottom: 1px solid #bbb; padding: 1px 0 2px; min-width: 0; }
    .at-label { display: block; font-size: 6.5pt; text-transform: uppercase; color: #666; letter-spacing: .3px; }
    .at-valor { display: block; font-weight: 700; font-size: 9pt; min-height: 11pt; overflow-wrap: anywhere; }
    .at-ejido { display: flex; flex-direction: column; gap: 3px; justify-content: center; font-size: 8pt; }
    .at-check { display: inline-flex; align-items: center; gap: 5px; }
    .at-check i { width: 10px; height: 10px; border: 1.2px solid #111; display: inline-block; text-align: center; font-style: normal; font-size: 8px; line-height: 8px; font-weight: 700; }
    .at-tabla { width: 100%; border-collapse: collapse; }
    .at-tabla th { text-align: left; font-size: 6.5pt; text-transform: uppercase; color: #666; font-weight: 400; border-bottom: 1px solid #bbb; padding: 2px 4px 2px 0; }
    .at-tabla td { font-weight: 700; border-bottom: 1px solid #bbb; padding: 3px 4px 3px 0; vertical-align: top; }
    .at-imagenes { display: flex; flex-wrap: wrap; gap: 6px; }
    .at-imagenes img { height: 32mm; max-width: 56mm; object-fit: cover; border: 1px solid #ccc; }
    .at-firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 10px; break-inside: avoid; }
    .at-firma { text-align: left; }
    .at-firma .trazo { height: 22mm; display: flex; align-items: flex-end; border-bottom: 1px solid #111; }
    .at-firma .trazo img { max-height: 21mm; max-width: 100%; }
    .at-firma .digital { font-size: 7pt; color: #333; padding-bottom: 2px; }
    .at-firma .titulo { font-size: 7pt; text-transform: uppercase; color: #666; margin: 3px 0 2px; }
    .at-firma .dato { font-size: 8.5pt; }
    .at-legal { margin-top: 10px; padding-top: 6px; border-top: 1px solid #999; font-size: 7pt; font-style: italic; text-transform: uppercase; color: #555; text-align: justify; }
    @media print { .acta-transito { width: 100%; padding: 0; } }
  `;
}

export function actaTransitoHtml(i: Infraccion, extras: ActaExtras = {}): string {
  const meta = i.metadata ?? {};
  const fecha = i.legajoFecha ? new Date(i.legajoFecha) : null;
  const fechaTxt = fecha && !isNaN(fecha.getTime())
    ? `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`
    : '';
  const juridica = Number(i.infractorPersonaTipo) === 1 || Boolean(i.infractorRazonSocial);
  const entreCalles = [i.entreCalle1, i.entreCalle2].filter(Boolean).join(' y ');
  const marca = (x: boolean) => `<i>${x ? 'X' : ''}</i>`;

  const articulos = i.leyesDetalle?.length
    ? i.leyesDetalle
    : (i.leyesNombre ?? []).map((k) => {
        const [nombre, art] = k.split(' · ');
        return { nombre, articulo: (art ?? '').replace(/^Art\.\s*/, ''), descripcion: '' };
      });
  const filasArt = articulos.length
    ? articulos.map((a) => `<tr><td>${v(String(a.articulo).replace(/^Art\.\s*/, ''))}</td><td>${v(a.descripcion)}</td><td>${v(a.nombre)}</td></tr>`).join('')
    : '<tr><td>-</td><td>-</td><td>-</td></tr>';

  const conAlcoholemia = Boolean(meta.alcoholemia || meta.alcoholimetroMarca || meta.alcoholimetroValor);
  const imgs = (extras.imagenes ?? []).filter(Boolean);
  const sit = i.situacionInfractor ?? 'presente';
  const firmaInfractor = /^data:image\/(png|jpe?g|svg\+xml);base64,[A-Za-z0-9+/=]{100,}/.test(i.firmaInfractor ?? '')
    ? `<img src="${i.firmaInfractor}" alt="Firma del infractor" />`
    : `<span class="digital">${sit === 'se_niega' ? 'Se negó a firmar' : sit === 'ausente' ? 'Infractor ausente' : sit === 'nn' ? 'Infractor no identificado (NN)' : ''}</span>`;

  return `
  <div class="acta-transito">
    <img src="/images/Municipio_malvinas_argentinas_logo.png" class="at-marca" alt="" />
    <header class="at-header">
      <div class="izq"><img src="/images/malvinas-logo-completo.png" alt="Malvinas Argentinas Municipio" /></div>
      <div class="centro">Ley Nacional de Tránsito N°<strong>24.449</strong><div class="sep"></div>Adherida por Ley Provincial<br/>13.927</div>
      <div class="der"><img src="/images/escudo-municipalidad.png" alt="Municipalidad de Malvinas Argentinas" /></div>
    </header>

    <div class="at-titulo"><div><div class="num">Acta N° <b>${v(i.legajoNumeroActa)}</b></div><h1>Acta de Infracción de Tránsito</h1></div>${bloqueQr(i)}</div>
    <div class="at-fecha">Fecha/Hora <b>${v(fechaTxt)}</b> · Legajo <b>${v(i.legajoNumber)}</b> · Año <b>${v(i.legajoAnio)}</b></div>

    <section class="at-seccion">
      <h2>Domicilio de la infracción</h2>
      <div class="at-fila" style="grid-template-columns: 1.3fr .5fr .9fr 1.3fr .8fr 1.1fr">
        ${campo('Calle', i.domicilioInfraccionCalle)}
        ${campo('Número', i.domicilioInfraccionNumero)}
        ${campo('Ciudad', i.domicilioInfraccionLocalidadNombre)}
        ${campo('Entre calles', entreCalles)}
        ${campo('Sentido de circulación', meta.sentidoCirculacion)}
        <div class="at-ejido">
          <span class="at-check">${marca(i.ejido === 'dentro')} Dentro del ejido urbano</span>
          <span class="at-check">${marca(i.ejido === 'fuera')} Fuera del ejido urbano</span>
        </div>
      </div>
    </section>

    <section class="at-seccion">
      <h2>Datos de la persona infractora</h2>
      <div class="at-fila at-c3">
        ${juridica ? campo('Razón social', i.infractorRazonSocial || i.infractorNombre) : campo('Nombre', i.infractorNombre)}
        ${juridica ? campo('CUIT', i.infractorCuit || i.infractorDocumentoNumero) : campo(`Documento ${escapeHtml(i.infractorDocumentoTipoNombre || 'DNI')}`, i.infractorDocumentoNumero)}
        ${campo('Persona tipo', juridica ? 'Jurídica' : 'Física')}
      </div>
      <div class="at-fila at-c3">
        ${campo('Domicilio', [i.infractorDomicilio, i.infractorCalleAltura].filter(Boolean).join(' '))}
        ${campo('Provincia', i.infractorProvinciaNombre)}
        ${campo('Localidad', i.infractorLocalidadNombre)}
      </div>
      <div class="at-fila at-c3">
        ${campo('Partido', i.infractorPartidoNombre)}
        ${campo('Código postal', i.infractorCodigoPostal)}
        <div></div>
      </div>
      <div class="at-fila at-c3">
        ${campo('Licencia', i.vehiculoNumeroLicencia)}
        ${campo('Municipalidad emisora', i.vehiculoMunicipalidadEmisora)}
        <div></div>
      </div>
    </section>

    <section class="at-seccion">
      <h2>Datos del vehículo</h2>
      <div class="at-fila at-c4">
        ${campo('Dominio', i.vehiculoNumeroDominio ? i.vehiculoNumeroDominio.toUpperCase() : 'No posee')}
        ${campo('Tipo', i.vehiculoTipoNombre)}
        ${campo('Marca', meta.marca || 'No se describe')}
        ${campo('Modelo', meta.modelo || 'No se describe')}
      </div>
    </section>

    ${conAlcoholemia ? `
    <section class="at-seccion">
      <h2>Datos de alcoholemia</h2>
      <div class="at-fila at-c3">
        ${campo('Marca', meta.alcoholimetroMarca)}
        ${campo('Modelo', meta.alcoholimetroModelo)}
        ${campo('Nro. serie', meta.alcoholimetroSerie)}
      </div>
      <div class="at-fila at-c3">
        ${campo('Medición', meta.alcoholimetroMedicion)}
        ${campo('Valor', meta.alcoholimetroValor)}
        ${campo('Resultado', meta.alcoholemia === 'positiva' ? 'Positivo' : meta.alcoholemia === 'negativa' ? 'Negativo' : '')}
      </div>
    </section>` : ''}

    <section class="at-seccion">
      <h2>Disposición legal infringida</h2>
      <table class="at-tabla">
        <thead><tr><th style="width:14%">Artículo</th><th style="width:52%">Descripción</th><th>Ley/Ordenanza</th></tr></thead>
        <tbody>${filasArt}</tbody>
      </table>
      <div class="at-fila" style="margin-top:6px">${campo('Observación', i.observaciones)}</div>
      <div class="at-fila at-c2">
        ${campo('Retención licencia', i.retencionDeLicencia === 1 ? 'Sí' : 'No')}
        ${campo('Retención vehículo', i.retencionDeVehiculo === 1 ? 'Sí' : 'No')}
      </div>
    </section>

    ${extras.evidencia === false ? '' : `<section class="at-seccion">
      <h2>Imágenes de la infracción</h2>
      ${imgs.length ? `<div class="at-imagenes">${imgs.map((s) => `<img src="${s}" alt="" />`).join('')}</div>` : '<div class="at-valor">Sin imágenes</div>'}
    </section>`}

    <div class="at-firmas">
      <div class="at-firma">
        <div class="trazo">${i.firmaInspectorHash ? `<span class="digital">Firmado digitalmente · Código ${escapeHtml(String(i.firmaInspectorHash).slice(0, 16).toUpperCase())}</span>` : ''}</div>
        <div class="titulo">Firma del inspector</div>
        <div class="dato"><b>${v(i.inspectorNombre)}</b></div>
        <div class="dato">N° de Legajo: ${v(i.inspectorLegajo)}</div>
        <div class="dato">Dependencia: ${v(i.inspectorDependencia)}</div>
      </div>
      <div class="at-firma">
        <div class="trazo">${firmaInfractor}</div>
        <div class="titulo">Firma de la persona infractora</div>
        <div class="dato"><b>${v(juridica ? i.infractorRazonSocial : i.infractorNombre)}</b></div>
        <div class="dato">${juridica ? 'CUIT' : 'DNI'}: ${v(juridica ? i.infractorCuit : i.infractorDocumentoNumero)}</div>
      </div>
    </div>

    <p class="at-legal">La presente acta será elevada para su juzgamiento a la Dirección de Faltas de Malvinas Argentinas (Centro Cívico Los Polvorines, Remedios de Escalada 3345), donde podrá ofrecer descargo y ejercer su derecho de defensa en los términos de (30) días corridos contados a partir de la fecha de su confección. (Art. 72 bis Ley 24.449)</p>
  </div>`;
}

// ---------------------------------------------------------------------------
// Acta de contravención y de sustancias alimenticias: mismo estilo que el acta de tránsito, con los datos que
// se cargan en esas actas (sin licencia, alcoholemia ni ley de tránsito).
// ---------------------------------------------------------------------------
export function actaMunicipalHtml(i: Infraccion, extras: ActaExtras = {}): string {
  const sustancias = /sustancia/i.test(i.infraccionTipoNombre ?? '');
  const titulo = sustancias ? 'Acta de Infracción · Sustancias Alimenticias' : 'Acta de Contravención';
  const fecha = i.legajoFecha ? new Date(i.legajoFecha) : null;
  const fechaTxt = fecha && !isNaN(fecha.getTime())
    ? `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`
    : '';
  const juridica = Number(i.infractorPersonaTipo) === 1 || Boolean(i.infractorRazonSocial);
  const entreCalles = [i.entreCalle1, i.entreCalle2].filter(Boolean).join(' y ');
  const marca = (x: boolean) => `<i>${x ? 'X' : ''}</i>`;
  const articulos = i.leyesDetalle?.length
    ? i.leyesDetalle
    : (i.leyesNombre ?? []).map((k) => {
        const [nombre, art] = k.split(' · ');
        return { nombre, articulo: (art ?? '').replace(/^Art\.\s*/, ''), descripcion: '' };
      });
  const filasArt = articulos.length
    ? articulos.map((a) => `<tr><td>${v(String(a.articulo).replace(/^Art\.\s*/, ''))}</td><td>${v(a.descripcion)}</td><td>${v(a.nombre)}</td></tr>`).join('')
    : '<tr><td>-</td><td>-</td><td>-</td></tr>';
  const medidas = (i.medidasPreventivas ?? []).filter(Boolean);
  const conVehiculo = sustancias && Boolean(i.vehiculoNumeroDominio || i.vehiculoTipoNombre);
  const imgs = (extras.imagenes ?? []).filter(Boolean);
  const sit = i.situacionInfractor ?? 'presente';
  const firmaInfractor = /^data:image\/(png|jpe?g|svg\+xml);base64,[A-Za-z0-9+/=]{100,}/.test(i.firmaInfractor ?? '')
    ? `<img src="${i.firmaInfractor}" alt="Firma del infractor" />`
    : `<span class="digital">${sit === 'se_niega' ? 'Se negó a firmar' : sit === 'ausente' ? 'Infractor ausente' : sit === 'nn' ? 'Infractor no identificado (NN)' : ''}</span>`;

  return `
  <div class="acta-transito">
    <img src="/images/Municipio_malvinas_argentinas_logo.png" class="at-marca" alt="" />
    <header class="at-header">
      <div class="izq"><img src="/images/malvinas-logo-completo.png" alt="Malvinas Argentinas Municipio" /></div>
      <div class="centro">Dirección de<strong>Faltas</strong><div class="sep"></div>Municipalidad de<br/>Malvinas Argentinas</div>
      <div class="der"><img src="/images/escudo-municipalidad.png" alt="Municipalidad de Malvinas Argentinas" /></div>
    </header>

    <div class="at-titulo"><div><div class="num">Acta N° <b>${v(i.legajoNumeroActa)}</b></div><h1>${titulo}</h1></div>${bloqueQr(i)}</div>
    <div class="at-fecha">Fecha/Hora <b>${v(fechaTxt)}</b> · Legajo <b>${v(i.legajoNumber)}</b> · Año <b>${v(i.legajoAnio)}</b></div>

    <section class="at-seccion">
      <h2>Lugar de la infracción</h2>
      <div class="at-fila" style="grid-template-columns: 1.4fr .6fr 1fr 1.4fr 1.1fr">
        ${campo('Calle', i.domicilioInfraccionCalle)}
        ${campo('Número', i.domicilioInfraccionNumero)}
        ${campo('Ciudad', i.domicilioInfraccionLocalidadNombre)}
        ${campo('Entre calles', entreCalles)}
        <div class="at-ejido">
          <span class="at-check">${marca(i.ejido === 'dentro')} Dentro del ejido urbano</span>
          <span class="at-check">${marca(i.ejido === 'fuera')} Fuera del ejido urbano</span>
        </div>
      </div>
      ${i.nomenclaturaCatastral ? `<div class="at-fila at-c2">${campo('Nomenclatura catastral (Circ. / Secc. / Manz. / Parc.)', i.nomenclaturaCatastral)}<div></div></div>` : ''}
    </section>

    <section class="at-seccion">
      <h2>Datos de la persona infractora</h2>
      <div class="at-fila at-c3">
        ${juridica ? campo('Razón social', i.infractorRazonSocial || i.infractorNombre) : campo('Nombre', i.infractorNombre)}
        ${juridica ? campo('CUIT', i.infractorCuit || i.infractorDocumentoNumero) : campo(`Documento ${escapeHtml(i.infractorDocumentoTipoNombre || 'DNI')}`, i.infractorDocumentoNumero)}
        ${campo('Actividad / rubro', i.infractorActividadEconomica)}
      </div>
      <div class="at-fila at-c3">
        ${campo('Domicilio', [i.infractorDomicilio, i.infractorCalleAltura].filter(Boolean).join(' '))}
        ${campo('Localidad', i.infractorLocalidadNombre)}
        ${campo('Partido', i.infractorPartidoNombre)}
      </div>
    </section>

    ${conVehiculo ? `
    <section class="at-seccion">
      <h2>Vehículo de transporte</h2>
      <div class="at-fila at-c3">
        ${campo('Dominio', i.vehiculoNumeroDominio ? i.vehiculoNumeroDominio.toUpperCase() : 'No posee')}
        ${campo('Tipo', i.vehiculoTipoNombre)}
        ${campo('N° de control interno', i.vehiculoNumeroControlInterno)}
      </div>
    </section>` : ''}

    ${sustancias && i.sustanciasDescripcion ? `
    <section class="at-seccion">
      <h2>Sustancias alimenticias</h2>
      <div class="at-fila">${campo('Descripción (tipo, cantidad, estado, temperatura)', i.sustanciasDescripcion)}</div>
    </section>` : ''}

    <section class="at-seccion">
      <h2>Normas infringidas</h2>
      <table class="at-tabla">
        <thead><tr><th style="width:14%">Artículo</th><th style="width:52%">Descripción</th><th>Norma</th></tr></thead>
        <tbody>${filasArt}</tbody>
      </table>
      <div class="at-fila" style="margin-top:6px">${campo('Observación', i.observaciones)}</div>
      <div class="at-fila">${campo('Medidas preventivas', medidas.length ? medidas.join(' · ') : 'Ninguna')}</div>
    </section>

    ${extras.evidencia === false ? '' : `<section class="at-seccion">
      <h2>Imágenes de la infracción</h2>
      ${imgs.length ? `<div class="at-imagenes">${imgs.map((s) => `<img src="${s}" alt="" />`).join('')}</div>` : '<div class="at-valor">Sin imágenes</div>'}
    </section>`}

    <div class="at-firmas">
      <div class="at-firma">
        <div class="trazo">${i.firmaInspectorHash ? `<span class="digital">Firmado digitalmente · Código ${escapeHtml(String(i.firmaInspectorHash).slice(0, 16).toUpperCase())}</span>` : ''}</div>
        <div class="titulo">Firma del inspector</div>
        <div class="dato"><b>${v(i.inspectorNombre)}</b></div>
        <div class="dato">N° de Legajo: ${v(i.inspectorLegajo)}</div>
        <div class="dato">Dependencia: ${v(i.inspectorDependencia)}</div>
      </div>
      <div class="at-firma">
        <div class="trazo">${firmaInfractor}</div>
        <div class="titulo">Firma de la persona infractora</div>
        <div class="dato"><b>${v(juridica ? i.infractorRazonSocial : i.infractorNombre)}</b></div>
        <div class="dato">${juridica ? 'CUIT' : 'DNI'}: ${v(juridica ? i.infractorCuit : i.infractorDocumentoNumero)}</div>
      </div>
    </div>

    <p class="at-legal">La presente acta será elevada para su juzgamiento a la Dirección de Faltas de Malvinas Argentinas (Centro Cívico Los Polvorines, Remedios de Escalada 3345), donde podrá ofrecer descargo y ejercer su derecho de defensa en el plazo que fija la normativa vigente, contado a partir de su notificación.</p>
  </div>`;
}

/** Acta para imprimir según el tipo: tránsito usa el modelo de la Dirección; contravención y sustancias, el modelo municipal. */
export function actaHtmlPorTipo(i: Infraccion, extras: ActaExtras = {}): { html: string; css: string } {
  if ((i.infraccionTipoNombre ?? '') === 'multas' || /tr[aá]nsito/i.test(i.infraccionTipoNombre ?? '')) {
    return { html: actaTransitoHtml(i, extras), css: actaTransitoCss() };
  }
  return { html: actaMunicipalHtml(i, extras), css: actaTransitoCss() };
}

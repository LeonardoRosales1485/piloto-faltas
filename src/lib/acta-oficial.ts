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

function parseFechaHora(value?: string): {
  dia: string;
  mes: string;
  anio: string;
  hora: string;
  minutos: string;
} {
  if (!value) {
    return { dia: '', mes: '', anio: '', hora: '', minutos: '' };
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return { dia: '', mes: '', anio: '', hora: '', minutos: '' };
  }
  return {
    dia: pad(d.getDate()),
    mes: pad(d.getMonth() + 1),
    anio: String(d.getFullYear()),
    hora: pad(d.getHours()),
    minutos: pad(d.getMinutes()),
  };
}

export function actaOficialCss(): string {
  return `
    @page {
      margin: 0;
      size: A4;
    }
    .acta-oficial {
      position: relative;
      width: 198mm;
      min-height: 0;
      margin: 0 auto;
      padding: 6mm;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 7.9pt;
      line-height: 1.2;
      box-sizing: border-box;
    }
    .acta-oficial * { box-sizing: border-box; }

    .acta-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 165mm;
      height: 165mm;
      pointer-events: none;
      z-index: 0;
      object-fit: contain;
      mix-blend-mode: multiply;
      opacity: 0.35;
      filter: grayscale(1) sepia(1) hue-rotate(190deg) saturate(3) brightness(1.5);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .acta-header {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      margin-bottom: 4px;
      padding: 4px 6px;
    }
    .acta-brand {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
    }
    .acta-logo {
      width: 16mm;
      height: 18mm;
      flex-shrink: 0;
      object-fit: cover;
      object-position: top;
    }
    .acta-brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.05;
      color: #000;
    }
    .acta-brand-text .line-main {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .acta-brand-text .line-sub {
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      margin-top: 1px;
    }
    .acta-title-block {
      flex: 1;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
    }
    .acta-title-block .acta-label {
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000;
    }
    .acta-title-block .acta-acta-numero {
      font-size: 22pt;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 1px;
      color: #000;
    }
    .acta-title-block h1 {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      margin: 0;
      letter-spacing: 0.3px;
      color: #000;
    }
    .acta-right {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      min-width: 0;
    }
    .acta-laws {
      display: flex;
      flex-direction: column;
      text-align: right;
      line-height: 1.1;
      font-size: 6pt;
      color: #000;
    }
    .acta-laws strong {
      font-size: 9pt;
      font-weight: 700;
    }
    .acta-shield {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #1e3a8a;
    }
    .acta-shield svg {
      width: 100%;
      height: 100%;
    }

    .acta-section {
      position: relative;
      z-index: 1;
      border: 1px solid #000;
      margin-bottom: 3px;
      page-break-inside: avoid;
    }
    .acta-section-title {
      background: #4a4a4a;
      color: #fff;
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 2px 5px;
      border-bottom: 1px solid #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .acta-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }
    .acta-table td {
      border: 1px solid #000;
      padding: 2px 4px;
      vertical-align: top;
      height: 22px;
    }
    .acta-cell-wide { width: 50%; }
    .acta-cell-2 { width: 16.666%; }
    .acta-cell-3 { width: 25%; }
    .acta-cell-4 { width: 33.333%; }
    .acta-cell-5 { width: 41.666%; }
    .acta-cell-6 { width: 50%; }
    .acta-cell-7 { width: 58.333%; }
    .acta-cell-8 { width: 66.666%; }
    .acta-cell-9 { width: 75%; }
    .acta-cell-12 { width: 100%; }
    .acta-cell-40 { width: 40%; }
    .acta-cell-30 { width: 30%; }

    .acta-label {
      display: block;
      font-size: 5.5pt;
      text-transform: uppercase;
      color: #333;
      margin-bottom: 0;
      line-height: 1.05;
    }
    .acta-value {
      display: block;
      font-size: 7.5pt;
      font-weight: 600;
      line-height: 1.1;
      min-height: 9px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .text-uppercase { text-transform: uppercase; }

    .acta-check-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1px 8px;
      padding: 2px 0;
    }
    .acta-check-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1px 12px;
    }
    .acta-check {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 6pt;
      text-transform: uppercase;
    }
    .acta-check i {
      display: inline-block;
      width: 9px;
      height: 9px;
      border: 1px solid #000;
    }
    .acta-check.checked i {
      background: #000;
    }

    .acta-list {
      padding: 3px 4px;
      vertical-align: top;
    }
    .acta-list-item {
      display: flex;
      align-items: flex-start;
      gap: 3px;
      font-size: 7pt;
      margin-bottom: 0;
    }
    .acta-checkbox {
      width: 9px;
      height: 9px;
      border: 1px solid #000;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .acta-lines {
      min-height: 48px;
      vertical-align: top;
      padding: 2px 4px;
      font-size: 7pt;
      line-height: 12px;
      white-space: pre-wrap;
    }

    .acta-legal {
      position: relative;
      z-index: 1;
      margin: 3px 0;
      font-size: 6pt;
      text-transform: uppercase;
      text-align: justify;
      line-height: 1.15;
      color: #222;
    }

    .acta-signatures {
      position: relative;
      z-index: 1;
      display: flex;
      gap: 10px;
      margin-top: 6px;
    }
    .acta-signature-box {
      flex: 1;
      text-align: center;
    }
    .acta-signature-line {
      height: 22px;
      border-bottom: 1px solid #000;
      margin-bottom: 1px;
    }
    .acta-signature-label {
      font-size: 6pt;
      text-transform: uppercase;
      line-height: 1.05;
    }

    @media print {
      @page { margin: 5mm; }
      body { margin: 0; padding: 0; background: #fff; }
      .acta-oficial { width: 100%; padding: 0; }
    }
  `;
}

export function actaOficialHtml(infraccion: Infraccion): string {
  const fh = parseFechaHora(infraccion.legajoFecha);
  const leyes = Array.isArray(infraccion.leyesNombre) ? infraccion.leyesNombre : [];
  const m = (key: string) => escapeHtml(infraccion.metadata?.[key] || '');

  const vehiculoTipos = [
    'AUTOMÓVIL',
    'CAMIONETA',
    'MOTO',
    'ÓMNIBUS',
    'CAMIÓN',
    'TRAILER',
    'OTRO',
  ];

  const tipoVehiculo = (infraccion.vehiculoTipoNombre || '').toUpperCase();
  const checksVehiculo = vehiculoTipos
    .map((t) => {
      const checked = tipoVehiculo && t !== 'OTRO' && tipoVehiculo.includes(t === 'AUTOMÓVIL' ? 'AUTO' : t === 'CAMIONETA' ? 'CAMIONETA' : t);
      return `<span class="acta-check ${checked ? 'checked' : ''}"><i></i> ${t}</span>`;
    })
    .join('');

  const textoLeyes = leyes.join(' ').toLowerCase();
  const violaciones = [
    { key: 'alcohol', label: 'Alcohol en sangre (Art. 77 inc. M. Ley 24449)' },
    { key: 'velocidad', label: 'Exceso de velocidad (Art. 77 inc. N. Ley 24449)' },
    { key: 'semaforo', label: 'No respetar señalización de semáforo (Art. 77 inc. G. Ley 24449)' },
    { key: 'registro', label: 'Circular sin registro (Art. 77 inc. X. Ley 24449)' },
    { key: 'casco', label: 'Circular con moto sin casco (Art. 77 inc. S. Ley 24449)' },
    { key: 'contramano', label: 'Conducción a contramano (Art. 77 inc. W. Ley 24449)' },
    { key: 'seguro', label: 'Circular sin seguro obligatorio (Art. 77 inc. Y. Ley 24449)' },
  ];
  const mapCheck = (kw: string) => textoLeyes.includes(kw);
  const checksViolaciones = violaciones
    .map((v) => {
      const checked = mapCheck(v.key);
      return `<span class="acta-check ${checked ? 'checked' : ''}"><i></i> ${v.label}</span>`;
    })
    .join('');

  const violacionesList =
    leyes.length > 0
      ? leyes.map((l) => ({
          disp: l,
          ley: m('ley'),
          art: m('articulo'),
        }))
      : [{ disp: m('disposicionLegal'), ley: m('ley'), art: m('articulo') }];

  const celdaValores = (campo: 'disp' | 'ley' | 'art') =>
    violacionesList.map((v) => `<span class="acta-value">${escapeHtml(v[campo])}</span>`).join('');

  const retLicencia = infraccion.retencionDeLicencia === 1 ? 'SÍ' : 'NO';
  const retVehiculo = infraccion.retencionDeVehiculo === 1 ? 'SÍ' : 'NO';

  const colgroup10 = `<colgroup>${'<col />'.repeat(10)}</colgroup>`;

  return `
    <div class="acta-oficial">
      <img src="/images/logo.png" class="acta-watermark" alt="" />
      <header class="acta-header">
        <div class="acta-brand">
          <img src="/images/logo.png" class="acta-logo" alt="Logo Municipal" />
          <div class="acta-brand-text">
            <span class="line-main">Malvinas</span>
            <span class="line-main">Argentinas</span>
            <span class="line-main">Municipio</span>
            <span class="line-sub">El lugar de la familia</span>
          </div>
        </div>
        <div class="acta-title-block">
          <span class="acta-label">Acta N°</span>
          <span class="acta-acta-numero">${escapeHtml(infraccion.legajoNumeroActa || '')}</span>
          <h1>Acta de Infracción de Tránsito</h1>
        </div>
        <div class="acta-right">
          <div class="acta-laws">
            <span>Ley Nacional</span>
            <span>De Tránsito N°</span>
            <strong>24.449</strong>
            <span>Aderida por</span>
            <span>Ley Provincial 13.927</span>
          </div>
          <div class="acta-shield">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="#1e3a8a">
              <path d="M256 0c4.6 0 9.2 1 13.4 2.9L456.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0z"/>
            </svg>
          </div>
        </div>
      </header>

      <section class="acta-section">
        <div class="acta-section-title">Fecha, Hora y Autoridad</div>
        <table class="acta-table">
          <tr>
            <td><span class="acta-label">Día</span><span class="acta-value">${fh.dia}</span></td>
            <td><span class="acta-label">Mes</span><span class="acta-value">${fh.mes}</span></td>
            <td><span class="acta-label">Año</span><span class="acta-value">${fh.anio}</span></td>
            <td><span class="acta-label">Hora</span><span class="acta-value">${fh.hora}</span></td>
            <td><span class="acta-label">Minutos</span><span class="acta-value">${fh.minutos}</span></td>
            <td><span class="acta-label">Aut. Const.</span><span class="acta-value">&nbsp;</span></td>
            <td class="acta-cell-wide"><span class="acta-label">Ejido Urbano</span><span class="acta-value">&nbsp;</span></td>
          </tr>
        </table>
      </section>

      <section class="acta-section">
        <div class="acta-section-title">Lugar de la Infracción</div>
        <table class="acta-table">
          <tr>
            <td class="acta-cell-6"><span class="acta-label">Calle</span><span class="acta-value">${escapeHtml(infraccion.domicilioInfraccionCalle || '')}</span></td>
            <td class="acta-cell-2"><span class="acta-label">Número</span><span class="acta-value">${escapeHtml(infraccion.domicilioInfraccionNumero || '')}</span></td>
            <td class="acta-cell-4"><span class="acta-label">Sentido de Circulación</span><span class="acta-value">${m('sentidoCirculacion')}</span></td>
          </tr>
          <tr>
            <td class="acta-cell-4"><span class="acta-label">Intersección o Esquina</span><span class="acta-value">${m('interseccion')}</span></td>
            <td class="acta-cell-4"><span class="acta-label">Localidad</span><span class="acta-value">${escapeHtml(infraccion.domicilioInfraccionLocalidadNombre || infraccion.infractorLocalidadNombre || '')}</span></td>
            <td class="acta-cell-4"><span class="acta-label">Código Postal</span><span class="acta-value">${escapeHtml(infraccion.infractorCodigoPostal || '')}</span></td>
          </tr>
        </table>
      </section>

      <section class="acta-section">
        <div class="acta-section-title">Datos del Vehículo</div>
        <table class="acta-table">
          <tr>
            <td class="acta-cell-3"><span class="acta-label">Dominio</span><span class="acta-value text-uppercase">${escapeHtml(infraccion.vehiculoNumeroDominio || '')}</span></td>
            <td class="acta-cell-3"><span class="acta-label">Línea</span><span class="acta-value">${m('linea')}</span></td>
            <td class="acta-cell-3"><span class="acta-label">Interno</span><span class="acta-value">${escapeHtml(infraccion.vehiculoNumeroControlInterno || '')}</span></td>
            <td class="acta-cell-3"><span class="acta-label">Año</span><span class="acta-value">${m('anioVehiculo')}</span></td>
          </tr>
          <tr>
            <td class="acta-cell-4"><span class="acta-label">Marca</span><span class="acta-value">${m('marca')}</span></td>
            <td class="acta-cell-4"><span class="acta-label">Modelo</span><span class="acta-value">${m('modelo')}</span></td>
            <td class="acta-cell-4"><span class="acta-label">Linea</span><span class="acta-value text-uppercase"> </span></td>
            <td class="acta-cell-4"><span class="acta-label">Interno</span><span class="acta-value text-uppercase"> </span></td>
          </tr>
          <tr>
            <td class="acta-cell-3"><span class="acta-label">Licencia de Conducir N°</span><span class="acta-value">${escapeHtml(infraccion.vehiculoNumeroLicencia || '')}</span></td>
            <td class="acta-cell-3"><span class="acta-label">N° Control</span><span class="acta-value">${escapeHtml(infraccion.vehiculoNumeroControlInterno || '')}</span></td>
            <td class="acta-cell-3"><span class="acta-label">Categoría</span><span class="acta-value">${m('categoria')}</span></td>
            <td class="acta-cell-3"><span class="acta-label">Municipalidad Otorgante</span><span class="acta-value">${escapeHtml(infraccion.vehiculoMunicipalidadEmisora || '')}</span></td>
          </tr>
          <tr>
            <td class="acta-cell-12" colspan="4">
              <span class="acta-label">Tipo de Vehículo (marcar con una X)</span>
              <div class="acta-check-row">${checksVehiculo}</div>
            </td>
          </tr>
        </table>
      </section>

      <section class="acta-section">
        <div class="acta-section-title">Datos del Infractor</div>
        <table class="acta-table">
          <tr>
            <td class="acta-cell-6"><span class="acta-label">Apellido y Nombre / Razón Social</span><span class="acta-value">${escapeHtml(infraccion.infractorNombre || '')}</span></td>
            <td class="acta-cell-2"><span class="acta-label">Tipo</span><span class="acta-value">${escapeHtml((infraccion.infractorDocumentoTipoNombre || '').toUpperCase())}</span></td>
            <td class="acta-cell-4"><span class="acta-label">N° Documento</span><span class="acta-value">${escapeHtml(infraccion.infractorDocumentoNumero || '')}</span></td>
          </tr>
          <tr>
            <td class="acta-cell-5"><span class="acta-label">Domicilio</span><span class="acta-value">${escapeHtml(infraccion.infractorDomicilio || '')}</span></td>
            <td class="acta-cell-3"><span class="acta-label">Localidad</span><span class="acta-value">${escapeHtml(infraccion.infractorLocalidadNombre || '')}</span></td>
            <td class="acta-cell-2"><span class="acta-label">Código Postal</span><span class="acta-value">${escapeHtml(infraccion.infractorCodigoPostal || '')}</span></td>
          </tr>
          <tr>
            <td class="acta-cell-4"><span class="acta-label">Partido</span><span class="acta-value">${escapeHtml(infraccion.infractorPartidoNombre || '')}</span></td>
            <td class="acta-cell-4"><span class="acta-label">Licencia de Conducir N°</span><span class="acta-value">${escapeHtml(infraccion.vehiculoNumeroLicencia || '')}</span></td>
            <td class="acta-cell-4"><span class="acta-label">Provincia Otorgante</span><span class="acta-value">&nbsp;</span></td>
          </tr>
          <tr>
            <td class="acta-cell-4"><span class="acta-label">Municipalidad Otorgante</span><span class="acta-value">${escapeHtml(infraccion.infractorPartidoNombre || '')}</span></td>
            <td class="acta-cell-4"><span class="acta-label">Categoría licencia</span><span class="acta-value"></span></td>
            <td class="acta-cell-4"><span class="acta-label">N° de Control</span><span class="acta-value">&nbsp;</span></td>
          </tr>
          <tr>
            <td class="acta-cell-12" colspan="4">
              <div class="acta-check-row">
                <span class="acta-check"><i></i> Se dió a la fuga</span>
                <span class="acta-check"><i></i> Negó a identificarse</span>
                <span class="acta-check"><i></i> No identif. (NN)</span>
              </div>
            </td>
          </tr>
        </table>
      </section>

      <section class="acta-section">
        <div class="acta-section-title">Alcoholímetro</div>
        <table class="acta-table">
          <tr>
            <td class="acta-cell-3"><span class="acta-label">Equipo Marca</span><span class="acta-value">${m('alcoholimetroMarca')}</span></td>
            <td class="acta-cell-2"><span class="acta-label">Modelo</span><span class="acta-value">${m('alcoholimetroModelo')}</span></td>
            <td class="acta-cell-3"><span class="acta-label">N° Serie</span><span class="acta-value">${m('alcoholimetroSerie')}</span></td>
            <td class="acta-cell-2"><span class="acta-label">N° Medición</span><span class="acta-value">${m('alcoholimetroMedicion')}</span></td>
            <td class="acta-cell-2"><span class="acta-label">Fecha / Hora</span><span class="acta-value">${fh.dia}/${fh.mes}/${fh.anio} ${fh.hora}:${fh.minutos}</span></td>
            <td class="acta-cell-2"><span class="acta-label">Valor</span><span class="acta-value">${m('alcoholimetroValor')}</span></td>
          </tr>
        </table>
      </section>

      <section class="acta-section">
        <div class="acta-section-title">Hecho que configura la infracción y lugar</div>
        <table class="acta-table">
          <tr>
            <td class="acta-cell-7"><span class="acta-label">Disposición Legal Infringida</span>${celdaValores('disp')}</td>
            <td class="acta-cell-3"><span class="acta-label">Ley</span>${celdaValores('ley')}</td>
            <td class="acta-cell-2"><span class="acta-label">Art.</span>${celdaValores('art')}</td>
          </tr>
          <tr>
            <td class="acta-cell-12" colspan="3">
              <div class="acta-check-row acta-check-columns">${checksViolaciones}</div>
            </td>
          </tr>
        </table>
      </section>

      <section class="acta-section">
        <div class="acta-section-title">Descripción / Procedimientos / Testigos / Observaciones / Prueba Documental</div>
        <table class="acta-table">
          <tr>
            <td class="acta-cell-12 acta-lines">${escapeHtml(infraccion.observaciones || '')}</td>
          </tr>
        </table>
      </section>

      <section class="acta-section">
        <div class="acta-section-title">Información del Titular Dominial</div>
        <table class="acta-table">
          ${colgroup10}
          <tr>
            <td colspan="5"><span class="acta-label">Apellido y Nombre / Persona Jurídica</span><span class="acta-value">${m('titularDominialNombre')}</span></td>
            <td colspan="3"><span class="acta-label">Tipo</span><span class="acta-value">${m('titularDominialTipoDocumento')}</span></td>
            <td colspan="2"><span class="acta-label">N° Documento</span><span class="acta-value">${m('titularDominialDocumento')}</span></td>
          </tr>
          <tr>
            <td colspan="5"><span class="acta-label">Domicilio</span><span class="acta-value">${m('titularDominialDomicilio')}</span></td>
            <td colspan="5"><span class="acta-label">Localidad</span><span class="acta-value">${m('titularDominialLocalidad')}</span></td>
          </tr>
          <tr>
            <td colspan="4"><span class="acta-label">Código Postal</span><span class="acta-value">${m('titularDominialCodigoPostal')}</span></td>
            <td colspan="3"><span class="acta-label">Partido</span><span class="acta-value">${m('titularDominialPartido')}</span></td>
            <td colspan="3"><span class="acta-label">Apellido y Nombre del Testigo</span><span class="acta-value">${m('testigoNombre')}</span></td>
          </tr>
        </table>
      </section>

      <section class="acta-section">
        <div class="acta-section-title">Boleta de Citación del Inculpado</div>
        <table class="acta-table">
          ${colgroup10}
          <tr>
            <td colspan="4"><span class="acta-label">Número</span><span class="acta-value">${m('boletaNumero')}</span></td>
            <td colspan="3"><span class="acta-label">Fecha de Citación</span><span class="acta-value">${m('boletaFecha')}</span></td>
            <td colspan="3"><span class="acta-label">Lugar</span><span class="acta-value">${m('boletaLugar')}</span></td>
          </tr>
          <tr>
            <td colspan="5"><span class="acta-label">Retuvo Licencia</span><span class="acta-value">${retLicencia}</span></td>
            <td colspan="5"><span class="acta-label">Retuvo Vehículo</span><span class="acta-value">${retVehiculo}</span></td>
          </tr>
        </table>
      </section>

      <div class="acta-legal">
        <p>El presente acto infraccional es elevación a juicio de faltas, conforme lo establecido por las ordenanzas municipales vigentes. El inculpado podrá formular descargos en el juzgado de faltas, concurriendo con la documentación que acredite su identidad y domicilio real, en el término que establezca la normativa aplicable.</p>
      </div>

      <div class="acta-signatures">
        <div class="acta-signature-box">
          <div class="acta-signature-line"></div>
          <div class="acta-signature-label">Firma, Aclaración y Repartición del Agente de Comprobación</div>
        </div>
        <div class="acta-signature-box">
          <div class="acta-signature-line"></div>
          <div class="acta-signature-label">Firma del Presunto Infractor</div>
        </div>
      </div>
    </div>
  `;
}

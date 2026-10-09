'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { LoaderLogo } from './LoaderLogo';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { http } from '@/lib/api-client';
import { printActa, printTicket } from '@/lib/print';
import { ESTADOS_CAUSA, TIPOS_ACTA, estadoFinal, fechaCorta, fechaHora, infoEstado, pesos, puede, tipoActa } from '@/lib/dominio';
import { useAuthUser } from '@/lib/use-auth-user';
import type { Infraccion } from '@/lib/types';
import { RoadmapCausa } from './RoadmapCausa';
import { EstadoChip } from './EstadoChip';
import { ModalForm, type CampoModal } from './ModalForm';
import { useNotify } from './NotifyProvider';
import { Plazo } from './Plazo';

type R = Record<string, any>;
type Detalle = {
  acta: Infraccion; historial: R[]; documentos: R[]; presentaciones: R[]; boletas: R[]; notificaciones: R[]; imagenes: R[];
  valorizacion: { uf: number; unidades: number; multa: number; leyes: R[]; ajustado: number | null; motivoAjuste: string | null };
};
type Modal = { titulo: string; icono?: string; campos: CampoModal[]; accion: string; textoOk?: string; peligro?: boolean; aviso?: string; extra?: R } | null;

const TABS = [
  { id: 'resumen', t: 'Acta' },
  { id: 'historial', t: 'Historial' },
  { id: 'documentos', t: 'Escritos y documentos' },
  { id: 'presentaciones', t: 'Presentaciones' },
  { id: 'pagos', t: 'Boletas y pagos' },
  { id: 'notificaciones', t: 'Notificaciones' },
] as const;

const TIPO_PRES: Record<string, string> = { pago_voluntario: 'Pago voluntario', boleta: 'Boleta', cuotas: 'Plan de cuotas', descargo: 'Descargo', apelacion: 'Apelación' };
const ESTADO_DOC: Record<string, string> = { borrador: 'Borrador', en_revision: 'En revisión', devuelto: 'Devuelto', firmado: 'Firmado', definitivo: 'Definitivo' };
const ESTADO_BOL: Record<string, string> = { emitida: 'Emitida', a_verificar: 'A verificar', definitiva: 'Pagada (definitiva)', vencida: 'Vencida', anulada: 'Anulada' };

export function CausaDetalle() {
  const { uuid } = useParams() as { uuid: string };
  const router = useRouter();
  const notify = useNotify();
  const user = useAuthUser();
  const [d, setD] = useState<Detalle | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('resumen');
  const [modal, setModal] = useState<Modal>(null);
  const [plantillas, setPlantillas] = useState<R[]>([]);
  const [motivos, setMotivos] = useState<string[]>([]);

  const cargar = useCallback(() => {
    http.get<Detalle>(`/api/causa/${uuid}`).then(setD).catch((e: Error) => notify.error('No se pudo cargar la causa', e.message));
  }, [uuid, notify]);

  useEffect(() => {
    cargar();
    http.get<R[]>('/api/plantillas').then(setPlantillas).catch(() => undefined);
    http.get<R>('/api/constantes/all').then((c) => setMotivos((c.motivosArchivo ?? []).map((m: R) => m.nombre))).catch(() => undefined);
  }, [cargar]);

  async function accion(nombre: string, datos: R = {}, ok = 'Listo') {
    try {
      const r = await http.post<R>('/api/causa/accion', { uuid, accion: nombre, datos });
      notify.success(ok);
      setModal(null);
      cargar();
      return r;
    } catch (e) {
      notify.error('No se pudo completar', (e as Error).message);
      return null;
    }
  }

  const c = d?.acta;
  const estado = c?.estadoFaltas ?? '';
  const tipo = tipoActa(c?.infraccionTipoNombre);
  const gestion = puede(user?.rol, 'gestionarCausas');
  const final = estadoFinal(estado);
  const pendientes = (d?.presentaciones ?? []).filter((p) => p.estado === 'pendiente');
  const plantillasTipo = useMemo(() => plantillas.filter((p) => p.tipo_acta === 'todas' || p.tipo_acta === tipo), [plantillas, tipo]);
  const cuotasVencidas = (d?.boletas ?? []).some((b) => b.estado === 'emitida' && Number(b.vencimiento) < Date.now());

  if (!d || !c) {
    return <LoaderLogo texto="Cargando causa…" pantalla />;
  }

  const abrirEscrito = () =>
    setModal({
      titulo: 'Generar escrito desde plantilla', icono: 'fa-solid fa-file-circle-plus', accion: 'generar_escrito', textoOk: 'Generar y editar',
      aviso: 'El escrito se completa con los datos del acta. Después lo puede editar antes de dejarlo definitivo.',
      campos: [{ k: 'plantillaId', t: 'Plantilla', tipo: 'buscar', req: true, placeholder: 'Buscar por nombre, categoría, estado o texto (ej.: «compromiso pago», «fallo», «cuotas»)', ayuda: 'Se muestran las mejores coincidencias. Use ↑ ↓ y Enter para elegir.', opciones: plantillasTipo.map((p) => ({ v: String(p.id), t: p.titulo, sub: `${p.categoria}${p.estado_resultante ? ` · la causa pasa a «${p.estado_resultante}»` : ''}`, extra: `${p.codigo ?? ''} ${String(p.contenido_html ?? '').replace(/<[^>]+>/g, ' ').slice(0, 600)}` })) }],
    });

  const plantillaPorCodigo = (codigo: string) => plantillas.find((p) => p.codigo === codigo);
  const generarDesde = async (codigo: string) => {
    const pl = plantillaPorCodigo(codigo);
    if (!pl) return notify.error('Plantilla inexistente', codigo);
    const r = await accion('generar_escrito', { plantillaId: pl.id }, 'Escrito generado');
    if (r?.uuid) router.push(`/private/escrito/${r.uuid}`);
  };
  const tieneEscrito = (codigo: string) => d.documentos.some((x) => x.plantilla?.codigo === codigo);

  const botones: { t: string; i: string; on: () => void; ver: boolean; peligro?: boolean; destacado?: boolean }[] = [
    { t: 'Resolución de medida preventiva', i: 'fa-solid fa-gavel', ver: gestion && c.medidaVigente === 1 && !tieneEscrito('RESOLUCION_MEDIDA_PREVENTIVA') && !final, destacado: true, on: () => void generarDesde('RESOLUCION_MEDIDA_PREVENTIVA') },
    { t: 'Disposición de levantamiento', i: 'fa-solid fa-lock-open', ver: gestion && c.medidaVigente === 1 && !tieneEscrito('DISPOSICION_LEVANTAMIENTO'), on: () => void generarDesde('DISPOSICION_LEVANTAMIENTO') },
    { t: 'Dictar fallo', i: 'fa-solid fa-scale-balanced', ver: gestion && ['Descargo', 'Notificado', 'Cuotas', 'Esp. Acreditar Pago'].includes(estado) && !tieneEscrito('FALLO_CONDENATORIO') && !tieneEscrito('FALLO_ABSOLUTORIO'), on: () => setModal({ titulo: 'Dictar fallo', icono: 'fa-solid fa-scale-balanced', accion: 'generar_escrito', textoOk: 'Generar y editar', aviso: 'El fallo se genera desde plantilla, va a revisión y firma de la Directora y después se notifica.', campos: [{ k: 'plantillaId', t: 'Tipo de fallo', tipo: 'select', opciones: ['FALLO_CONDENATORIO', 'FALLO_ABSOLUTORIO'].map((cod) => plantillaPorCodigo(cod)).filter(Boolean).map((p) => ({ v: String(p!.id), t: p!.titulo })) }] }) },
    { t: 'Generar escrito', i: 'fa-solid fa-file-circle-plus', on: abrirEscrito, ver: puede(user?.rol, 'redactarEscritos') && !final, destacado: true },
    { t: 'Emitir boleta', i: 'fa-solid fa-receipt', ver: gestion && !final && !['Esp. Acreditar Pago', 'Cuotas', 'En Juzgado', 'En Apremios'].includes(estado), on: () => setModal({
      titulo: 'Emitir boleta (Malvinas 2000 simulado)', icono: 'fa-solid fa-receipt', accion: 'emitir_boleta', textoOk: 'Emitir',
      campos: [
        { k: 'modo', t: 'Tipo', tipo: 'select', opciones: [{ v: 'voluntario', t: 'Pago voluntario (50 %)' }, { v: 'total', t: 'Sin beneficio (100 %)' }, { v: 'cuotas', t: 'Plan de cuotas' }] },
        { k: 'cuotas', t: 'Cantidad de cuotas (solo plan de cuotas)', tipo: 'numero', valor: '3' },
        { k: 'aNombre', t: 'A nombre de (quien firma el compromiso)', tipo: 'texto', valor: String(c.infractorRazonSocial || c.infractorNombre || '') },
      ],
    }) },
    { t: 'Boleta de estadía', i: 'fa-solid fa-warehouse', ver: gestion && c.retencionDeVehiculo === 1 && !final, on: () => setModal({ titulo: 'Boleta de estadía', accion: 'emitir_estadia', icono: 'fa-solid fa-warehouse', aviso: 'Se cobra al retirar el vehículo. La fecha de ingreso al depósito la carga Faltas.', campos: [{ k: 'ingreso', t: 'Fecha de ingreso al depósito', tipo: 'fecha', req: true }], extra: { conv: 'ingreso' } }) },
    { t: 'Ajustar valorización', i: 'fa-solid fa-scale-unbalanced', ver: gestion && !final, on: () => setModal({ titulo: 'Ajustar valorización', accion: 'ajustar_monto', icono: 'fa-solid fa-scale-unbalanced', campos: [{ k: 'monto', t: 'Monto de la multa ($)', tipo: 'numero', req: true, valor: String(d.valorizacion.multa) }, { k: 'motivo', t: 'Motivo', tipo: 'area', req: true, ayuda: 'Por ejemplo: falta de exhibición de documentación acreditada luego.' }] }) },
    { t: 'Continuar procedimiento', i: 'fa-solid fa-forward', ver: gestion && estado === 'Cuotas' && cuotasVencidas, peligro: true, on: () => setModal({ titulo: 'Caducidad del plan de cuotas', accion: 'continuar_procedimiento', campos: [], aviso: 'Hay cuotas vencidas sin pagar. La causa sigue a fallo, o a Apremios si las cuotas eran de un fallo.', textoOk: 'Continuar' }) },
    { t: 'Derivar a Apremios', i: 'fa-solid fa-building-columns', ver: gestion && ['Fallo notificado', 'Cuotas'].includes(estado), on: () => setModal({ titulo: 'Derivar a Apremios', accion: 'derivar', extra: { destino: 'apremios' }, campos: [{ k: 'detalle', t: 'Detalle', tipo: 'area', valor: 'Vencido el plazo de 5 días hábiles sin pago ni apelación. Se remite el legajo completo en PDF.' }] }) },
    { t: 'Derivar a Juzgado de Paz', i: 'fa-solid fa-landmark', ver: gestion && estado === 'Fallo notificado', on: () => setModal({ titulo: 'Derivar al Juzgado de Paz', accion: 'derivar', extra: { destino: 'juzgado' }, campos: [{ k: 'detalle', t: 'Detalle', tipo: 'area', valor: 'Apelación concedida. Se remite el legajo completo en PDF.' }] }) },
    { t: 'Registrar resultado externo', i: 'fa-solid fa-flag-checkered', ver: gestion && infoEstado(estado).familia === 'externo', on: () => setModal({ titulo: 'Resultado informado por Juzgado de Paz o Apremios', accion: 'resultado_externo', campos: [{ k: 'estado', t: 'Resultado', tipo: 'select', opciones: ['Pago en Apremios', 'Archivo judicial', 'Archivo absolución', 'Archivo nulidad', 'Archivo prescripción'].map((x) => ({ v: x, t: x })) }, { k: 'detalle', t: 'Detalle', tipo: 'area' }] }) },
    { t: 'Presentación en mesa', i: 'fa-solid fa-person-walking', ver: gestion && !final, on: () => setModal({ titulo: 'Registrar presentación en mesa', accion: 'presentacion_mesa', campos: [{ k: 'tipo', t: 'Tipo', tipo: 'select', opciones: Object.entries(TIPO_PRES).map(([v, t]) => ({ v, t })) }, { k: 'texto', t: 'Detalle', tipo: 'area', req: true }, { k: 'cuotas', t: 'Cuotas solicitadas', tipo: 'numero' }] }) },
    { t: 'Adjuntar documento', i: 'fa-solid fa-paperclip', ver: puede(user?.rol, 'redactarEscritos'), on: () => setModal({ titulo: 'Adjuntar documento escaneado', accion: 'adjuntar', icono: 'fa-solid fa-paperclip', campos: [{ k: 'titulo', t: 'Título', tipo: 'texto', req: true }, { k: 'archivo', t: 'Archivo (imagen o PDF)', tipo: 'archivo', req: true }], extra: { conv: 'archivo' } }) },
    { t: 'Subsanar datos', i: 'fa-solid fa-pen-to-square', ver: gestion, on: () => setModal({ titulo: 'Subsanar datos del acta', accion: 'subsanar', aviso: 'El acta firmada no se modifica: se agrega una constancia al legajo.', campos: [{ k: 'detalle', t: 'Corrección', tipo: 'area', req: true, ayuda: 'Ej.: donde dice DNI 2899911 debe decir 28999111.' }] }) },
    { t: 'Nota a un área (espera respuesta)', i: 'fa-solid fa-hourglass-half', ver: gestion && !final && estado !== 'Espera respuesta', on: () => setModal({ titulo: 'Espera respuesta de un área', accion: 'espera_respuesta', campos: [{ k: 'detalle', t: 'Área y motivo', tipo: 'area', req: true }] }) },
    { t: 'Cambiar estado', i: 'fa-solid fa-arrows-rotate', ver: puede(user?.rol, 'cambiarEstadoManual'), on: () => setModal({ titulo: 'Cambiar estado manualmente', accion: 'cambiar_estado', campos: [{ k: 'estado', t: 'Nuevo estado', tipo: 'select', opciones: ESTADOS_CAUSA.map((e) => ({ v: e.nombre, t: e.nombre })) }, { k: 'motivo', t: 'Motivo', tipo: 'area', req: true }] }) },
    { t: 'Archivar', i: 'fa-solid fa-box-archive', ver: gestion && !final, on: () => setModal({ titulo: 'Archivar causa', accion: 'archivar', campos: [{ k: 'motivo', t: 'Tipo de archivo', tipo: 'select', opciones: motivos.map((m) => ({ v: m, t: m })) }, { k: 'detalle', t: 'Detalle', tipo: 'area' }], aviso: c.medidaVigente === 1 ? 'La causa tiene una medida vigente: el archivo por pago no procede hasta su levantamiento.' : undefined }) },
    { t: 'Reingresar', i: 'fa-solid fa-rotate-left', ver: gestion && final, on: () => setModal({ titulo: 'Reingresar causa archivada', accion: 'reingresar', campos: [{ k: 'motivo', t: 'Motivo', tipo: 'area', req: true }] }) },
    { t: 'Desestimar', i: 'fa-solid fa-ban', ver: gestion && !final, peligro: true, on: () => setModal({ titulo: 'Desestimar causa', accion: 'desestimar', peligro: true, textoOk: 'Desestimar', aviso: 'La causa se cierra sin eliminarse: queda el registro completo.', campos: [{ k: 'motivo', t: 'Motivo', tipo: 'area', req: true }] }) },
  ];

  async function confirmarModal(v: Record<string, string>) {
    if (!modal) return;
    const datos: R = { ...v, ...(modal.extra ?? {}) };
    if (modal.extra?.conv === 'archivo') { datos.archivoRaw = v.archivo; datos.archivoNombre = v.archivoNombre; }
    if (modal.extra?.conv === 'ingreso') datos.ingresoAt = new Date(`${v.ingreso}T12:00`).getTime();
    if (modal.accion === 'generar_escrito') {
      const r = await accion('generar_escrito', { plantillaId: Number(v.plantillaId) }, 'Escrito generado');
      if (r?.uuid) router.push(`/private/escrito/${r.uuid}`);
      return;
    }
    await accion(modal.accion, datos);
  }

  return (
    <div className="pagina">
      <RoadmapCausa estado={estado} historial={d.historial} medidaVigente={c.medidaVigente === 1} />
      <div className="card-step mb-3">
        <div className="causa-cabecera">
          <h1>{c.legajoNumeroActa}</h1>
          <EstadoChip estado={estado} medida={c.medidaVigente === 1} />
          <Plazo vence={c.vencePlazoAt} />
          <span className="sub">
            {TIPOS_ACTA[tipo].titulo} · Legajo {c.legajoNumber}/{c.legajoAnio} · {c.infractorRazonSocial || c.infractorNombre || 'NN'} · En el portal se ve como «{infoEstado(estado).portal}»
          </span>
        </div>
        <div className="tabs-causa" role="tablist">
          {TABS.map((t) => {
            const n = t.id === 'historial' ? d.historial.length : t.id === 'documentos' ? d.documentos.length : t.id === 'presentaciones' ? d.presentaciones.length : t.id === 'pagos' ? d.boletas.length : t.id === 'notificaciones' ? d.notificaciones.length : 0;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`tab-causa ${tab === t.id ? 'activa' : ''}`} onClick={() => setTab(t.id)}>
                {t.t} {n ? <span className="n">{n}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="causa-layout">
        <div className="card-step">
          <div className="card-step-body">
            {pendientes.length ? (
              <div className="aviso aviso-alerta">
                <i className="fa-solid fa-inbox" aria-hidden="true" /> {pendientes.length} presentación(es) pendiente(s): {pendientes.map((p) => TIPO_PRES[p.tipo]).join(', ')}. <Link href="/private/presentaciones">Ir a la bandeja</Link>
              </div>
            ) : null}

            {tab === 'resumen' ? (
              <>
                <dl className="ficha">
                  <div><dt>Fecha y hora</dt><dd>{String(c.legajoFecha ?? '').replace('T', ' ')}</dd></div>
                  <div><dt>Lugar</dt><dd>{[[c.domicilioInfraccionCalle, c.domicilioInfraccionNumero].filter(Boolean).join(' ') + (c.entreCalle1 ? ` (entre ${c.entreCalle1} y ${c.entreCalle2 ?? ''})` : ''), c.domicilioInfraccionLocalidadNombre].filter(Boolean).join(' · ')}</dd></div>
                  <div><dt>Ejido</dt><dd>{c.ejido === 'dentro' ? 'Dentro del ejido urbano' : c.ejido === 'fuera' ? 'Fuera del ejido urbano' : '-'}{c.gpsLat ? ` · GPS ${c.gpsLat}, ${c.gpsLng}` : ''}</dd></div>
                  <div><dt>Infractor</dt><dd>{c.situacionInfractor === 'nn' ? 'No identificado (NN)' : `${c.infractorRazonSocial || c.infractorNombre || '-'} · ${c.infractorCuit ? `CUIT ${c.infractorCuit}` : `${c.infractorDocumentoTipoNombre ?? ''} ${c.infractorDocumentoNumero ?? ''}`}`}</dd></div>
                  <div><dt>Domicilio</dt><dd>{[[c.infractorDomicilio, c.infractorCalleAltura, c.infractorDepartamento].filter(Boolean).join(' '), c.infractorLocalidadNombre, c.infractorPartidoNombre].filter(Boolean).join(' · ') || '-'}</dd></div>
                  <div><dt>Contacto</dt><dd>{c.infractorEmail || '-'}</dd></div>
                  {tipo !== 'contravenciones' ? <div><dt>Vehículo</dt><dd>{c.vehiculoNumeroDominio || '-'} {c.vehiculoTipoNombre ?? ''} {c.vehiculoNumeroLicencia ? `· Lic. ${c.vehiculoNumeroLicencia}` : ''}</dd></div> : null}
                  {c.sustanciasDescripcion ? <div><dt>Sustancias</dt><dd>{c.sustanciasDescripcion}</dd></div> : null}
                  <div><dt>Medidas</dt><dd>{[c.retencionDeLicencia ? 'Retención de licencia' : '', c.retencionDeVehiculo ? 'Retención de vehículo' : '', c.acarreo ? 'Acarreo' : '', ...(c.medidasPreventivas ?? [])].filter(Boolean).join(' · ') || 'Ninguna'}{c.medidaVigente === 1 ? ' (vigente)' : ''}</dd></div>
                  {c.metadata?.alcoholemia ? <div><dt>Alcoholemia</dt><dd>{c.metadata.alcoholemia}{c.metadata.alcoholimetroValor ? ` · ${c.metadata.alcoholimetroValor} g/l` : ''}</dd></div> : null}
                  <div><dt>Inspector</dt><dd>{c.inspectorNombre || '-'} · firmó {fechaHora(c.firmadaAt ?? undefined)}</dd></div>
                  <div><dt>Situación del infractor</dt><dd>{c.situacionInfractor}</dd></div>
                  <div><dt>Notificada</dt><dd>{c.notificadaAt ? fechaHora(c.notificadaAt) : 'Todavía no'}</dd></div>
                  <div><dt>Observaciones</dt><dd>{c.observaciones || '-'}</dd></div>
                </dl>
                <h3 className="subtitulo-paso mt-3">Artículos y valorización</h3>
                <div className="table-responsive">
                  <table className="table custom-table align-middle">
                    <thead><tr><th>Norma</th><th>Artículo</th><th>Descripción</th><th className="text-end">Unidades</th></tr></thead>
                    <tbody>
                      {d.valorizacion.leyes.map((l) => <tr key={`${l.nombre}-${l.articulo}`}><td>{l.nombre}</td><td>{l.articulo}</td><td>{l.descripcion}</td><td className="text-end">{l.multiplicador}</td></tr>)}
                      <tr><td colSpan={3} className="text-end fw-semibold">{d.valorizacion.unidades} UF × {pesos(d.valorizacion.uf)}{d.valorizacion.ajustado != null ? ` · ajustado: ${d.valorizacion.motivoAjuste}` : ''}</td><td className="text-end fw-bold">{pesos(d.valorizacion.multa)}</td></tr>
                    </tbody>
                  </table>
                </div>
                {d.imagenes.length ? (
                  <div className="d-flex gap-2 flex-wrap mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {d.imagenes.map((i) => <img key={i.uuid} src={i.preview_raw} alt="Imagen del acta" style={{ height: 96, borderRadius: 8 }} />)}
                  </div>
                ) : null}
                {c.firmaInfractor ? (
                  <div className="mt-2"><span className="texto-ayuda">Firma del infractor:</span><br />{/* eslint-disable-next-line @next/next/no-img-element */}<img src={c.firmaInfractor} alt="Firma del infractor" style={{ height: 70, background: '#fff', borderRadius: 6 }} /></div>
                ) : null}
                <div className="botonera">
                  <button type="button" className="btn btn-outline-primary" onClick={() => printActa(c)}><i className="fa-solid fa-file-pdf" aria-hidden="true" /> Ver acta (PDF)</button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => void printTicket(c)}><i className="fa-solid fa-print" aria-hidden="true" /> Ticket</button>
                  <a className="btn btn-outline-secondary" href={`/imprimir/legajo/${uuid}`} target="_blank" rel="noreferrer"><i className="fa-solid fa-book" aria-hidden="true" /> Legajo completo (PDF)</a>
                </div>
              </>
            ) : null}

            {tab === 'historial' ? (
              <ul className="timeline">
                {d.historial.map((h) => (
                  <li key={h.id}>
                    <div className="t-fecha">{fechaHora(h.fecha)} · {h.usuario}</div>
                    <div className="t-accion">{h.accion} {h.estado_nuevo ? <span className="texto-ayuda">({h.estado_anterior ?? '-'} → {h.estado_nuevo})</span> : null}</div>
                    {h.detalle ? <div className="t-detalle">{h.detalle}</div> : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {tab === 'documentos' ? (
              <ul className="lista-items">
                {d.documentos.map((doc) => (
                  <li key={doc.uuid}>
                    <div>
                      <div className="li-titulo"><i className={`fa-solid ${doc.tipo === 'adjunto' ? 'fa-paperclip' : 'fa-file-lines'} me-1`} aria-hidden="true" /> {doc.titulo}{doc.numero ? ` N° ${doc.numero}` : ''}</div>
                      <div className="li-sub">{ESTADO_DOC[doc.estado] ?? doc.estado} · {doc.creado_por} · {fechaHora(doc.date_created)}{doc.firmado_por ? ` · firmado por ${doc.firmado_por}` : ''}{doc.observacion ? ` · Observación: ${doc.observacion}` : ''}</div>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
                      {doc.tipo === 'escrito' ? <Link className="btn btn-sm btn-outline-primary" href={`/private/escrito/${doc.uuid}`}>{['borrador', 'devuelto'].includes(doc.estado) ? 'Editar' : 'Ver'}</Link> : <a className="btn btn-sm btn-outline-primary" href={`/private/escrito/${doc.uuid}`}>Ver</a>}
                      {doc.tipo === 'escrito' && ['firmado', 'definitivo'].includes(doc.estado) && ['Fallo', 'Resolución', 'Disposición'].includes(doc.plantilla?.categoria) && gestion && !d.notificaciones.some((n) => n.documento_id === doc.id) ? (
                        <button type="button" className="btn btn-sm btn-success" onClick={() => void accion('notificar_documento', { documentoUuid: doc.uuid }, 'Notificación iniciada')}>Notificar</button>
                      ) : null}
                    </div>
                  </li>
                ))}
                {!d.documentos.length ? <li><span className="texto-ayuda">Todavía no hay escritos ni adjuntos.</span></li> : null}
              </ul>
            ) : null}

            {tab === 'presentaciones' ? (
              <ul className="lista-items">
                {d.presentaciones.map((p) => (
                  <li key={p.uuid}>
                    <div>
                      <div className="li-titulo">{TIPO_PRES[p.tipo]}{p.reenvio_de ? ' (reenvío)' : ''} · {p.origen === 'mesa' ? 'Mesa de entradas' : 'Portal'}</div>
                      <div className="li-sub">{fechaHora(p.date_created)} · {p.estado}{p.cuotas_solicitadas ? ` · ${p.cuotas_solicitadas} cuotas pedidas` : ''}{p.respuesta ? ` · Respuesta: ${p.respuesta}` : ''}</div>
                      {p.texto ? <div className="li-sub">«{p.texto}»</div> : null}
                    </div>
                    {p.estado === 'pendiente' ? <Link className="btn btn-sm btn-primary" href="/private/presentaciones">Resolver</Link> : null}
                  </li>
                ))}
                {!d.presentaciones.length ? <li><span className="texto-ayuda">Sin presentaciones.</span></li> : null}
              </ul>
            ) : null}

            {tab === 'pagos' ? (
              <ul className="lista-items">
                {d.boletas.map((b) => (
                  <li key={b.uuid}>
                    <div>
                      <div className="li-titulo">{b.numero} · {b.concepto}</div>
                      <div className="li-sub">{pesos(Number(b.monto))} · vence {fechaCorta(b.vencimiento)} · a nombre de {b.a_nombre_de} · <strong>{ESTADO_BOL[b.estado] ?? b.estado}</strong>{b.confirmado_por ? ` por ${b.confirmado_por}` : ''}</div>
                    </div>
                    <div className="d-flex gap-2">
                      {b.estado === 'emitida' && gestion ? <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void accion('informar_pago', { boletaUuid: b.uuid }, 'Pago informado')}>Informar pago</button> : null}
                      {b.estado === 'a_verificar' && puede(user?.rol, 'confirmarPagos') ? <button type="button" className="btn btn-sm btn-success" onClick={() => void accion('confirmar_pago', { boletaUuid: b.uuid }, 'Pago acreditado')}>Confirmar acreditación</button> : null}
                    </div>
                  </li>
                ))}
                {!d.boletas.length ? <li><span className="texto-ayuda">Sin boletas emitidas.</span></li> : null}
              </ul>
            ) : null}

            {tab === 'notificaciones' ? (
              <ul className="lista-items">
                {d.notificaciones.map((n) => (
                  <li key={n.uuid}>
                    <div>
                      <div className="li-titulo">{n.objeto === 'acta' ? 'Acta' : n.objeto} · {n.via === 'portal' ? 'Acceso al portal' : n.via === 'electronica' ? 'Domicilio electrónico (DD.JJ.)' : n.via}</div>
                      <div className="li-sub">{n.estado === 'positiva' ? `Notificada el ${fechaHora(n.fecha_resultado)}` : 'Pendiente: se notifica cuando el infractor abra el documento en el portal'}</div>
                    </div>
                  </li>
                ))}
                {!d.notificaciones.length ? <li><span className="texto-ayuda">El acta todavía no fue notificada. Se notifica cuando el infractor la abre en el portal, o por correo si constituyó domicilio electrónico.</span></li> : null}
              </ul>
            ) : null}
          </div>
        </div>

        <aside className="panel-acciones">
          <div className="card-step">
            <div className="card-step-header"><h2>Acciones</h2><p>Según el estado y su rol</p></div>
            <div className="card-step-body acciones-lista">
              {botones.filter((b) => b.ver).map((b) => (
                <button key={b.t} type="button" className={`btn ${b.destacado ? 'btn-primary' : b.peligro ? 'btn-outline-danger' : 'btn-outline-secondary'} btn-accion-causa`} onClick={b.on}>
                  <i className={b.i} aria-hidden="true" /> {b.t}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {modal ? <ModalForm titulo={modal.titulo} icono={modal.icono} campos={modal.campos} textoOk={modal.textoOk} peligro={modal.peligro} aviso={modal.aviso} onCancel={() => setModal(null)} onOk={confirmarModal} /> : null}
    </div>
  );
}

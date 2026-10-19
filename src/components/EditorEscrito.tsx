'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { LoaderLogo } from './LoaderLogo';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken } from '@/lib/auth-client';
import { http } from '@/lib/api-client';
import { aplicarValores, camposCompletar, mostrarDocumento, RE_COMPLETAR, restaurarDocumento } from '@/lib/campos';
import { fechaHora, puede } from '@/lib/dominio';
import { firmaHtml, PIE_INSTITUCIONAL } from '@/lib/membrete';
import { useAuthUser } from '@/lib/use-auth-user';
import { HojasPaginadas, sinSaltos } from './HojasPaginadas';
import { ModalForm } from './ModalForm';
import { useNotify } from './NotifyProvider';

type R = Record<string, any>;

/** Ancho del campo en la hoja: crece con lo que se escribe (mínimo el nombre del campo). */
function anchoCampo(label: string, valor: string, tipo: string) {
  if (tipo === 'date') return 14;
  const extra = tipo === 'number' ? 4 : 2;
  return Math.max(6, Math.min(60, Math.ceil((valor ? valor.length : label.length) * 1.15) + extra));
}

const HERRAMIENTAS: { cmd: string; i: string; t: string; arg?: string }[] = [
  { cmd: 'bold', i: 'fa-bold', t: 'Negrita' },
  { cmd: 'italic', i: 'fa-italic', t: 'Cursiva' },
  { cmd: 'underline', i: 'fa-underline', t: 'Subrayado' },
  { cmd: 'justifyLeft', i: 'fa-align-left', t: 'Alinear a la izquierda' },
  { cmd: 'justifyCenter', i: 'fa-align-center', t: 'Centrar' },
  { cmd: 'justifyRight', i: 'fa-align-right', t: 'Alinear a la derecha' },
  { cmd: 'justifyFull', i: 'fa-align-justify', t: 'Justificar' },
  { cmd: 'insertUnorderedList', i: 'fa-list-ul', t: 'Lista' },
  { cmd: 'insertOrderedList', i: 'fa-list-ol', t: 'Lista numerada' },
  { cmd: 'undo', i: 'fa-rotate-left', t: 'Deshacer' },
  { cmd: 'redo', i: 'fa-rotate-right', t: 'Rehacer' },
];

const ESTADO: Record<string, string> = { borrador: 'Borrador', en_revision: 'En revisión de la Directora', devuelto: 'Devuelto con observación', firmado: 'Firmado digitalmente', definitivo: 'Definitivo' };

/** Edición del escrito en el sistema, sobre una hoja A4 con el formato oficial (SF-32 a SF-40). */
export function EditorEscrito() {
  const { uuid } = useParams() as { uuid: string };
  const notify = useNotify();
  const user = useAuthUser();
  const ref = useRef<HTMLDivElement>(null);
  const [d, setD] = useState<{ documento: R; causa: R } | null>(null);
  const [cambios, setCambios] = useState(false);
  const [devolver, setDevolver] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [modo, setModo] = useState<'campos' | 'libre'>('campos');
  const [confirmarLibre, setConfirmarLibre] = useState(false);
  // Campo con foco (panel u hoja): se resalta su par en el otro lado.
  const [activo, setActivo] = useState<string | null>(null);
  const base = useRef('');

  const cargar = useCallback(() => {
    http.get<{ documento: R; causa: R }>(`/api/documento/${uuid}`).then((r) => {
      let v: Record<string, string> = {};
      try { v = JSON.parse(r.documento.valores_json ?? '{}'); } catch { v = {}; }
      base.current = r.documento.contenido_html ?? '';
      setValores(v);
      setModo(r.documento.modo_edicion === 'libre' ? 'libre' : 'campos');
      setD(r);
      setCambios(false);
    }).catch((e: Error) => notify.error('No se pudo abrir', e.message));
  }, [uuid, notify]);

  useEffect(cargar, [cargar]);

  const docEstado = d?.documento?.estado;
  const puedeEditar = Boolean(d) && d!.documento.tipo === 'escrito' && (['borrador', 'devuelto'].includes(docEstado) || (docEstado === 'en_revision' && puede(user?.rol, 'firmar'))) && puede(user?.rol, 'redactarEscritos');

  // Pinta la hoja: en modo «campos» el texto queda fijo y cada dato es un input (precargado o vacío); en «libre» se edita todo.
  useEffect(() => {
    const el = ref.current;
    if (!el || !d) return;
    if (!puedeEditar) { el.innerHTML = mostrarDocumento(base.current, 'chip'); return; }
    if (modo === 'libre') { el.innerHTML = mostrarDocumento(aplicarValores(base.current, valores), 'chip'); return; }
    let i = 0;
    const precargadosIni = new Set(String(valores._precargados ?? '').split(',').filter(Boolean));
    el.innerHTML = mostrarDocumento(base.current, 'chip').replace(RE_COMPLETAR, (_m, label: string, tipo?: string) => {
      i += 1;
      const k = `c${i}`;
      const t = tipo === 'fecha' ? 'date' : tipo === 'numero' || tipo === 'moneda' ? 'number' : 'text';
      const lab = String(label).replace(/"/g, '&quot;');
      const val = String(valores[k] ?? '').replace(/"/g, '&quot;');
      return `<input class="campo-completar${val ? '' : ' vacio'}${precargadosIni.has(k) ? ' precargado' : ''}" data-k="${k}" type="${t}" ${tipo === 'moneda' ? 'step="0.01"' : ''} placeholder="${lab}" title="${lab}" aria-label="${lab}" value="${val}" style="width:${anchoCampo(String(label), String(valores[k] ?? ''), t)}ch"/>`;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, modo, puedeEditar]);

  // Resalta en la hoja el campo que se edita en el panel (y lleva la hoja hasta él).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll('input.campo-completar.resaltado').forEach((x) => x.classList.remove('resaltado'));
    if (!activo) return;
    const inp = el.querySelector<HTMLInputElement>(`input[data-k="${activo}"]`);
    if (!inp) return;
    inp.classList.add('resaltado');
    if (document.activeElement !== inp) inp.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activo]);

  function onCampo(e: React.FormEvent<HTMLDivElement>) {
    const t = e.target as HTMLInputElement;
    if (modo === 'campos' && t.dataset?.k) {
      t.classList.toggle('vacio', !t.value);
      t.style.width = `${anchoCampo(t.placeholder, t.value, t.type)}ch`;
      setValores((p) => ({ ...p, [t.dataset.k!]: t.value }));
    }
    setCambios(true);
  }

  function setCampoPanel(k: string, v: string) {
    setValores((p) => ({ ...p, [k]: v }));
    const inp = ref.current?.querySelector<HTMLInputElement>(`input[data-k="${k}"]`);
    if (inp) { inp.value = v; inp.classList.toggle('vacio', !v); inp.style.width = `${anchoCampo(inp.placeholder, v, inp.type)}ch`; }
    setCambios(true);
  }

  if (!d) return <LoaderLogo texto="Cargando escrito…" pantalla />;

  const doc = d.documento;
  const esDirectora = puede(user?.rol, 'firmar');
  const editable = puedeEditar;
  const campos = modo === 'campos' && editable ? camposCompletar(base.current) : [];
  const pendientes = campos.filter((c) => !(valores[c.k] ?? '').trim()).length;
  const precargados = new Set(String(valores._precargados ?? '').split(',').filter(Boolean));
  const payload = () => (modo === 'libre' ? { modo, valores, html: restaurarDocumento(sinSaltos(ref.current?.innerHTML ?? '')) } : { modo, valores });
  const requiereRevision = Number(doc.plantilla?.requiere_revision ?? 0) === 1;
  // PDF y Word salen de lo guardado (QA CONT-6): se bloquean con cambios sin guardar y, en un borrador con campos
  // a completar, hasta que se guarde al menos una vez (valores_json se escribe recién al guardar).
  const nuncaGuardado = ['borrador', 'devuelto'].includes(doc.estado) && doc.valores_json == null && camposCompletar(base.current).length > 0;
  const sinGuardar = cambios || nuncaGuardado;

  async function enviar(accion: 'guardar' | 'revision' | 'definitivo') {
    setTrabajando(true);
    try {
      const r = await http.post<R>('/api/documento/guardar', { uuid, accion, ...payload() });
      notify.success(accion === 'guardar' ? 'Escrito guardado' : accion === 'revision' ? 'Enviado a la bandeja de la Directora' : `Escrito definitivo${r.numero ? ` N° ${r.numero}` : ''}`);
      cargar();
    } catch (e) {
      notify.error('No se pudo guardar', (e as Error).message);
    } finally {
      setTrabajando(false);
    }
  }

  async function revisar(accion: 'firmar' | 'devolver', observacion?: string) {
    setTrabajando(true);
    try {
      const r = await http.post<R>('/api/documento/revisar', { uuid, accion, observacion, ...(editable ? payload() : {}) });
      notify.success(accion === 'firmar' ? `Firmado digitalmente${r.numero ? ` · N° ${r.numero}` : ''}` : 'Devuelto al agente');
      setDevolver(false);
      cargar();
    } catch (e) {
      notify.error('No se pudo completar', (e as Error).message);
    } finally {
      setTrabajando(false);
    }
  }

  async function descargarDocx() {
    const res = await fetch(`/api/documento/${uuid}/docx`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return notify.error('No se pudo generar el DOCX');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${doc.titulo}${doc.numero ? ` ${doc.numero}` : ''}.docx`;
    a.click();
    notify.info('Word descargado', 'Ábralo con Word, LibreOffice o Google Docs. Para solo verlo o imprimirlo, use «PDF».');
  }

  if (doc.tipo === 'adjunto') {
    return (
      <div className="pagina">
        <div className="card-step">
          <div className="card-step-header"><h2>{doc.titulo}</h2><p>Adjunto de la causa <Link href={`/private/causa/${d.causa.uuid}`}>{d.causa.legajo_numero_acta}</Link> · {doc.creado_por} · {fechaHora(doc.date_created)}</p></div>
          <div className="card-step-body">
            {String(doc.archivo_raw ?? '').startsWith('data:image') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doc.archivo_raw} alt={doc.titulo} style={{ maxWidth: '100%' }} />
            ) : (
              <a className="btn btn-primary" href={doc.archivo_raw} download={doc.archivo_nombre}>Descargar {doc.archivo_nombre}</a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pagina">
      <div className="card-step mb-3">
        <div className="causa-cabecera">
          <h1>{doc.titulo}{doc.numero ? ` N° ${doc.numero}` : ''}</h1>
          <span className={`estado-chip ${['firmado', 'definitivo'].includes(doc.estado) ? 'estado-archivo' : doc.estado === 'devuelto' ? 'estado-medida' : 'estado-presentacion'}`}>{ESTADO[doc.estado] ?? doc.estado}</span>
          <span className="sub">
            Causa <Link href={`/private/causa/${d.causa.uuid}`}>{d.causa.legajo_numero_acta}</Link> · {d.causa.infractor_nombre} · {doc.plantilla?.categoria ?? 'Escrito'}
            {doc.plantilla?.estado_resultante ? ` · Al quedar definitivo, la causa pasa a «${doc.plantilla.estado_resultante}»` : ' · No cambia el estado de la causa'}
          </span>
        </div>
        {doc.observacion && doc.estado === 'devuelto' ? <div className="px-3 pb-3"><div className="aviso aviso-alerta mb-0"><strong>Observación de la Directora:</strong> {doc.observacion}</div></div> : null}
      </div>

      <div className="botonera mb-3 no-print">
        {editable ? (
          <>
            <button type="button" className="btn btn-outline-primary" disabled={trabajando} onClick={() => void enviar('guardar')}><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Guardar{cambios ? ' *' : ''}</button>
            {requiereRevision && !esDirectora ? <button type="button" className="btn btn-primary" disabled={trabajando} onClick={() => void enviar('revision')}><i className="fa-solid fa-paper-plane" aria-hidden="true" /> Enviar a revisión</button> : null}
            {!requiereRevision ? <button type="button" className="btn btn-success" disabled={trabajando} onClick={() => void enviar('definitivo')}><i className="fa-solid fa-check" aria-hidden="true" /> Dejar definitivo</button> : null}
          </>
        ) : null}
        {esDirectora && ['en_revision', 'borrador', 'devuelto'].includes(doc.estado) ? (
          <>
            <button type="button" className="btn btn-success" disabled={trabajando} onClick={() => void revisar('firmar')}><i className="fa-solid fa-signature" aria-hidden="true" /> Firmar digitalmente</button>
            {doc.estado === 'en_revision' ? <button type="button" className="btn btn-outline-danger" disabled={trabajando} onClick={() => setDevolver(true)}><i className="fa-solid fa-reply" aria-hidden="true" /> Devolver con observación</button> : null}
          </>
        ) : null}
        {/* PDF y Word salen de lo guardado: con cambios sin guardar quedan bloqueados para no mostrar un escrito vacío o viejo (QA CONT-6). */}
        {sinGuardar ? (
          <>
            <button type="button" className="btn btn-outline-secondary" disabled title="Guarde los cambios para verlo en PDF"><i className="fa-solid fa-file-pdf" aria-hidden="true" /> PDF</button>
            <button type="button" className="btn btn-outline-secondary" disabled title="Guarde los cambios para descargarlo en Word"><i className="fa-solid fa-file-word" aria-hidden="true" /> Word (editable)</button>
            <span className="texto-ayuda align-self-center"><i className="fa-solid fa-circle-info" aria-hidden="true" /> {cambios ? 'Guarde para ver el PDF o descargar el Word con lo cargado.' : 'Complete los campos y guarde para ver el PDF o descargar el Word.'}</span>
          </>
        ) : (
          <>
            <a className="btn btn-outline-secondary" href={`/imprimir/documento/${uuid}`} target="_blank" rel="noreferrer"><i className="fa-solid fa-file-pdf" aria-hidden="true" /> PDF</a>
            <button type="button" className="btn btn-outline-secondary" onClick={() => void descargarDocx()} title="Archivo editable: se abre con Word, LibreOffice o Google Docs (no con el Bloc de notas)"><i className="fa-solid fa-file-word" aria-hidden="true" /> Word (editable)</button>
          </>
        )}
        <Link className="btn btn-outline-secondary" href={`/private/causa/${d.causa.uuid}`}>Volver a la causa</Link>
      </div>

      <div className={`editor-split ${campos.length || (editable && modo === 'campos') ? '' : 'sin-panel'}`}>
        {campos.length || (editable && modo === 'campos') ? (
          <aside className="editor-panel no-print">
            {campos.length ? (
              <div className="card-step">
                <div className="card-step-header"><h2>Datos del escrito</h2><p>{pendientes ? `Faltan ${pendientes} de ${campos.length}` : 'Todos los datos completos'} · los marcados «de la causa» vienen precargados y se pueden corregir solo para este escrito</p></div>
                <div className="card-step-body">
                  {campos.map((c) => (
                    <div key={c.k} className={`mb-2 campo-panel ${activo === c.k ? 'activo' : ''}`}>
                      <label className="form-label-v2" htmlFor={`pc-${c.k}`}>{c.label}{precargados.has(c.k) ? <span className="badge text-bg-light border ms-1" title="Dato precargado desde la causa">de la causa</span> : null}</label>
                      <input id={`pc-${c.k}`} onFocus={() => setActivo(c.k)} onBlur={() => setActivo((a) => (a === c.k ? null : a))} className={`form-control form-control-sm ${(valores[c.k] ?? '').trim() ? '' : 'is-invalid'}`} type={c.tipo === 'fecha' ? 'date' : c.tipo === 'numero' || c.tipo === 'moneda' ? 'number' : 'text'} value={valores[c.k] ?? ''} onChange={(e) => setCampoPanel(c.k, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {editable && modo === 'campos' ? (
              <div className="aviso aviso-info mt-3 mb-0">
                <p className="mb-2"><i className="fa-solid fa-lock" aria-hidden="true" /> El texto de la plantilla está bloqueado. {campos.length ? `Revise y complete los datos (${campos.length - pendientes} de ${campos.length} completos).` : 'Esta plantilla no tiene datos para completar.'}</p>
                <button type="button" className="btn btn-sm btn-outline-secondary w-100" onClick={() => setConfirmarLibre(true)}><i className="fa-solid fa-pen" aria-hidden="true" /> Editar todo el texto</button>
              </div>
            ) : null}
          </aside>
        ) : null}

      <div className="editor-escrito-wrap">
        {editable && modo === 'libre' ? <div className="aviso aviso-alerta no-print"><i className="fa-solid fa-pen-ruler" aria-hidden="true" /> Edición libre: puede modificar todo el texto de este escrito. La plantilla no cambia.</div> : null}
        {editable && modo === 'libre' ? (
          <div className="editor-toolbar no-print" role="toolbar" aria-label="Formato">
            {HERRAMIENTAS.map((h) => (
              <button key={h.cmd} type="button" className="btn btn-sm btn-light" title={h.t} aria-label={h.t} onMouseDown={(e) => { e.preventDefault(); document.execCommand(h.cmd, false, h.arg); setCambios(true); }}>
                <i className={`fa-solid ${h.i}`} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}
        <HojasPaginadas pie={PIE_INSTITUCIONAL} deps={[d, modo, puedeEditar, valores]}>
          <div className="membrete" contentEditable={false}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/Municipio_malvinas_argentinas_logo.png" alt="" style={{ height: 44, display: 'block', margin: '0 auto 4px' }} />
            <strong>MUNICIPALIDAD DE MALVINAS ARGENTINAS</strong>DIRECCIÓN DE FALTAS
          </div>
          <div ref={ref} data-paginar="" contentEditable={editable && modo === 'libre'} suppressContentEditableWarning onInput={onCampo}
            onFocus={(e) => { const k = (e.target as HTMLElement).dataset?.k; if (k) setActivo(k); }}
            onBlur={(e) => { const k = (e.target as HTMLElement).dataset?.k; if (k) setActivo((a) => (a === k ? null : a)); }}
            style={{ outline: 'none', minHeight: '40mm' }} aria-label="Texto del escrito" />
          {doc.firmado_por ? <div dangerouslySetInnerHTML={{ __html: firmaHtml(doc) }} /> : null}
        </HojasPaginadas>
      </div>
      </div>

      {confirmarLibre ? (
        <ModalForm titulo="Editar todo el texto" icono="fa-solid fa-pen-ruler" textoOk="Habilitar edición libre" campos={[]} aviso="Va a poder modificar cualquier parte del texto de ESTE escrito. Los campos ya cargados se vuelcan al texto y queda constancia en el historial de la causa. La plantilla no se modifica." onCancel={() => setConfirmarLibre(false)} onOk={() => { setModo('libre'); setConfirmarLibre(false); setCambios(true); }} />
      ) : null}
      {devolver ? (
        <ModalForm titulo="Devolver con observación" icono="fa-solid fa-reply" textoOk="Devolver" campos={[{ k: 'obs', t: 'Observación para el agente', tipo: 'area', req: true }]} onCancel={() => setDevolver(false)} onOk={(v) => revisar('devolver', v.obs)} />
      ) : null}
    </div>
  );
}

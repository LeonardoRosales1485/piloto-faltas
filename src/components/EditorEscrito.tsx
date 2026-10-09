'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken } from '@/lib/auth-client';
import { http } from '@/lib/api-client';
import { aplicarValores, camposCompletar, RE_COMPLETAR } from '@/lib/campos';
import { fechaHora, puede } from '@/lib/dominio';
import { firmaHtml, PIE_INSTITUCIONAL } from '@/lib/membrete';
import { useAuthUser } from '@/lib/use-auth-user';
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

  // Pinta la hoja: en modo «campos» el texto queda fijo y cada [Completar:...] es un campo; en «libre» se edita todo.
  useEffect(() => {
    const el = ref.current;
    if (!el || !d) return;
    if (!puedeEditar) { el.innerHTML = base.current; return; }
    if (modo === 'libre') { el.innerHTML = aplicarValores(base.current, valores); return; }
    let i = 0;
    el.innerHTML = base.current.replace(RE_COMPLETAR, (_m, label: string, tipo?: string) => {
      i += 1;
      const k = `c${i}`;
      const t = tipo === 'fecha' ? 'date' : tipo === 'numero' || tipo === 'moneda' ? 'number' : 'text';
      const lab = String(label).replace(/"/g, '&quot;');
      const val = String(valores[k] ?? '').replace(/"/g, '&quot;');
      return `<input class="campo-completar${val ? '' : ' vacio'}" data-k="${k}" type="${t}" ${tipo === 'moneda' ? 'step="0.01"' : ''} placeholder="${lab}" title="${lab}" aria-label="${lab}" value="${val}" style="width:${anchoCampo(String(label), String(valores[k] ?? ''), t)}ch"/>`;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, modo, puedeEditar]);

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

  if (!d) return <div className="pagina"><div className="card-step"><div className="celda-cargando"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando escrito...</div></div></div>;

  const doc = d.documento;
  const esDirectora = puede(user?.rol, 'firmar');
  const editable = puedeEditar;
  const campos = modo === 'campos' && editable ? camposCompletar(base.current) : [];
  const pendientes = campos.filter((c) => !(valores[c.k] ?? '').trim()).length;
  const payload = () => (modo === 'libre' ? { modo, valores, html: ref.current?.innerHTML ?? '' } : { modo, valores });
  const requiereRevision = Number(doc.plantilla?.requiere_revision ?? 0) === 1;

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
        <a className="btn btn-outline-secondary" href={`/imprimir/documento/${uuid}`} target="_blank" rel="noreferrer"><i className="fa-solid fa-file-pdf" aria-hidden="true" /> PDF</a>
        <button type="button" className="btn btn-outline-secondary" onClick={() => void descargarDocx()}><i className="fa-solid fa-file-word" aria-hidden="true" /> DOCX</button>
        <Link className="btn btn-outline-secondary" href={`/private/causa/${d.causa.uuid}`}>Volver a la causa</Link>
      </div>

      <div className={`editor-split ${campos.length || (editable && modo === 'campos') ? '' : 'sin-panel'}`}>
        {campos.length || (editable && modo === 'campos') ? (
          <aside className="editor-panel no-print">
            {campos.length ? (
              <div className="card-step">
                <div className="card-step-header"><h2>Campos a completar</h2><p>{pendientes ? `Faltan ${pendientes} de ${campos.length}` : 'Todos los campos completos'}</p></div>
                <div className="card-step-body">
                  {campos.map((c) => (
                    <div key={c.k} className="mb-2">
                      <label className="form-label-v2" htmlFor={`pc-${c.k}`}>{c.label}</label>
                      <input id={`pc-${c.k}`} className={`form-control form-control-sm ${(valores[c.k] ?? '').trim() ? '' : 'is-invalid'}`} type={c.tipo === 'fecha' ? 'date' : c.tipo === 'numero' || c.tipo === 'moneda' ? 'number' : 'text'} value={valores[c.k] ?? ''} onChange={(e) => setCampoPanel(c.k, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {editable && modo === 'campos' ? (
              <div className="aviso aviso-info mt-3 mb-0">
                <p className="mb-2"><i className="fa-solid fa-lock" aria-hidden="true" /> El texto de la plantilla está bloqueado. {campos.length ? `Complete los campos (${campos.length - pendientes} de ${campos.length} completos).` : 'Esta plantilla no tiene campos a completar.'}</p>
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
        <div className="hoja-a4">
          <div className="membrete" contentEditable={false}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/Municipio_malvinas_argentinas_logo.png" alt="" style={{ height: 44, display: 'block', margin: '0 auto 4px' }} />
            <strong>MUNICIPALIDAD DE MALVINAS ARGENTINAS</strong>DIRECCIÓN DE FALTAS
          </div>
          <div ref={ref} contentEditable={editable && modo === 'libre'} suppressContentEditableWarning onInput={onCampo} style={{ outline: 'none', minHeight: '180mm' }} aria-label="Texto del escrito" />
          {doc.firmado_por ? <div dangerouslySetInnerHTML={{ __html: firmaHtml(doc) }} /> : null}
          <div style={{ borderTop: '1px solid #000', marginTop: 18, paddingTop: 4, fontSize: '9pt', textAlign: 'center' }}>{PIE_INSTITUCIONAL}</div>
        </div>
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

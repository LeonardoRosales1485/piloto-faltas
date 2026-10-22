'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ACCEPT_ADJUNTOS, LIMITES_DEFECTO, leerAdjunto, textoLimites, validarAdjuntos, type LimitesAdjuntos } from '@/lib/adjuntos';
import { BotonVerActa, GaleriaFotos } from './ActaEvidencia';
import Link from 'next/link';
import { LoaderLogo } from './LoaderLogo';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { crearDocx } from '@/lib/docx-simple';
import { fechaCorta, fechaHora, pesos } from '@/lib/dominio';
import { portal, portalPerfil } from '@/lib/portal-client';
import { useRefresco } from '@/lib/use-refresco';
import { articulosParaCiudadano } from '@/lib/print';

type R = Record<string, any>;

const ACCIONES: { k: string; t: string; d: string; i: string; aviso?: string }[] = [
  // «Pago» neutro (minuta 20/10): un solo botón, también vencido el plazo. Internamente es un pedido de pago voluntario
  // (en plazo) o de boleta (fuera de plazo); el 50 % corresponde si no presentó descargo y la Dirección puede quitarlo.
  { k: 'pago', t: 'Pago', d: 'Pide la boleta para pagar. La Dirección de Faltas le informa el monto que corresponde.', i: 'fa-solid fa-file-invoice-dollar', aviso: 'advertencia_pago_voluntario' },
  { k: 'descargo', t: 'Presentar descargo', d: 'Explique su versión de los hechos y adjunte pruebas.', i: 'fa-solid fa-scale-balanced', aviso: 'advertencia_descargo_transito' },
  { k: 'reenviar_descargo', t: 'Reenviar descargo', d: 'Corrija lo que le observaron. Solo se puede reenviar una vez.', i: 'fa-solid fa-rotate' },
  { k: 'cuotas', t: 'Pedir plan de cuotas', d: 'Pague en cuotas mensuales. Faltas define la cantidad.', i: 'fa-solid fa-calendar-days', aviso: 'advertencia_cuotas' },
  { k: 'apelacion', t: 'Presentar apelación', d: 'La revisa el Juzgado de Paz. Plazo: 5 días hábiles desde la notificación del fallo.', i: 'fa-solid fa-landmark' },
];

const TIPO_PRES: Record<string, string> = { pago_voluntario: 'Pago voluntario', boleta: 'Boleta', cuotas: 'Plan de cuotas', descargo: 'Descargo', apelacion: 'Apelación' };
const ESTADO_PRES: Record<string, string> = { pendiente: 'En análisis', aceptada: 'Aceptada', rechazada: 'No admitida', observada: 'Observada: complete lo que falta', reenviada: 'Reenviada' };
const ESTADO_BOL: Record<string, string> = { emitida: 'Pendiente de pago', a_verificar: 'Pago informado: a verificar', definitiva: 'Pagada', vencida: 'Vencida' };


/** Causa en el portal: aviso de notificación, estado, documentos, boletas y presentaciones (PI-08 a PI-27). */
export function PortalCausa() {
  const { uuid } = useParams() as { uuid: string };
  const [d, setD] = useState<R | null>(null);
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [contacto, setContacto] = useState('');
  const [form, setForm] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [limites, setLimites] = useState<LimitesAdjuntos>(LIMITES_DEFECTO);
  const [cuotas, setCuotas] = useState(3);
  const [adj, setAdj] = useState<{ titulo: string; nombre: string; raw: string }[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const juridica = portalPerfil()?.tipoPersona === 'juridica';
  const refForm = useRef<HTMLDivElement>(null);
  const refMsg = useRef<HTMLDivElement>(null);
  // Lleva la vista a lo que acaba de aparecer por el click (formulario o mensaje de resultado).
  useEffect(() => { if (form) setTimeout(() => refForm.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }, [form]);
  useEffect(() => { if (msg) setTimeout(() => refMsg.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }, [msg]);

  const cargar = useCallback((abrir = false) => {
    portal.get<R>(`/api/portal/causa/${uuid}${abrir ? '?abrir=1' : ''}`).then(setD).catch((e: Error) => setMsg({ ok: false, t: e.message }));
  }, [uuid]);

  useEffect(() => {
    if (!portalPerfil()) {
      window.location.href = `/portal?volver=${encodeURIComponent(`/portal/causa/${uuid}`)}`;
      return;
    }
    cargar();
    portal.get<{ textos: Record<string, string>; contacto: string; limites?: LimitesAdjuntos }>('/api/portal/textos').then((r) => { setTextos(r.textos); setContacto(r.contacto); if (r.limites) setLimites(r.limites); });
  }, [cargar, uuid]);
  // Se actualiza sola cuando la Dirección mueve la causa (cada 20 s y al volver a la pestaña).
  useRefresco(() => { if (portalPerfil()) portal.get<R>(`/api/portal/causa/${uuid}`).then(setD).catch(() => undefined); });

  async function adjuntar(titulo: string, f?: File | null) {
    if (!f) return;
    const raw = await leerAdjunto(f); // las fotos se achican antes de enviarlas
    const error = validarAdjuntos([{ nombre: f.name, raw }], { ...limites, maxArchivos: 99, maxFojas: limites.maxFojas });
    if (error) { setMsg({ ok: false, t: error }); return; }
    setMsg(null);
    setAdj((p) => [...p.filter((a) => a.titulo !== titulo || titulo === 'Prueba'), { titulo, nombre: f.name, raw }]);
  }

  async function presentar() {
    if (!form) return;
    const faltan = [!adj.some((a) => a.titulo === 'DNI frente') && 'DNI frente', !adj.some((a) => a.titulo === 'DNI dorso') && 'DNI dorso', juridica && !adj.some((a) => a.titulo === 'Estatuto') && 'Estatuto',
      (form === 'descargo' || form === 'reenviar_descargo' || form === 'apelacion') && texto.trim().length < 20 && !adj.some((a) => a.titulo === 'Escrito') && 'su presentación escrita (o el escrito firmado adjunto)'].filter(Boolean);
    if (faltan.length) { setMsg({ ok: false, t: `Falta completar: ${faltan.join(', ')}.` }); return; }
    const excede = validarAdjuntos(adj, limites);
    if (excede) { setMsg({ ok: false, t: excede }); return; }
    // Límite de la plataforma por envío (≈4,5 MB en Vercel): se avisa antes en lugar de fallar al enviar.
    if (adj.reduce((n, a) => n + a.raw.length, 0) > 4 * 1024 * 1024) { setMsg({ ok: false, t: 'Los archivos juntos superan 4 MB. Adjunte menos archivos o más livianos (por ejemplo, fotos en lugar de PDF escaneados).' }); return; }
    setEnviando(true);
    setMsg(null);
    try {
      const tipo = form === 'pago' ? ((d?.acciones as Record<string, { ok: boolean }> | undefined)?.pago_voluntario?.ok ? 'pago_voluntario' : 'boleta') : form;
      await portal.post('/api/portal/presentar', { causaUuid: uuid, tipo, texto, cuotas, adjuntos: adj });
      setMsg({ ok: true, t: 'Recibimos su presentación. Le avisaremos por correo cuando la Dirección de Faltas responda.' });
      setForm(null); setTexto(''); setAdj([]);
      cargar();
    } catch (e) {
      setMsg({ ok: false, t: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  async function pagar(b: R) {
    try {
      await portal.post('/api/portal/pagar', { boletaUuid: b.uuid });
      setMsg({ ok: true, t: `Pago de la boleta ${b.numero} informado. La Dirección de Faltas lo verifica con la acreditación.` });
      cargar();
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }); }
  }

  /** Párrafos del formulario modelo de descargo (para el PDF y el Word). */
  function parrafosModelo() {
    const r = d?.resumen ?? {};
    const base = (textos.formulario_descargo || 'Sr./Sra. Director/a de Faltas: Quien suscribe, [nombre y apellido], DNI [número], con domicilio en [domicilio], en relación al Acta N.° [número], vengo a presentar descargo en los siguientes términos: [exponga los hechos]. Ofrezco como prueba: [detalle]. Sin otro particular, saludo atentamente.')
      .replace('Acta N.° [número]', `Acta N.° ${r.numero ?? '[número]'}`);
    return [
      { texto: 'FORMULARIO DE DESCARGO', negrita: true, centrado: true, tamano: 14 },
      { texto: `${r.tipoTitulo ?? 'Acta'} N.° ${r.numero ?? ''} · Legajo ${r.legajo ?? ''}${r.dominio ? ` · Dominio ${r.dominio}` : ''}`, centrado: true },
      ...base.split(/\n+/).map((t: string) => ({ texto: t.trim() })).filter((x: { texto: string }) => x.texto),
      { texto: '' }, { texto: 'Firma: ______________________________' }, { texto: 'Aclaración: __________________________' }, { texto: 'DNI: ________________   Fecha: ____/____/________' },
    ] as { texto: string; negrita?: boolean; centrado?: boolean; tamano?: number }[];
  }

  /** Formulario en una hoja lista para imprimir o guardar como PDF (se abre en cualquier dispositivo). */
  function imprimirModelo() {
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = parrafosModelo().map((p) => `<p style="${p.centrado ? 'text-align:center;' : ''}${p.negrita ? 'font-weight:bold;' : ''}${p.tamano ? `font-size:${p.tamano}pt;` : ''}">${esc(p.texto) || '&nbsp;'}</p>`).join('');
    const w = window.open('', '_blank');
    if (!w) { setMsg({ ok: false, t: 'El navegador bloqueó la ventana. Permita ventanas emergentes para este sitio.' }); return; }
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Formulario de descargo</title><style>@page{size:A4;margin:25mm 20mm}body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;max-width:170mm;margin:0 auto;padding:12mm 0}p{margin:0 0 10pt}</style></head><body>${html}<script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  }

  /** Formulario editable en Word (.docx): se abre con Word, LibreOffice o Google Docs. */
  function descargarModelo() {
    const r = d?.resumen ?? {};
    const blob = crearDocx(parrafosModelo());
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Formulario de descargo - Acta ${r.numero ?? ''}.docx`.replace(/\s+\.docx$/, '.docx');
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  if (!d) return <div className="portal-card">{msg ? <div className="aviso aviso-peligro mb-0">{msg.t}</div> : <LoaderLogo texto="Cargando acta…" />}</div>;
  const r = d.resumen;

  if (d.requiereAviso) {
    return (
      <div className="portal-card" style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1>{r.tipoTitulo} {r.numero}</h1>
        <p className="texto-ayuda">Legajo {r.legajo} · {String(r.fecha ?? '').replace('T', ' ')} · {r.lugar}</p>
        <div className="aviso aviso-alerta"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {textos.aviso_notificacion}</div>
        <button type="button" className="btn btn-primary btn-lg w-100" onClick={() => { cargar(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Abrir el acta y quedar notificado/a</button>
        <Link href="/portal" className="btn btn-link w-100 mt-2">Ahora no</Link>
      </div>
    );
  }

  let acciones = (d.acciones ?? {}) as Record<string, { ok: boolean; motivo?: string }>;
  // «Pago» toma el pedido que corresponda hoy: pago voluntario si está habilitado; si no, boleta.
  const tipoPago = acciones.pago_voluntario?.ok ? 'pago_voluntario' : 'boleta';
  acciones = { ...acciones, pago: acciones[tipoPago] ?? { ok: false, motivo: acciones.boleta?.motivo ?? acciones.pago_voluntario?.motivo } };
  const disponibles = ACCIONES.filter((a) => acciones[a.k]?.ok);
  const noDisponibles = ACCIONES.filter((a) => !acciones[a.k]?.ok && a.k !== 'reenviar_descargo');
  const conTexto = form === 'descargo' || form === 'reenviar_descargo' || form === 'apelacion';
  const textoCorto = texto.trim().length < 20;
  const sinEscrito = !adj.some((a) => a.titulo === 'Escrito');
  const observada = (d.presentaciones as R[]).find((p) => p.tipo === 'descargo' && p.estado === 'observada');

  return (
    <>
      {msg && !form ? <div ref={refMsg} className={`aviso ${msg.ok ? 'aviso-ok' : 'aviso-peligro'}`}>{msg.t}</div> : null}
      <div className="portal-card">
        <div className="d-flex justify-content-between flex-wrap gap-2 align-items-start">
          <div>
            <h1 className="mb-1">{r.tipoTitulo} {r.numero}</h1>
            <p className="texto-ayuda mb-0">Legajo {r.legajo} · {String(r.fecha ?? '').replace('T', ' ')} · {r.lugar}{r.dominio ? ` · Dominio ${r.dominio}` : ''}</p>
          </div>
          {d.acta ? <BotonVerActa acta={d.acta} imagenes={(d.imagenes ?? []).map((x: R) => x.preview_raw).filter(Boolean)} texto="Visualizar acta" /> : null}
        </div>
        <dl className="ficha mt-3">
          <div><dt>Estado</dt><dd>{r.estadoVisible}</dd></div>
          <div><dt>Notificada</dt><dd>{fechaHora(r.notificadaAt)}</dd></div>
          <div><dt>{r.estado === 'Fallo notificado' ? 'Plazo para pagar o apelar' : 'Plazo para pagar o presentar descargo'}</dt><dd>{r.venceAt ? `Hasta el ${fechaCorta(r.venceAt)}` : '-'}</dd></div>
          <div><dt>Infracción</dt><dd>{d.acta ? articulosParaCiudadano(d.acta).map((a) => <div key={a}>{a}</div>) : null}</dd></div>
        </dl>
        {(d.imagenes ?? []).length ? <div className="mt-3"><div className="texto-ayuda mb-1">Imágenes de la infracción</div><GaleriaFotos imagenes={(d.imagenes as R[]).map((x) => x.preview_raw)} alto={80} /></div> : null}
        {r.medidaVigente ? <div className="aviso aviso-peligro mt-2 mb-0"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Esta acta tiene una <strong>medida preventiva vigente</strong> ({[d.acta?.retencionDeLicencia ? 'retención de licencia' : '', d.acta?.retencionDeVehiculo ? 'retención de vehículo' : '', ...(d.acta?.medidasPreventivas ?? [])].filter(Boolean).join(', ')}). Sigue vigente aunque pague, hasta que la Dirección de Faltas disponga su levantamiento.</div> : null}
      </div>

      {d.subsanacion ? <div className="aviso aviso-info"><i className="fa-solid fa-pen-to-square" aria-hidden="true" /> La Dirección de Faltas <strong>subsanó datos del acta</strong> el {fechaCorta(d.subsanacion.fecha)}. Se muestran los datos corregidos; la constancia está en sus documentos.</div> : null}
      {observada ? <div className="aviso aviso-alerta"><strong>Su descargo fue observado:</strong> {observada.respuesta}. Puede reenviarlo una única vez.</div> : null}

      {disponibles.length ? (
        <div className="portal-card">
          <h2>¿Qué puede hacer?</h2>
          {acciones.pago_voluntario?.ok && acciones.descargo?.ok ? (
            <div className="portal-caminos">
              <p className="mb-2">Tiene <strong>tres caminos</strong>{r.venceAt ? <> hasta el <strong>{fechaCorta(r.venceAt)}</strong>{(() => { const dias = Math.ceil((Number(r.venceAt) - Date.now()) / 86400000); return dias > 0 ? ` (quedan ${dias} días)` : ''; })()}</> : null}. Elija uno solo:</p>
              <ol>
                <li><strong>Pago</strong>: pide la boleta y termina el trámite. Si no presentó descargo, con el 50 % de descuento del pago voluntario (la Dirección puede quitarlo).{d.resumen.tipo === 'multas' ? ' Si lo elige, ya no puede presentar descargo.' : ''}</li>
                <li><strong>Descargo</strong>: explica su versión y adjunta pruebas.{d.resumen.tipo === 'multas' ? ' Si lo presenta, ya no puede hacer el pago voluntario.' : ''} La Dirección lo analiza antes de dictar el fallo.</li>
                <li><strong>No hacer nada</strong>: vencido el plazo la Dirección dicta el fallo con lo que consta en el acta. Hasta el fallo puede seguir pidiendo el pago con el descuento.</li>
              </ol>
            </div>
          ) : null}
          <div className="portal-acciones">
            {disponibles.map((a) => (
              <button key={a.k} type="button" className="portal-accion" onClick={() => { setForm(a.k); setMsg(null); }}>
                <i className={a.i} aria-hidden="true" /><strong>{a.t}</strong><span>{a.d}</span>
              </button>
            ))}
          </div>
          {acciones.descargo?.ok || acciones.reenviar_descargo?.ok ? (
            <div className="mt-2">
              <span className="texto-ayuda d-block mb-1">Formulario modelo de descargo:</span>
              <div className="d-flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={imprimirModelo}><i className="fa-solid fa-print" aria-hidden="true" /> Imprimir o guardar en PDF</button>
                <button type="button" className="btn btn-link btn-sm px-0" onClick={descargarModelo} title="Se abre con Word, LibreOffice o Google Docs"><i className="fa-solid fa-file-word" aria-hidden="true" /> Descargar en Word (editable)</button>
              </div>
              <span className="texto-ayuda d-block mt-1">El archivo de Word se abre con Word, LibreOffice o Google Docs. Si no tiene esos programas, use «Imprimir o guardar en PDF».</span>
            </div>
          ) : null}
          {noDisponibles.length ? <details className="mt-2"><summary className="texto-ayuda">Opciones no disponibles y por qué</summary><ul className="texto-ayuda mt-1">{noDisponibles.map((a) => <li key={a.k}>{a.t}: {acciones[a.k]?.motivo}</li>)}</ul></details> : null}
        </div>
      ) : null}

      {form ? (
        <div className="portal-card" ref={refForm} style={{ scrollMarginTop: 16 }}>
          <h2>{ACCIONES.find((a) => a.k === form)?.t}</h2>
          {ACCIONES.find((a) => a.k === form)?.aviso && (form !== 'descargo' || d.resumen.tipo === 'multas') && (form !== 'pago' || tipoPago === 'pago_voluntario') ? <div className="aviso aviso-alerta">{textos[ACCIONES.find((a) => a.k === form)!.aviso!]}</div> : null}
          {form === 'cuotas' ? <div className="form-group mb-3"><label htmlFor="pc-c">Cantidad de cuotas que solicita</label><input id="pc-c" type="number" min={2} max={12} className="form-control" style={{ maxWidth: 140 }} value={cuotas} onChange={(e) => setCuotas(Number(e.target.value))} /></div> : null}
          <div className="form-group mb-3">
            <label htmlFor="pc-t">{conTexto ? <>Su presentación {sinEscrito ? <span className="requerido">*</span> : null}</> : 'Comentario (opcional)'}</label>
            <textarea id="pc-t" className="form-control" rows={conTexto ? 7 : 3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={conTexto ? 'Exponga los hechos y lo que solicita...' : ''} />
            {conTexto ? <small className="texto-ayuda">Escriba su presentación aquí (mínimo 20 caracteres) <strong>o</strong> adjunte el escrito firmado. Una de las dos es obligatoria.</small> : null}
          </div>
          <div className="row g-2">
            {[['DNI frente', true], ['DNI dorso', true], ...(juridica ? [['Estatuto', true]] : []), ...(conTexto ? [['Escrito', textoCorto], ['Prueba', false]] : [])].map(([t, req]) => (
              <div key={String(t)} className="col-12 col-md-6">
                <label htmlFor={`pa-${t}`}>{String(t)} {req ? <span className="requerido">*</span> : t === 'Escrito' ? '(opcional: ya escribió su presentación)' : '(opcional)'}</label>
                <input id={`pa-${t}`} type="file" accept={ACCEPT_ADJUNTOS} className="form-control" onChange={(e) => void adjuntar(String(t), e.target.files?.[0])} />
                {adj.filter((a) => a.titulo === t).map((a) => <span key={a.nombre} className="texto-ayuda d-block">✓ {a.nombre}</span>)}
              </div>
            ))}
          </div>
          <small className="texto-ayuda d-block mt-1">{textoLimites(limites)} Las fotos se achican solas.</small>
          {msg ? <div ref={refMsg} className={`aviso ${msg.ok ? 'aviso-ok' : 'aviso-peligro'} mt-3 mb-0`}>{msg.t}</div> : null}
          <div className="d-flex gap-2 mt-3 flex-wrap">
            <button type="button" className="btn btn-primary btn-lg" disabled={enviando} onClick={() => void presentar()}>{enviando ? 'Enviando...' : 'Enviar'}</button>
            <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => { setForm(null); setAdj([]); }}>Cancelar</button>
          </div>
        </div>
      ) : null}

      {(d.boletas as R[]).length ? (
        <div className="portal-card">
          <h2>Boletas</h2>
          <ul className="lista-items">
            {(d.boletas as R[]).map((b) => (
              <li key={b.uuid}>
                <div>
                  <div className="li-titulo">{b.concepto}</div>
                  <div className="li-sub">N° {b.numero} · {pesos(Number(b.monto))} · vence {fechaCorta(b.vencimiento)} · a nombre de {b.a_nombre_de}</div>
                  <div className="li-sub"><strong>{ESTADO_BOL[b.estado] ?? b.estado}</strong></div>
                </div>
                {b.estado === 'emitida' ? <button type="button" className="btn btn-success" onClick={() => void pagar(b)}>Pagar (simulado)</button> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(d.documentos as R[]).length ? (
        <div className="portal-card">
          <h2>Documentos</h2>
          <ul className="lista-items">
            {(d.documentos as R[]).map((doc) => (
              <li key={doc.uuid}>
                <div><div className="li-titulo">{doc.titulo}{doc.numero ? ` N° ${doc.numero}` : ''}</div><div className="li-sub">{fechaCorta(doc.firmado_at ?? doc.date_created)}{doc.pendienteNotificacion ? ' · Al abrirlo queda notificado/a' : ''}</div></div>
                <Link className="btn btn-outline-primary" href={`/portal/documento/${doc.uuid}?causa=${uuid}`}>Ver</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(d.presentaciones as R[]).length ? (
        <div className="portal-card">
          <h2>Mis presentaciones</h2>
          <ul className="lista-items">
            {(d.presentaciones as R[]).map((p) => (
              <li key={p.uuid}>
                <div>
                  <div className="li-titulo">{TIPO_PRES[p.tipo]}{p.reenvio_de ? ' (reenvío)' : ''} · {ESTADO_PRES[p.estado] ?? p.estado}</div>
                  <div className="li-sub">Enviada {fechaHora(p.date_created)}{p.cuotas_otorgadas ? ` · ${p.cuotas_otorgadas} cuotas otorgadas` : ''}</div>
                  {p.respuesta && p.estado !== 'pendiente' ? <div className="li-sub">Respuesta de Faltas: {p.respuesta}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="portal-card"><h2>Contacto</h2><p className="mb-0">{contacto}</p></div>
      <Link href="/portal" className="btn btn-outline-secondary">Volver a mis actas</Link>
    </>
  );
}

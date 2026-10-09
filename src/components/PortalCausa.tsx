'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { LoaderLogo } from './LoaderLogo';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { fechaCorta, fechaHora, pesos } from '@/lib/dominio';
import { printActa } from '@/lib/print';
import { portal, portalPerfil } from '@/lib/portal-client';

type R = Record<string, any>;

const ACCIONES: { k: string; t: string; d: string; i: string; aviso?: string }[] = [
  { k: 'pago_voluntario', t: 'Pagar con descuento (pago voluntario)', d: 'Pide la boleta con el beneficio del pago voluntario.', i: 'fa-solid fa-percent', aviso: 'advertencia_pago_voluntario' },
  { k: 'descargo', t: 'Presentar descargo', d: 'Explique su versión de los hechos y adjunte pruebas.', i: 'fa-solid fa-scale-balanced', aviso: 'advertencia_descargo_transito' },
  { k: 'reenviar_descargo', t: 'Reenviar descargo', d: 'Corrija lo que le observaron. Solo se puede reenviar una vez.', i: 'fa-solid fa-rotate' },
  { k: 'boleta', t: 'Solicitar boleta', d: 'Pide la boleta para pagar el total.', i: 'fa-solid fa-file-invoice-dollar' },
  { k: 'cuotas', t: 'Pedir plan de cuotas', d: 'Pague en cuotas mensuales. Faltas define la cantidad.', i: 'fa-solid fa-calendar-days', aviso: 'advertencia_cuotas' },
  { k: 'apelacion', t: 'Presentar apelación', d: 'La revisa el Juzgado de Paz. Plazo: 5 días hábiles desde la notificación del fallo.', i: 'fa-solid fa-landmark' },
];

const TIPO_PRES: Record<string, string> = { pago_voluntario: 'Pago voluntario', boleta: 'Boleta', cuotas: 'Plan de cuotas', descargo: 'Descargo', apelacion: 'Apelación' };
const ESTADO_PRES: Record<string, string> = { pendiente: 'En análisis', aceptada: 'Aceptada', rechazada: 'Rechazada', observada: 'Observada', reenviada: 'Reenviada' };
const ESTADO_BOL: Record<string, string> = { emitida: 'Pendiente de pago', a_verificar: 'Pago informado: a verificar', definitiva: 'Pagada', vencida: 'Vencida' };

function leer(f: File) {
  return new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); });
}

/** Causa en el portal: aviso de notificación, estado, documentos, boletas y presentaciones (PI-08 a PI-27). */
export function PortalCausa() {
  const { uuid } = useParams() as { uuid: string };
  const [d, setD] = useState<R | null>(null);
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [contacto, setContacto] = useState('');
  const [form, setForm] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [cuotas, setCuotas] = useState(3);
  const [adj, setAdj] = useState<{ titulo: string; nombre: string; raw: string }[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const juridica = portalPerfil()?.tipoPersona === 'juridica';

  const cargar = useCallback((abrir = false) => {
    portal.get<R>(`/api/portal/causa/${uuid}${abrir ? '?abrir=1' : ''}`).then(setD).catch((e: Error) => setMsg({ ok: false, t: e.message }));
  }, [uuid]);

  useEffect(() => {
    if (!portalPerfil()) {
      window.location.href = `/portal?volver=${encodeURIComponent(`/portal/causa/${uuid}`)}`;
      return;
    }
    cargar();
    portal.get<{ textos: Record<string, string>; contacto: string }>('/api/portal/textos').then((r) => { setTextos(r.textos); setContacto(r.contacto); });
  }, [cargar, uuid]);

  async function adjuntar(titulo: string, f?: File | null) {
    if (!f) return;
    const raw = await leer(f);
    setAdj((p) => [...p.filter((a) => a.titulo !== titulo || titulo === 'Prueba'), { titulo, nombre: f.name, raw }]);
  }

  async function presentar() {
    if (!form) return;
    setEnviando(true);
    setMsg(null);
    try {
      await portal.post('/api/portal/presentar', { causaUuid: uuid, tipo: form, texto, cuotas, adjuntos: adj });
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

  function descargarModelo() {
    const html = `<html><head><meta charset="utf-8"></head><body style="font-family:'Times New Roman';font-size:12pt"><p>${(textos.formulario_descargo ?? '').replace(/\n/g, '<br/>')}</p></body></html>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'application/msword' }));
    a.download = 'Formulario modelo de descargo.doc';
    a.click();
  }

  if (!d) return <div className="portal-card">{msg ? <div className="aviso aviso-peligro mb-0">{msg.t}</div> : <LoaderLogo texto="Cargando acta…" />}</div>;
  const r = d.resumen;

  if (d.requiereAviso) {
    return (
      <div className="portal-card" style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1>{r.tipoTitulo} {r.numero}</h1>
        <p className="texto-ayuda">Legajo {r.legajo} · {String(r.fecha ?? '').replace('T', ' ')} · {r.lugar}</p>
        <div className="aviso aviso-alerta"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {textos.aviso_notificacion}</div>
        <button type="button" className="btn btn-primary btn-lg w-100" onClick={() => cargar(true)}>Abrir el acta y quedar notificado/a</button>
        <Link href="/portal" className="btn btn-link w-100 mt-2">Ahora no</Link>
      </div>
    );
  }

  const acciones = (d.acciones ?? {}) as Record<string, { ok: boolean; motivo?: string }>;
  const disponibles = ACCIONES.filter((a) => acciones[a.k]?.ok);
  const noDisponibles = ACCIONES.filter((a) => !acciones[a.k]?.ok && a.k !== 'reenviar_descargo');
  const conTexto = form === 'descargo' || form === 'reenviar_descargo' || form === 'apelacion';
  const observada = (d.presentaciones as R[]).find((p) => p.tipo === 'descargo' && p.estado === 'observada');

  return (
    <>
      {msg ? <div className={`aviso ${msg.ok ? 'aviso-ok' : 'aviso-peligro'}`}>{msg.t}</div> : null}
      <div className="portal-card">
        <div className="d-flex justify-content-between flex-wrap gap-2 align-items-start">
          <div>
            <h1 className="mb-1">{r.tipoTitulo} {r.numero}</h1>
            <p className="texto-ayuda mb-0">Legajo {r.legajo} · {String(r.fecha ?? '').replace('T', ' ')} · {r.lugar}{r.dominio ? ` · Dominio ${r.dominio}` : ''}</p>
          </div>
          <button type="button" className="btn btn-outline-primary" onClick={() => d.acta && printActa(d.acta)}><i className="fa-solid fa-eye" aria-hidden="true" /> Visualizar acta</button>
        </div>
        <dl className="ficha mt-3">
          <div><dt>Estado</dt><dd>{r.estadoVisible}</dd></div>
          <div><dt>Notificada</dt><dd>{fechaHora(r.notificadaAt)}</dd></div>
          <div><dt>{r.estado === 'Fallo notificado' ? 'Plazo para pagar o apelar' : 'Plazo para pagar o presentar descargo'}</dt><dd>{r.venceAt ? `Hasta el ${fechaCorta(r.venceAt)}` : '-'}</dd></div>
          <div><dt>Artículos</dt><dd>{(d.acta?.leyesNombre ?? []).join(', ')}</dd></div>
        </dl>
        {r.medidaVigente ? <div className="aviso aviso-peligro mt-2 mb-0"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Esta acta tiene una <strong>medida preventiva vigente</strong> ({[d.acta?.retencionDeLicencia ? 'retención de licencia' : '', d.acta?.retencionDeVehiculo ? 'retención de vehículo' : '', ...(d.acta?.medidasPreventivas ?? [])].filter(Boolean).join(', ')}). Sigue vigente aunque pague, hasta que la Dirección de Faltas disponga su levantamiento.</div> : null}
      </div>

      {observada ? <div className="aviso aviso-alerta"><strong>Su descargo fue observado:</strong> {observada.respuesta}. Puede reenviarlo una única vez.</div> : null}

      {disponibles.length ? (
        <div className="portal-card">
          <h2>¿Qué puede hacer?</h2>
          <div className="portal-acciones">
            {disponibles.map((a) => (
              <button key={a.k} type="button" className="portal-accion" onClick={() => { setForm(a.k); setMsg(null); }}>
                <i className={a.i} aria-hidden="true" /><strong>{a.t}</strong><span>{a.d}</span>
              </button>
            ))}
          </div>
          {acciones.descargo?.ok || acciones.reenviar_descargo?.ok ? <button type="button" className="btn btn-link px-0 mt-2" onClick={descargarModelo}><i className="fa-solid fa-download" aria-hidden="true" /> Descargar el formulario modelo de descargo</button> : null}
          {noDisponibles.length ? <details className="mt-2"><summary className="texto-ayuda">Opciones no disponibles y por qué</summary><ul className="texto-ayuda mt-1">{noDisponibles.map((a) => <li key={a.k}>{a.t}: {acciones[a.k]?.motivo}</li>)}</ul></details> : null}
        </div>
      ) : null}

      {form ? (
        <div className="portal-card">
          <h2>{ACCIONES.find((a) => a.k === form)?.t}</h2>
          {ACCIONES.find((a) => a.k === form)?.aviso && (form !== 'descargo' || d.resumen.tipo === 'multas') ? <div className="aviso aviso-alerta">{textos[ACCIONES.find((a) => a.k === form)!.aviso!]}</div> : null}
          {form === 'cuotas' ? <div className="form-group mb-3"><label htmlFor="pc-c">Cantidad de cuotas que solicita</label><input id="pc-c" type="number" min={2} max={12} className="form-control" style={{ maxWidth: 140 }} value={cuotas} onChange={(e) => setCuotas(Number(e.target.value))} /></div> : null}
          <div className="form-group mb-3">
            <label htmlFor="pc-t">{conTexto ? 'Su presentación' : 'Comentario (opcional)'}</label>
            <textarea id="pc-t" className="form-control" rows={conTexto ? 7 : 3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={conTexto ? 'Exponga los hechos y lo que solicita...' : ''} />
          </div>
          <div className="row g-2">
            {[['DNI frente', true], ['DNI dorso', true], ...(juridica ? [['Estatuto', true]] : []), ...(conTexto ? [['Escrito', false], ['Prueba', false]] : [])].map(([t, req]) => (
              <div key={String(t)} className="col-12 col-md-6">
                <label htmlFor={`pa-${t}`}>{String(t)} {req ? <span className="requerido">*</span> : '(opcional)'}</label>
                <input id={`pa-${t}`} type="file" accept="image/*,application/pdf" className="form-control" onChange={(e) => void adjuntar(String(t), e.target.files?.[0])} />
                {adj.filter((a) => a.titulo === t).map((a) => <span key={a.nombre} className="texto-ayuda d-block">✓ {a.nombre}</span>)}
              </div>
            ))}
          </div>
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

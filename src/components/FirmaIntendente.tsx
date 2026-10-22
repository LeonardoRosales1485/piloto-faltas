'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { fechaHora } from '@/lib/dominio';
import { CSS_HOJA } from '@/lib/membrete';
import { useRefresco } from '@/lib/use-refresco';
import { hoja } from './Impresion';
import { LoaderLogo } from './LoaderLogo';
import { ModalForm } from './ModalForm';
import { useNotify } from './NotifyProvider';

type R = Record<string, any>;

/**
 * Pantalla del Intendente (decisión 22/10): lo único que hace es firmar los fallos y resoluciones que aprobó la
 * Dirección, o pedir revisión con una observación. A la izquierda la lista; a la derecha el escrito y los botones.
 */
export function FirmaIntendente() {
  const notify = useNotify();
  const [lista, setLista] = useState<{ pendientes: R[]; firmados: R[] } | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [doc, setDoc] = useState<R | null>(null);
  const [revision, setRevision] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(() => {
    http.get<{ pendientes: R[]; firmados: R[] }>('/api/intendente').then((r) => {
      setLista(r);
      setAbierto((a) => (a && r.pendientes.some((p) => p.uuid === a) ? a : r.pendientes[0]?.uuid ?? null));
    }).catch((e: Error) => notify.error('No se pudo cargar', e.message));
  }, [notify]);
  useEffect(() => cargar(), [cargar]);
  useRefresco(cargar);

  useEffect(() => {
    setDoc(null);
    if (!abierto) return;
    http.get<R>(`/api/intendente/${abierto}`).then(setDoc).catch((e: Error) => notify.error('No se pudo abrir el escrito', e.message));
  }, [abierto, notify]);

  async function enviar(accion: 'firmar' | 'revision', observacion?: string) {
    if (!abierto) return;
    setTrabajando(true);
    try {
      const r = await http.post<R>(`/api/intendente/${abierto}`, { accion, observacion });
      notify.success(accion === 'firmar' ? `Firmado${r.numero ? ` · N° ${r.numero}` : ''}` : 'Pedido de revisión enviado a la Dirección');
      setRevision(false);
      setAbierto(null);
      cargar();
    } catch (e) {
      notify.error('No se pudo completar', (e as Error).message);
    } finally {
      setTrabajando(false);
    }
  }

  if (!lista) return <div className="pagina"><LoaderLogo tam={56} texto="Cargando…" /></div>;
  const c = doc?.causa;
  return (
    <div className="pagina firma-intendente">
      <h1 className="visually-hidden">Para firmar</h1>
      <div className="fi-grid">
        <section className="card-step fi-lista" aria-label="Escritos para firmar">
          <div className="card-step-header"><h2>Para firmar</h2><p>{lista.pendientes.length ? `${lista.pendientes.length} escrito(s) aprobados por la Dirección` : 'No hay escritos pendientes de firma.'}</p></div>
          <ul className="lista-items">
            {lista.pendientes.map((p) => (
              <li key={p.uuid} className={p.uuid === abierto ? 'activo' : undefined}>
                <button type="button" className="fi-item" onClick={() => setAbierto(p.uuid)} aria-current={p.uuid === abierto}>
                  <span className="li-titulo">{p.titulo}</span>
                  <span className="li-sub">Acta {p.acta} · {p.tipo} · {p.infractor}</span>
                  <span className="li-sub">Aprobado el {fechaHora(p.desde)}</span>
                </button>
              </li>
            ))}
          </ul>
          {lista.firmados.length ? (
            <>
              <h3 className="subtitulo-paso px-3">Últimos firmados</h3>
              <ul className="lista-items fi-firmados">
                {lista.firmados.map((p) => <li key={p.uuid}><span className="li-sub">{fechaHora(p.firmadoAt)} · {p.titulo}{p.numero ? ` N° ${p.numero}` : ''} · Acta {p.acta}</span></li>)}
              </ul>
            </>
          ) : null}
        </section>
        <section className="card-step fi-doc" aria-label="Escrito">
          {!abierto ? (
            <div className="sin-resultados py-5"><i className="fa-solid fa-circle-check" aria-hidden="true" /><p className="mb-0">No hay nada para firmar. Puede cerrar la sesión.</p></div>
          ) : !doc ? <LoaderLogo tam={48} texto="Abriendo…" /> : (
            <>
              <div className="card-step-header">
                <h2>{doc.documento.titulo}</h2>
                <p>{c.tipo} {c.acta} · {c.infractor}{c.dominio ? ` · Dominio ${c.dominio}` : ''}{c.monto ? ` · Monto ${c.monto}` : ''}</p>
              </div>
              <div className="botonera px-3 pt-2">
                <button type="button" className="btn btn-success btn-lg" disabled={trabajando} onClick={() => void enviar('firmar')}><i className="fa-solid fa-signature" aria-hidden="true" /> Firmar</button>
                <button type="button" className="btn btn-outline-danger btn-lg" disabled={trabajando} onClick={() => setRevision(true)}><i className="fa-solid fa-reply" aria-hidden="true" /> Pedir revisión</button>
              </div>
              <iframe className="fi-hoja" title={doc.documento.titulo} srcDoc={`<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${CSS_HOJA} body{background:#fff;padding:12mm 14mm}</style></head><body>${hoja(doc.documento)}</body></html>`} />
            </>
          )}
        </section>
      </div>
      {revision ? (
        <ModalForm titulo="Pedir revisión" icono="fa-solid fa-reply" textoOk="Enviar a la Dirección" campos={[{ k: 'obs', t: 'Qué hay que revisar', tipo: 'area', req: true }]}
          aviso="El escrito vuelve a la Dirección con su observación. No se firma."
          onCancel={() => setRevision(false)} onOk={(v) => enviar('revision', v.obs)} />
      ) : null}
    </div>
  );
}

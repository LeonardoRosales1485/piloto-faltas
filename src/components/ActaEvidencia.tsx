'use client';

import { useEffect, useState } from 'react';
import { actaHtmlPorTipo } from '@/lib/acta-oficial';
import { hayImpresoraPos, printActa } from '@/lib/print';
import type { Infraccion } from '@/lib/types';
import { textosLeyendas } from '@/lib/leyendas';

const CLAVE = 'faltas-piloto:mostrar-evidencia';

/** Preferencia del usuario (en este navegador) de incluir o no las fotos en el acta. Por defecto, sí. */
export function useMostrarEvidencia(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(true);
  useEffect(() => { try { setV(localStorage.getItem(CLAVE) !== '0'); } catch { /* sin almacenamiento */ } }, []);
  const set = (x: boolean) => { setV(x); try { localStorage.setItem(CLAVE, x ? '1' : '0'); } catch { /* sin almacenamiento */ } };
  return [v, set];
}

/** Botón «Ver acta» con el interruptor «Mostrar evidencia» (incluye o no las fotos de los inspectores). */
export function BotonVerActa({ acta, imagenes, texto = 'Ver acta (PDF)', className = 'btn btn-outline-primary' }: { acta: Infraccion; imagenes: string[]; texto?: string; className?: string }) {
  const [evidencia, setEvidencia] = useMostrarEvidencia();
  const [modal, setModal] = useState(false);
  // Leyendas legales editadas en «Textos del portal» (si no llegan, salen las por defecto).
  useEffect(() => { void textosLeyendas(); }, []);
  // En la app del POS y en pantallas táctiles el acta se ve en un modal: abrir la ventana de impresión deja al
  // usuario atrapado en el visor del WebView (y el POS no imprime A4). En escritorio sigue abriendo el PDF.
  const ver = () => {
    if (hayImpresoraPos() || window.matchMedia('(pointer: coarse)').matches) setModal(true);
    else printActa(acta, { imagenes, evidencia });
  };
  useEffect(() => {
    if (!modal) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setModal(false);
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [modal]);
  return (
    <span className="ver-acta-evidencia">
      {modal ? (
        <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-fake modal-fake-xl" role="dialog" aria-modal="true" aria-label="Acta de Infracción">
            <div className="modal-fake-header">
              <i className="fa-solid fa-file-lines" aria-hidden="true" />
              <h2>Acta de Infracción</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setModal(false)}>&times;</button>
            </div>
            <div className="modal-fake-body">
              <div className="acta-preview-scroll" dangerouslySetInnerHTML={{ __html: (() => { const a = actaHtmlPorTipo(acta, { imagenes, evidencia }); return `<style>${a.css}</style>${a.html}`; })() }} />
            </div>
            <div className="modal-fake-footer">
              <button type="button" className="btn btn-primary" onClick={() => setModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      ) : null}
      <button type="button" className={className} onClick={ver}>
        <i className="fa-solid fa-file-pdf" aria-hidden="true" /> {texto}
      </button>
      <label className="form-check form-switch mb-0" title="Incluir las fotos de la infracción en el acta">
        <input className="form-check-input" type="checkbox" role="switch" checked={evidencia} onChange={(e) => setEvidencia(e.target.checked)} />
        <span className="form-check-label">Mostrar evidencia</span>
      </label>
    </span>
  );
}

/** Miniaturas de las fotos del acta; al tocar una se ve ampliada (con anterior / siguiente). */
export function GaleriaFotos({ imagenes, alto = 96 }: { imagenes: string[]; alto?: number }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const fotos = imagenes.filter(Boolean);
  useEffect(() => {
    if (abierta === null) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierta(null);
      if (e.key === 'ArrowRight') setAbierta((i) => (i === null ? i : (i + 1) % fotos.length));
      if (e.key === 'ArrowLeft') setAbierta((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length));
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [abierta, fotos.length]);
  if (!fotos.length) return null;
  return (
    <>
      <div className="galeria-fotos">
        {fotos.map((src, i) => (
          <button key={i} type="button" className="galeria-mini" onClick={() => setAbierta(i)} aria-label={`Ver imagen ampliada ${i + 1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Imagen ${i + 1} de la infracción`} style={{ height: alto }} />
            <span><i className="fa-solid fa-magnifying-glass-plus" aria-hidden="true" /></span>
          </button>
        ))}
      </div>
      {abierta !== null ? (
        <div className="galeria-visor" role="dialog" aria-modal="true" aria-label="Imagen ampliada" onClick={(e) => e.target === e.currentTarget && setAbierta(null)}>
          <button type="button" className="galeria-cerrar" aria-label="Cerrar" onClick={() => setAbierta(null)}>&times;</button>
          {fotos.length > 1 ? <button type="button" className="galeria-nav izq" aria-label="Anterior" onClick={() => setAbierta((abierta - 1 + fotos.length) % fotos.length)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fotos[abierta]} alt={`Imagen ${abierta + 1} de la infracción`} />
          {fotos.length > 1 ? <button type="button" className="galeria-nav der" aria-label="Siguiente" onClick={() => setAbierta((abierta + 1) % fotos.length)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button> : null}
          <span className="galeria-num">{abierta + 1} / {fotos.length}</span>
        </div>
      ) : null}
    </>
  );
}

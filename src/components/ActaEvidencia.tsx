'use client';

import { useEffect, useState } from 'react';
import { printActa } from '@/lib/print';
import type { Infraccion } from '@/lib/types';

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
  return (
    <span className="ver-acta-evidencia">
      <button type="button" className={className} onClick={() => printActa(acta, { imagenes, evidencia })}>
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

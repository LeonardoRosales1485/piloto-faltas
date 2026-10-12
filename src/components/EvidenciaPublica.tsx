'use client';

import { useState } from 'react';
import { GaleriaFotos } from './ActaEvidencia';

/** Link público del acta: botón «Evidencias» que muestra las fotos tomadas por el inspector (sin datos personales). */
export function EvidenciaPublica({ imagenes }: { imagenes: string[] }) {
  const [ver, setVer] = useState(false);
  if (!imagenes.length) return null;
  return (
    <div className="mt-3 text-start">
      <button type="button" className="btn btn-outline-primary w-100" onClick={() => setVer((v) => !v)} aria-expanded={ver}>
        <i className="fa-solid fa-images" aria-hidden="true" /> {ver ? 'Ocultar evidencias' : `Evidencias (${imagenes.length})`}
      </button>
      {ver ? <div className="mt-2"><GaleriaFotos imagenes={imagenes} alto={110} /></div> : null}
    </div>
  );
}

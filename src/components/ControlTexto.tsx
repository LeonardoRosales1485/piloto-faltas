'use client';

import { ETIQUETA_TEXTO, useTamanoTexto, type NivelTexto } from '@/lib/texto';
import { NIVELES_TEXTO } from '@/lib/contraste-script';

const BOTONES: { n: NivelTexto; t: string }[] = [
  { n: 'normal', t: 'A' },
  { n: 'grande', t: 'A+' },
  { n: 'muy-grande', t: 'A++' },
];

/** Grupo «Tamaño de texto»: tres botones (A / A+ / A++) con aria-pressed (A11Y paso 5). */
export function ControlTexto({ className = '', botonClase = '' }: { className?: string; botonClase?: string }) {
  const [nivel, elegir] = useTamanoTexto();
  return (
    <div className={`control-texto ${className}`.trim()} role="group" aria-label="Tamaño de texto">
      {BOTONES.map((b) => (
        <button key={b.n} type="button" className={`control-texto-btn ${botonClase}`.trim()} aria-pressed={nivel === b.n} aria-label={`Texto ${ETIQUETA_TEXTO[b.n]}`} title={`Texto ${ETIQUETA_TEXTO[b.n]}`} onClick={() => elegir(b.n)}>
          {b.t}
        </button>
      ))}
    </div>
  );
}

/** Versión de un solo botón (rail y barra del inspector): pasa al tamaño siguiente. */
export function BotonTexto({ className = '' }: { className?: string }) {
  const [nivel, elegir] = useTamanoTexto();
  const i = NIVELES_TEXTO.indexOf(nivel);
  const siguiente = NIVELES_TEXTO[(i + 1) % NIVELES_TEXTO.length];
  return (
    <button type="button" className={`boton-texto ${className}`.trim()} aria-label={`Tamaño de texto: ${ETIQUETA_TEXTO[nivel]}. Cambiar a ${ETIQUETA_TEXTO[siguiente]}`} title={`Tamaño de texto: ${ETIQUETA_TEXTO[nivel]}`} onClick={() => elegir(siguiente)}>
      <i className="fa-solid fa-text-height" aria-hidden="true" />
      {nivel !== 'normal' ? <span className="boton-texto-nivel" aria-hidden="true">{nivel === 'grande' ? '+' : '++'}</span> : null}
    </button>
  );
}

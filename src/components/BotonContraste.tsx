'use client';

import { useContraste } from '@/lib/contraste';

/**
 * Botón «Alto contraste» (A11Y paso 4). El nombre es fijo y el estado va en aria-pressed.
 * `conTexto` muestra la etiqueta; `textoClase` permite ocultarla en pantallas chicas.
 */
export function BotonContraste({ className = '', conTexto = false, textoClase = '' }: { className?: string; conTexto?: boolean; textoClase?: string }) {
  const [alto, alternar] = useContraste();
  return (
    <button
      type="button"
      className={`boton-contraste ${className}`.trim()}
      aria-pressed={alto}
      aria-label="Alto contraste"
      title={alto ? 'Alto contraste: activado' : 'Alto contraste: desactivado'}
      onClick={alternar}
    >
      <i className="fa-solid fa-circle-half-stroke" aria-hidden="true" />
      {conTexto ? <span className={textoClase || undefined}>Alto contraste</span> : null}
    </button>
  );
}

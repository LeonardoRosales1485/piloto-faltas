'use client';

import { useCallback, useEffect, useState } from 'react';
import { CLAVE_CONTRASTE, MEDIA_CONTRASTE } from './contraste-script';

/**
 * Modo alto contraste (A11Y paso 4). Se guarda en este navegador como el tema claro/oscuro.
 * Sin elección guardada sigue a la preferencia del sistema `prefers-contrast: more`.
 * Se aplica como `<html data-contrast="high">`; el script de `layout.tsx` lo pone antes de pintar.
 */
export type Contraste = 'high' | 'normal';

const EVENTO = 'faltas:contraste';
const MEDIA = MEDIA_CONTRASTE;

export function contrasteGuardado(): Contraste | null {
  try {
    const v = localStorage.getItem(CLAVE_CONTRASTE);
    return v === 'high' || v === 'normal' ? v : null;
  } catch {
    return null;
  }
}

function delSistema(): Contraste {
  return typeof window !== 'undefined' && window.matchMedia?.(MEDIA).matches ? 'high' : 'normal';
}

function aplicar(c: Contraste) {
  document.documentElement.setAttribute('data-contrast', c);
  window.dispatchEvent(new Event(EVENTO));
}

/** Estado del modo y función para alternarlo (la elección explícita queda guardada). */
export function useContraste(): [boolean, () => void] {
  const [alto, setAlto] = useState(false);
  useEffect(() => {
    const leer = () => setAlto(document.documentElement.getAttribute('data-contrast') === 'high');
    if (!document.documentElement.hasAttribute('data-contrast')) aplicar(contrasteGuardado() ?? delSistema());
    leer();
    const mq = window.matchMedia?.(MEDIA);
    const alCambiarSistema = () => { if (!contrasteGuardado()) aplicar(delSistema()); };
    window.addEventListener(EVENTO, leer);
    mq?.addEventListener?.('change', alCambiarSistema);
    return () => {
      window.removeEventListener(EVENTO, leer);
      mq?.removeEventListener?.('change', alCambiarSistema);
    };
  }, []);
  const alternar = useCallback(() => {
    const next: Contraste = document.documentElement.getAttribute('data-contrast') === 'high' ? 'normal' : 'high';
    try { localStorage.setItem(CLAVE_CONTRASTE, next); } catch { /* sin almacenamiento */ }
    aplicar(next);
  }, []);
  return [alto, alternar];
}

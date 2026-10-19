'use client';

import { useCallback, useEffect, useState } from 'react';
import { CLAVE_TEXTO, NIVELES_TEXTO } from './contraste-script';

/**
 * Tamaño de texto (A11Y paso 5): normal (100 %), grande (112,5 %) y muy grande (137,5 %).
 * Se aplica como `<html data-text-size="…">` y escala todo lo que está en rem; las hojas A4,
 * el ticket y la impresión usan pt/mm fijos y no cambian. Se guarda en este navegador.
 */
export type NivelTexto = (typeof NIVELES_TEXTO)[number];

export const ETIQUETA_TEXTO: Record<NivelTexto, string> = { normal: 'normal', grande: 'grande', 'muy-grande': 'muy grande' };
const EVENTO = 'faltas:texto';

function leerNivel(): NivelTexto {
  const v = document.documentElement.getAttribute('data-text-size');
  return (NIVELES_TEXTO as readonly string[]).includes(v ?? '') ? (v as NivelTexto) : 'normal';
}

export function useTamanoTexto(): [NivelTexto, (n: NivelTexto) => void] {
  const [nivel, setNivel] = useState<NivelTexto>('normal');
  useEffect(() => {
    if (!document.documentElement.hasAttribute('data-text-size')) {
      let v: string | null = null;
      try { v = localStorage.getItem(CLAVE_TEXTO); } catch { /* sin almacenamiento */ }
      document.documentElement.setAttribute('data-text-size', (NIVELES_TEXTO as readonly string[]).includes(v ?? '') ? (v as string) : 'normal');
    }
    const leer = () => setNivel(leerNivel());
    leer();
    window.addEventListener(EVENTO, leer);
    return () => window.removeEventListener(EVENTO, leer);
  }, []);
  const elegir = useCallback((n: NivelTexto) => {
    try { localStorage.setItem(CLAVE_TEXTO, n); } catch { /* sin almacenamiento */ }
    document.documentElement.setAttribute('data-text-size', n);
    window.dispatchEvent(new Event(EVENTO));
  }, []);
  return [nivel, elegir];
}

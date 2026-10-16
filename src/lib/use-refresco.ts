'use client';

import { useEffect, useRef } from 'react';
import { canalDatos, EVENTO_DATOS } from './avisos-datos';

/**
 * Vuelve a cargar los datos de la pantalla sin F5: después de cualquier acción que cambie datos (en esta pestaña o
 * en otra), al volver a la pestaña o a la ventana, y cada `cadaMs` mientras la pestaña está visible (para ver lo que
 * hacen otros usuarios o el infractor en el portal). La función debería cargar «en silencio» (sin pantalla de carga).
 */
export function useRefresco(cargar: () => void, cadaMs = 20_000) {
  const ref = useRef(cargar);
  ref.current = cargar;
  useEffect(() => {
    let ultimo = Date.now();
    const correr = () => {
      if (document.visibilityState !== 'visible') return;
      const ahora = Date.now();
      if (ahora - ultimo < 1500) return;
      ultimo = ahora;
      ref.current();
    };
    const onVisible = () => { if (document.visibilityState === 'visible') correr(); };
    const c = canalDatos();
    window.addEventListener('focus', correr);
    window.addEventListener(EVENTO_DATOS, correr);
    document.addEventListener('visibilitychange', onVisible);
    c?.addEventListener('message', correr);
    const id = window.setInterval(correr, cadaMs);
    return () => {
      window.removeEventListener('focus', correr);
      window.removeEventListener(EVENTO_DATOS, correr);
      document.removeEventListener('visibilitychange', onVisible);
      c?.removeEventListener('message', correr);
      window.clearInterval(id);
    };
  }, [cadaMs]);
}

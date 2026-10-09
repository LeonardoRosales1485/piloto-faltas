'use client';

import { useCallback, useState } from 'react';

/** Marca «cargando» mientras haya pedidos al servidor en curso: const [cargando, seguir] = useCarga(); seguir(http.get(...)) */
export function useCarga() {
  const [n, setN] = useState(0);
  const seguir = useCallback(<T,>(p: Promise<T>): Promise<T> => {
    setN((x) => x + 1);
    return p.finally(() => setN((x) => Math.max(0, x - 1)));
  }, []);
  return [n > 0, seguir] as const;
}

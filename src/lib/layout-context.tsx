'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type LayoutContextValue = {
  ocultarTopbar: boolean;
  setOcultarTopbar: (v: boolean) => void;
  isMobile: boolean;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [ocultarTopbar, setOcultarTopbar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 992);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const value = useMemo(
    () => ({ ocultarTopbar, setOcultarTopbar, isMobile }),
    [ocultarTopbar, isMobile],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider');
  return ctx;
}

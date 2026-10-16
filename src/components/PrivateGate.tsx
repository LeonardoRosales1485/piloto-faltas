'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LoaderLogo } from './LoaderLogo';
import { useEffect, useState, type ReactNode } from 'react';
import { getToken, subscribeAuth, TOKEN_KEY } from '@/lib/auth-client';
import { Shell } from './Shell';

/**
 * Protege todas las pantallas de /private: sin sesión, al login. Se vuelve a controlar al cambiar de pantalla,
 * al cerrar la sesión (en esta u otra pestaña), al volver a la pestaña y al regresar con «Atrás» desde la caché del
 * navegador. Las llamadas a la API que responden 401 también mandan al login (api-client).
 */
export function PrivateGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const alLogin = () => {
      setReady(false);
      router.replace('/login');
    };
    const controlar = () => {
      if (!getToken()) alLogin();
    };
    controlar();
    if (getToken()) setReady(true);
    const desuscribir = subscribeAuth((u) => { if (!u && !getToken()) alLogin(); });
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) controlar(); };
    const onStorage = (e: StorageEvent) => { if (e.key === TOKEN_KEY || e.key === null) controlar(); };
    const onVisible = () => { if (document.visibilityState === 'visible') controlar(); };
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      desuscribir();
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router, pathname]);

  if (!ready) {
    return <LoaderLogo pantalla />;
  }

  return <Shell>{children}</Shell>;
}

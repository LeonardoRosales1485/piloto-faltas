'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { nombrePerfil, portalPerfil, portalToken, rutaPortalPrivada, salirPortal, type Perfil } from '@/lib/portal-client';

/** Marco del portal de infractores: simple, legible en celular. */
export function PortalLayout({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  useEffect(() => setPerfil(portalPerfil()), []);

  // Protección de sesión (QA AUTH-CONT-10): sin sesión, una pantalla privada vuelve al ingreso. Se controla al abrir,
  // al volver con «Atrás» desde la caché del navegador, al volver a la pestaña y al salir en otra pestaña.
  useEffect(() => {
    let conSesion = Boolean(portalToken());
    const controlar = () => {
      const hay = Boolean(portalToken());
      const path = window.location.pathname;
      if (!hay && rutaPortalPrivada(path)) { window.location.replace(`/portal?volver=${encodeURIComponent(path)}`); return; }
      if (!hay && conSesion) { window.location.replace('/portal'); return; }
      conSesion = hay;
    };
    controlar();
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) controlar(); };
    const onVisible = () => { if (document.visibilityState === 'visible') controlar(); };
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('storage', controlar);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('storage', controlar);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return (
    <div className="portal-body">
      <header className="portal-header">
        <div className="portal-header-inner">
          <Link href="/portal" className="d-flex align-items-center gap-2 text-decoration-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/Municipio_malvinas_argentinas_logo.png" alt="Municipalidad de Malvinas Argentinas" />
            <div><strong>Portal de Infractores</strong><span>Dirección de Faltas · Malvinas Argentinas</span></div>
          </Link>
          {perfil ? (
            <div className="portal-usuario">
              <Link href="/portal/perfil" className="text-decoration-none" aria-label={`Mi perfil (${nombrePerfil(perfil)})`}><i className="fa-solid fa-circle-user" aria-hidden="true" /> <span className="d-none d-sm-inline">{nombrePerfil(perfil)}</span></Link>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={salirPortal}>Salir</button>
            </div>
          ) : null}
        </div>
      </header>
      <main className="portal-main">{children}</main>
      <footer className="portal-footer">Municipalidad de Malvinas Argentinas · Dirección de Faltas · Piloto</footer>
    </div>
  );
}

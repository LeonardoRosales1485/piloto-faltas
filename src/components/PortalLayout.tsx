'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { nombrePerfil, portalPerfil, salirPortal, type Perfil } from '@/lib/portal-client';

/** Marco del portal de infractores: simple, legible en celular. */
export function PortalLayout({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  useEffect(() => setPerfil(portalPerfil()), []);
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
              <Link href="/portal/perfil" className="text-decoration-none"><i className="fa-solid fa-circle-user" aria-hidden="true" /> <span className="d-none d-sm-inline">{nombrePerfil(perfil)}</span></Link>
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

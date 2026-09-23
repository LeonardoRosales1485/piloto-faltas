'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { logout } from '@/lib/auth-client';
import { LayoutProvider, useLayout } from '@/lib/layout-context';
import { inspectorForbidden } from '@/lib/role-guard';
import { useAuthUser } from '@/lib/use-auth-user';

interface MenuChild {
  titulo: string;
  route: string;
}

interface MenuGroup {
  id: string;
  titulo: string;
  icono: string;
  route?: string;
  children?: MenuChild[];
}

const GRUPOS: MenuGroup[] = [
  {
    id: 'multas',
    titulo: 'Multas transito',
    icono: 'fa-solid fa-car',
    children: [
      { titulo: 'Listado', route: '/private/lista-infracciones/multas' },
      { titulo: 'Nueva', route: '/private/crear-editar/multas' },
    ],
  },
  {
    id: 'contravenciones',
    titulo: 'Multas contravencion',
    icono: 'fa-solid fa-gavel',
    children: [
      { titulo: 'Listado', route: '/private/lista-infracciones/contravenciones' },
      { titulo: 'Nueva', route: '/private/crear-editar/contravenciones' },
    ],
  },
  {
    id: 'ordenanzas',
    titulo: 'Ordenanzas',
    icono: 'fa-solid fa-scale-balanced',
    children: [
      { titulo: 'Tránsito', route: '/private/ordenanzas/multas' },
      { titulo: 'Contravención', route: '/private/ordenanzas/contravenciones' },
    ],
  },
  { id: 'inspectores', titulo: 'Inspectores', icono: 'fa-solid fa-users', route: '/private/proximamente/inspectores' },
  { id: 'finanzas', titulo: 'Finanzas', icono: 'fa-solid fa-coins', route: '/private/finanzas' },
  { id: 'gps', titulo: 'GPS', icono: 'fa-solid fa-location-dot', route: '/private/proximamente/gps' },
  { id: 'escritos', titulo: 'Administrar Escritos', icono: 'fa-solid fa-file-lines', route: '/private/proximamente/escritos' },
  { id: 'retenciones', titulo: 'Retenciones', icono: 'fa-solid fa-hand-holding-dollar', route: '/private/proximamente/retenciones' },
];

const TITULOS: Record<string, string> = {
  '/private/lista-infracciones/multas': 'Multas transito',
  '/private/lista-infracciones/contravenciones': 'Multas contravencion',
  '/private/crear-editar/multas': 'Nueva multa',
  '/private/crear-editar/contravenciones': 'Nueva contravención',
  '/private/finanzas': 'Finanzas',
  '/private/ordenanzas/multas': 'Ordenanzas',
  '/private/ordenanzas/contravenciones': 'Ordenanzas',
};

function ShellInner({ children }: { children: ReactNode }) {
  const user = useAuthUser();
  const layout = useLayout();
  const pathname = usePathname();
  const router = useRouter();
  const year = new Date().getFullYear();
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({
    multas: true,
    contravenciones: true,
    ordenanzas: true,
  });
  const [sidebarAbierta, setSidebarAbierta] = useState(true);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [tema, setTema] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('faltas-piloto:tema');
    const next = saved === 'dark' ? 'dark' : 'light';
    setTema(next);
    document.body.setAttribute('data-theme', next);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 992) {
      setSidebarAbierta(true);
    }
  }, []);

  useEffect(() => {
    if (layout.isMobile) setDrawerAbierto(false);
  }, [pathname, layout.isMobile]);

  useEffect(() => {
    if (inspectorForbidden(pathname, user?.rol)) {
      router.replace('/private/lista-infracciones/multas');
    }
  }, [pathname, user?.rol, router]);

  const gruposVisibles = useMemo(() => {
    if (user?.rol === 'Inspector') {
      return GRUPOS.filter((g) => g.id === 'multas' || g.id === 'contravenciones');
    }
    return GRUPOS;
  }, [user?.rol]);

  const margen = layout.isMobile ? 0 : sidebarAbierta ? 280 : 52;

  function grupoActivo(grupo: MenuGroup) {
    if (grupo.route) return pathname.startsWith(grupo.route);
    return grupo.children?.some((c) => pathname === c.route || pathname.startsWith(`${c.route}/`)) ?? false;
  }

  function toggle(id: string) {
    setAbiertos((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function alternarTema() {
    const next = tema === 'light' ? 'dark' : 'light';
    setTema(next);
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('faltas-piloto:tema', next);
  }

  function rolCorto() {
    const rol = user?.rol ?? 'Usuario';
    const lower = rol.toLowerCase();
    if (lower.includes('admin')) return 'ADMIN';
    if (lower.includes('super')) return 'SUPER';
    if (lower.includes('oper')) return 'OPER';
    return rol.length > 8 ? `${rol.slice(0, 6)}…` : rol;
  }

  function titulo() {
    const path = pathname.split('?')[0];
    if (TITULOS[path]) return TITULOS[path];
    if (path.startsWith('/private/proximamente/')) {
      const segmento = path.split('/').filter(Boolean).pop() ?? '';
      const nombres: Record<string, string> = {
        inspectores: 'Inspectores',
        gps: 'GPS',
        escritos: 'Administrar Escritos',
        retenciones: 'Retenciones',
      };
      return nombres[segmento] ?? 'Próximamente';
    }
    if (path.startsWith('/private/crear-editar/') && path.split('/').length > 4) return 'Editar infracción';
    if (path.startsWith('/private/ordenanzas/') && path.split('/').length > 4) return 'Editar ordenanza';
    return 'Sistema de Faltas';
  }

  function tipoMulta(): 'multas' | 'contravenciones' | null {
    if (pathname.includes('/multas')) return 'multas';
    if (pathname.includes('/contravenciones')) return 'contravenciones';
    return null;
  }

  const enCrearEditar = pathname.startsWith('/private/crear-editar/');
  const tipo = tipoMulta();

  const menu = (
    <>
      <div className="sidebar-brand-v2">
        <div className="sidebar-brand-logo">
          <i className="fa-solid fa-shield-halved" aria-hidden="true" />
        </div>
        <div className="sidebar-brand-texto">
          <strong>SISTEMA DE FALTAS</strong>
          <span>Municipalidad de Malvinas Argentinas</span>
        </div>
        {!layout.isMobile ? (
          <button
            type="button"
            className="sidebar-colapsar"
            aria-label={sidebarAbierta ? 'Colapsar menú' : 'Expandir menú'}
            onClick={() => setSidebarAbierta((v) => !v)}
          >
            <i
              className={`fa-solid ${sidebarAbierta ? 'fa-chevron-left' : 'fa-chevron-right'}`}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>

      <div className="sidebar-admin">
        <span className="sidebar-admin-avatar">
          <i className="fa-solid fa-user" aria-hidden="true" />
        </span>
        <div className="sidebar-rol-pill">{rolCorto()}</div>
      </div>

      <div className="sidebar-cuerpo-v2">
        <div className="sidebar-nav-titulo">NAVEGACIÓN:</div>
        {gruposVisibles.map((grupo) =>
          grupo.children ? (
            <div
              key={grupo.id}
              className={`sidebar-grupo ${abiertos[grupo.id] ? 'abierto' : ''} ${grupoActivo(grupo) ? 'activo' : ''}`}
            >
              <button type="button" className="sidebar-grupo-header" onClick={() => toggle(grupo.id)}>
                <span className="sidebar-grupo-titulo">
                  <i className={grupo.icono} aria-hidden="true" />
                  <span>{grupo.titulo}</span>
                </span>
                <i className="fa-solid fa-chevron-down sidebar-grupo-chevron" aria-hidden="true" />
              </button>
              {abiertos[grupo.id] ? (
                <div className="sidebar-grupo-body">
                  {grupo.children.map((child) => (
                    <Link
                      key={child.route}
                      href={child.route}
                      className={`sidebar-link ${pathname === child.route ? 'active' : ''}`}
                      onClick={() => layout.isMobile && setDrawerAbierto(false)}
                    >
                      {child.titulo}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              key={grupo.id}
              href={grupo.route!}
              className={`sidebar-grupo-header sidebar-grupo-simple ${pathname.startsWith(grupo.route!) ? 'active' : ''}`}
              onClick={() => layout.isMobile && setDrawerAbierto(false)}
            >
              <span className="sidebar-grupo-titulo">
                <i className={grupo.icono} aria-hidden="true" />
                <span>{grupo.titulo}</span>
              </span>
            </Link>
          ),
        )}
        <button type="button" className="sidebar-salir" onClick={() => logout()}>
          <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
          <span>Salir</span>
        </button>
      </div>

      <div className="sidebar-footer-v2">
        <div className="sidebar-tema">
          <span>Tema</span>
          <button type="button" className="sidebar-tema-btn" onClick={alternarTema}>
            {tema === 'light' ? (
              <>
                <i className="fa-solid fa-sun" aria-hidden="true" /> Claro
              </>
            ) : (
              <>
                <i className="fa-solid fa-moon" aria-hidden="true" /> Oscuro
              </>
            )}
          </button>
        </div>
        <div className="sidebar-version">
          <span>© {year} Blue Open Data</span>
          <span>
            {fecha} | V:1.0.0
          </span>
        </div>
      </div>
    </>
  );

  return (
    <div className={`layout-privado ${layout.isMobile ? 'layout-movil' : ''}`}>
      {layout.isMobile ? (
        <>
          <div className="sidebar-movil-topbar">
            <div className="sidebar-movil-brand">
              <div className="sidebar-bo sidebar-bo-movil">
                <i className="fa-solid fa-shield-halved" aria-hidden="true" />
              </div>
              <div className="sidebar-movil-texto">
                <strong>SISTEMA DE FALTAS</strong>
                <span>Municipalidad de Malvinas Argentinas</span>
              </div>
            </div>
            <div className="sidebar-movil-usuario">
              {user ? (
                <span className="sidebar-movil-nombre">
                  <i className="fa-solid fa-user-circle" aria-hidden="true" />
                  {user.nombre} {user.apellido}
                </span>
              ) : null}
              <button
                type="button"
                className="sidebar-movil-hamburguesa"
                aria-label="Abrir menú"
                onClick={() => setDrawerAbierto(true)}
              >
                <i className="fa-solid fa-bars" aria-hidden="true" />
              </button>
            </div>
          </div>
          {drawerAbierto ? (
            <>
              <div className="sidebar-backdrop" onClick={() => setDrawerAbierto(false)} aria-hidden="true" />
              <aside className="sidebar sidebar-movil-drawer sidebar-abierta">
                <div className="sidebar-movil-cerrar">
                  <button type="button" aria-label="Cerrar menú" onClick={() => setDrawerAbierto(false)}>
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </div>
                {menu}
              </aside>
            </>
          ) : null}
        </>
      ) : (
        <aside
          className={`sidebar sidebar-desktop ${sidebarAbierta ? 'sidebar-abierta' : ''}`}
          aria-label="Menú lateral"
        >
          {menu}
        </aside>
      )}

      <main className="layout-contenido" style={{ marginLeft: margen }}>
        {!layout.ocultarTopbar ? (
          <header className={`top-navbar ${layout.isMobile ? 'top-navbar-movil' : ''}`}>
            <div className="top-navbar-titulo">
              <i className="fa-solid fa-file-invoice" aria-hidden="true" />
              <span>{titulo()}</span>
            </div>
            <div className="top-navbar-acciones">
              {tipo && !enCrearEditar ? (
                <button type="button" className="btn-nueva" onClick={() => router.push(`/private/crear-editar/${tipo}`)}>
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                  <span>{tipo === 'multas' ? 'Nueva multa' : 'Nueva contravención'}</span>
                </button>
              ) : null}
            </div>
          </header>
        ) : null}
        {children}
      </main>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <LayoutProvider>
      <ShellInner>{children}</ShellInner>
    </LayoutProvider>
  );
}

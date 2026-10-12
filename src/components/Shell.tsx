'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { logout } from '@/lib/auth-client';
import { LayoutProvider, useLayout } from '@/lib/layout-context';
import { inicioPara, inspectorForbidden } from '@/lib/role-guard';
import { modulosDe, puede, ROL_ETIQUETA, tipoIdDe, tiposPermitidos, type Permiso } from '@/lib/dominio';
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

type MenuItem = MenuGroup & { permiso: Permiso };

const GRUPOS: MenuItem[] = [
  { id: 'causas', titulo: 'Causas', icono: 'fa-solid fa-folder-tree', route: '/private/causas', permiso: 'verCausas' },
  { id: 'presentaciones', titulo: 'Presentaciones', icono: 'fa-solid fa-inbox', route: '/private/presentaciones', permiso: 'verCausas' },
  { id: 'escritos', titulo: 'Escritos y firma', icono: 'fa-solid fa-file-signature', route: '/private/escritos', permiso: 'verCausas' },
  { id: 'pagos', titulo: 'Pagos', icono: 'fa-solid fa-money-check-dollar', route: '/private/pagos', permiso: 'verCausas' },
  {
    id: 'multas',
    titulo: 'Actas de tránsito',
    icono: 'fa-solid fa-car',
    permiso: 'labrar',
    children: [
      { titulo: 'Mis borradores', route: '/private/lista-infracciones/multas' },
      { titulo: 'Labrar acta', route: '/private/crear-editar/multas' },
    ],
  },
  {
    id: 'contravenciones',
    titulo: 'Actas de contravención',
    icono: 'fa-solid fa-gavel',
    permiso: 'labrar',
    children: [
      { titulo: 'Mis borradores', route: '/private/lista-infracciones/contravenciones' },
      { titulo: 'Labrar acta', route: '/private/crear-editar/contravenciones' },
    ],
  },
  {
    id: 'sustancias',
    titulo: 'Sustancias alimenticias',
    icono: 'fa-solid fa-truck',
    permiso: 'labrar',
    children: [
      { titulo: 'Mis borradores', route: '/private/lista-infracciones/sustancias' },
      { titulo: 'Labrar acta', route: '/private/crear-editar/sustancias' },
    ],
  },
  {
    id: 'ordenanzas',
    titulo: 'Ordenanzas',
    icono: 'fa-solid fa-book-open',
    permiso: 'ordenanzas',
    children: [
      { titulo: 'Tránsito', route: '/private/ordenanzas/multas' },
      { titulo: 'Contravenciones', route: '/private/ordenanzas/contravenciones' },
      { titulo: 'Sustancias alimenticias', route: '/private/ordenanzas/sustancias' },
    ],
  },
  { id: 'inspectores', titulo: 'Inspectores', icono: 'fa-solid fa-id-badge', route: '/private/inspectores', permiso: 'inspectores' },
  { id: 'gps', titulo: 'Seguimiento GPS', icono: 'fa-solid fa-location-crosshairs', route: '/private/seguimiento-gps', permiso: 'inspectores' },
  { id: 'reportes', titulo: 'Reportes', icono: 'fa-solid fa-chart-column', route: '/private/reportes', permiso: 'verCausas' },
  { id: 'finanzas', titulo: 'Valores y tarifas', icono: 'fa-solid fa-coins', route: '/private/finanzas', permiso: 'valores' },
  {
    id: 'config',
    titulo: 'Configuración',
    icono: 'fa-solid fa-sliders',
    permiso: 'parametrizar',
    children: [
      { titulo: 'Plantillas de escritos', route: '/private/plantillas' },
      { titulo: 'Textos del portal', route: '/private/textos' },
      { titulo: 'Feriados', route: '/private/feriados' },
      { titulo: 'Usuarios', route: '/private/usuarios' },
      { titulo: 'Marcas y modelos', route: '/private/marcas-modelos' },
      { titulo: 'Opciones sandbox', route: '/private/sandbox' },
    ],
  },
  { id: 'correos', titulo: 'Correos enviados', icono: 'fa-solid fa-envelope', route: '/private/correos', permiso: 'verCausas' },
  { id: 'auditoria', titulo: 'Auditoría', icono: 'fa-solid fa-user-shield', route: '/private/auditoria', permiso: 'auditoria' },
];

const TITULOS: Record<string, string> = {
  '/private/lista-infracciones/multas': 'Actas de tránsito',
  '/private/lista-infracciones/contravenciones': 'Actas de contravención',
  '/private/lista-infracciones/sustancias': 'Actas de sustancias alimenticias',
  '/private/crear-editar/multas': 'Acta de tránsito',
  '/private/crear-editar/contravenciones': 'Acta de contravención',
  '/private/crear-editar/sustancias': 'Acta de sustancias alimenticias',
  '/private/finanzas': 'Valores y tarifas',
  '/private/ordenanzas/multas': 'Ordenanzas',
  '/private/ordenanzas/contravenciones': 'Ordenanzas',
  '/private/ordenanzas/sustancias': 'Ordenanzas',
  '/private/causas': 'Causas',
  '/private/causa': 'Causa digital',
  '/private/presentaciones': 'Presentaciones',
  '/private/escritos': 'Escritos y firma',
  '/private/escrito': 'Escrito',
  '/private/pagos': 'Pagos',
  '/private/reportes': 'Reportes',
  '/private/plantillas': 'Plantillas de escritos',
  '/private/textos': 'Textos del portal',
  '/private/feriados': 'Feriados',
  '/private/usuarios': 'Usuarios',
  '/private/marcas-modelos': 'Marcas y modelos',
  '/private/inspectores': 'Inspectores',
  '/private/seguimiento-gps': 'Seguimiento GPS',
  '/private/sandbox': 'Opciones sandbox',
  '/private/correos': 'Correos enviados',
  '/private/auditoria': 'Auditoría',
};

function ShellInner({ children }: { children: ReactNode }) {
  const user = useAuthUser();
  const layout = useLayout();
  const pathname = usePathname();
  const router = useRouter();

  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({
    multas: true,
    contravenciones: true,
    sustancias: true,
    config: false,
  });
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [tema, setTema] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('faltas-piloto:tema');
    const next = saved === 'dark' ? 'dark' : 'light';
    setTema(next);
    document.body.setAttribute('data-theme', next);
  }, []);

  // El menú desplegado flota sobre el contenido: se cierra al navegar o con Escape.
  // Cierre animado: el menú queda montado mientras corre la animación de salida.
  const [cerrando, setCerrando] = useState(false);
  const timerCierre = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cerrarSidebar = useCallback(() => {
    if (timerCierre.current) return;
    setCerrando(true);
    timerCierre.current = setTimeout(() => {
      setSidebarAbierta(false);
      setCerrando(false);
      timerCierre.current = null;
    }, 200);
  }, []);
  useEffect(() => cerrarSidebar(), [pathname, cerrarSidebar]);
  useEffect(() => {
    if (!sidebarAbierta) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cerrarSidebar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarAbierta, cerrarSidebar]);

  useEffect(() => {
    if (layout.isMobile) setDrawerAbierto(false);
  }, [pathname, layout.isMobile]);

  useEffect(() => {
    if (inspectorForbidden(pathname, user?.rol, user)) {
      router.replace(inicioPara(user?.rol, user?.sector, user?.modulosActa));
    }
  }, [pathname, user?.rol, router]);

  const gruposVisibles = useMemo(() => {
    const modulos = modulosDe(user) as string[];
    const alcance = tiposPermitidos(user?.rol);
    return GRUPOS.filter((g) => puede(user?.rol, g.permiso) && (g.permiso !== 'labrar' || modulos.includes(g.id))).map((g) =>
      g.id === 'ordenanzas' && alcance
        ? { ...g, children: g.children?.filter((c) => alcance.includes(tipoIdDe(c.route!.split('/').pop()))) }
        : g,
    );
  }, [user]);

  const margen = layout.isMobile ? 0 : 72;

  function grupoActivo(grupo: MenuGroup) {
    if (grupo.route) return pathname.startsWith(grupo.route);
    return grupo.children?.some((c) => pathname === c.route || pathname.startsWith(`${c.route}/`)) ?? false;
  }

  function toggle(id: string) {
    setAbiertos((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function alternarTema() {
    const next = tema === 'light' ? 'dark' : 'light';
    const aplicar = () => {
      setTema(next);
      document.body.setAttribute('data-theme', next);
      try { localStorage.setItem('faltas-piloto:tema', next); } catch { /* sin almacenamiento */ }
    };
    const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (!reducir && doc.startViewTransition) {
      // Fundido entre el tema anterior y el nuevo (navegadores con View Transitions).
      doc.startViewTransition(() => flushSync(aplicar));
      return;
    }
    // Alternativa: transición de colores en todos los elementos durante el cambio.
    document.documentElement.classList.add('tema-transicion');
    aplicar();
    window.setTimeout(() => document.documentElement.classList.remove('tema-transicion'), 450);
  }

  function rolCorto() {
    return ROL_ETIQUETA[user?.rol ?? ''] ?? user?.rol ?? '';
  }

  function titulo() {
    const path = pathname.split('?')[0];
    if (TITULOS[path]) return TITULOS[path];
    if (path.startsWith('/private/crear-editar/')) return TITULOS[path.split('/').slice(0, 4).join('/')] ?? 'Acta';
    if (path.startsWith('/private/ordenanzas/') && path.split('/').length > 4) return 'Editar ordenanza';
    const base = '/' + path.split('/').filter(Boolean).slice(0, 2).join('/');
    return TITULOS[base] ?? 'Sistema de Faltas';
  }

  function tipoMulta(): 'multas' | 'contravenciones' | 'sustancias' | null {
    if (!pathname.startsWith('/private/lista-infracciones/')) return null;
    if (!puede(user?.rol, 'labrar')) return null;
    if (pathname.includes('/multas')) return 'multas';
    if (pathname.includes('/contravenciones')) return 'contravenciones';
    if (pathname.includes('/sustancias')) return 'sustancias';
    return null;
  }

  const enCrearEditar = pathname.startsWith('/private/crear-editar/');
  const tipo = tipoMulta();

  const menu = (
    <>
      <div className="sidebar-brand-v2">
        <div className="sidebar-brand-logo">
          <img src="/images/Municipio_malvinas_argentinas_logo.png" alt="Municipio de Malvinas Argentinas" />
        </div>
        <div className="sidebar-brand-texto">
          <strong>SISTEMA DE FALTAS</strong>
          <span>Municipalidad de Malvinas Argentinas</span>
        </div>
        {!layout.isMobile ? (
          <button
            type="button"
            className="sidebar-colapsar"
            aria-label="Cerrar menú"
            title="Cerrar menú"
            onClick={cerrarSidebar}
          >
            <i className="fa-solid fa-chevron-left" aria-hidden="true" />
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
        <button type="button" className="sidebar-salir sidebar-salir-pie" onClick={() => logout()}>
          <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </>
  );

  // Inspectores: interfaz propia, sin menú lateral (móvil y escritorio). Barra superior con Inicio, tema y salir.
  if (user?.rol === 'Inspector') {
    const enInicio = pathname.startsWith('/private/inicio');
    return (
      <div className={`layout-inspector ${layout.isMobile ? 'layout-movil' : ''}`}>
        <header className="inspector-topbar">
          <button type="button" className="inspector-topbar-marca" onClick={() => router.push('/private/inicio')} aria-label="Ir al inicio">
            <img src="/images/Municipio_malvinas_argentinas_logo.png" alt="" />
            <span><strong>SISTEMA DE FALTAS</strong><small>{user.nombre} {user.apellido}</small></span>
          </button>
          <div className="inspector-topbar-acciones">
            {!enInicio ? (
              <button type="button" className="inspector-topbar-btn" onClick={() => router.push('/private/inicio')} title="Inicio" aria-label="Inicio">
                <i className="fa-solid fa-house" aria-hidden="true" /><span>Inicio</span>
              </button>
            ) : null}
            <button type="button" className="inspector-topbar-btn" onClick={alternarTema} title="Cambiar tema" aria-label="Cambiar tema">
              <i className={`fa-solid ${tema === 'light' ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true" />
            </button>
            <button type="button" className="inspector-topbar-btn salir" onClick={() => logout()} title="Cerrar sesión" aria-label="Cerrar sesión">
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /><span>Salir</span>
            </button>
          </div>
        </header>
        <main className={`layout-contenido inspector-contenido ${enCrearEditar && layout.isMobile ? 'topbar-al-pie' : ''} ${enInicio ? 'en-inicio' : ''}`}>
          {!enInicio && !layout.ocultarTopbar ? (
            <header className={`top-navbar ${layout.isMobile ? 'top-navbar-movil' : ''}`}>
              <div className="top-navbar-titulo">
                <i className="fa-solid fa-file-invoice" aria-hidden="true" />
                <span>{titulo()}</span>
              </div>
              <div id="topbar-extra" className="top-navbar-extra" />
              <div className="top-navbar-acciones">
                {tipo && !enCrearEditar ? (
                  <button type="button" className="btn-nueva" onClick={() => router.push(`/private/crear-editar/${tipo}`)}>
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                    <span>Labrar acta</span>
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

  return (
    <div className={`layout-privado ${layout.isMobile ? 'layout-movil' : ''}`}>
      {layout.isMobile ? (
        <>
          <div className="sidebar-movil-topbar">
            <div className="sidebar-movil-brand">
              <div className="sidebar-bo sidebar-bo-movil">
                <img src="/images/Municipio_malvinas_argentinas_logo.png" alt="Municipio de Malvinas Argentinas" />
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
        <>
          <nav className="sidebar-rail" aria-label="Menú lateral">
            <button type="button" className="rail-logo" title="Abrir menú" aria-label="Abrir menú" onClick={() => setSidebarAbierta(true)}>
              <img src="/images/Municipio_malvinas_argentinas_logo.png" alt="" />
            </button>
            <button type="button" className="rail-btn rail-abrir" title="Abrir menú" aria-label="Abrir menú" onClick={() => setSidebarAbierta(true)}>
              <i className="fa-solid fa-bars" aria-hidden="true" />
            </button>
            <div className="rail-items">
              {gruposVisibles.map((g) =>
                g.route ? (
                  <Link key={g.id} href={g.route} className={`rail-btn ${grupoActivo(g) ? 'active' : ''}`} title={g.titulo} aria-label={g.titulo}>
                    <i className={g.icono} aria-hidden="true" />
                  </Link>
                ) : (
                  <button key={g.id} type="button" className={`rail-btn ${grupoActivo(g) ? 'active' : ''}`} title={g.titulo} aria-label={g.titulo} onClick={() => { setAbiertos((p) => ({ ...p, [g.id]: true })); setSidebarAbierta(true); }}>
                    <i className={g.icono} aria-hidden="true" />
                  </button>
                ),
              )}
            </div>
            <div className="rail-pie">
              <button type="button" className="rail-btn" title={tema === 'light' ? 'Tema claro' : 'Tema oscuro'} aria-label="Cambiar tema" onClick={alternarTema}>
                <i className={`fa-solid ${tema === 'light' ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true" />
              </button>
              <button type="button" className="rail-btn rail-salir" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={() => logout()}>
                <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
              </button>
            </div>
          </nav>
          {sidebarAbierta ? (
            <>
              <button type="button" className={`sidebar-velo ${cerrando ? 'cerrando' : ''}`} aria-label="Cerrar menú" onClick={cerrarSidebar}>
                <span className="sidebar-velo-x"><i className="fa-solid fa-xmark" aria-hidden="true" /></span>
              </button>
              <aside className={`sidebar sidebar-desktop sidebar-flotante sidebar-abierta ${cerrando ? 'cerrando' : ''}`} aria-label="Menú lateral desplegado">
                {menu}
              </aside>
            </>
          ) : null}
        </>
      )}

      <main className={`layout-contenido ${enCrearEditar && layout.isMobile ? 'topbar-al-pie' : ''}`} style={{ marginLeft: margen }}>
        {!layout.ocultarTopbar ? (
          <header className={`top-navbar ${layout.isMobile ? 'top-navbar-movil' : ''}`}>
            <div className="top-navbar-titulo">
              <i className="fa-solid fa-file-invoice" aria-hidden="true" />
              <span>{titulo()}</span>
            </div>
            <div id="topbar-extra" className="top-navbar-extra" />
            <div className="top-navbar-acciones">
              {tipo && !enCrearEditar ? (
                <button type="button" className="btn-nueva" onClick={() => router.push(`/private/crear-editar/${tipo}`)}>
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                  <span>Labrar acta</span>
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

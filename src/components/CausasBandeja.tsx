'use client';

import { TablaVista } from './TablaVista';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { http } from '@/lib/api-client';
import { BANDEJAS, BANDEJAS_TRABAJO, infoBandeja, type BandejaId, type BandejaTrabajoId } from '@/lib/bandejas';
import { fijarBandejaActiva } from '@/lib/bandeja-activa';
import { useSearchParams } from 'next/navigation';
import { ESTADOS_CAUSA, TIPOS_ACTA, fechaCorta, modulosDe, pesos, puede, tipoActa, type ModuloActa } from '@/lib/dominio';
import { EstadoChip } from './EstadoChip';
import { Plazo } from './Plazo';
import { LoaderLogo } from './LoaderLogo';
import { ModalForm } from './ModalForm';
import { useNotify } from './NotifyProvider';
import { exportarApremios } from '@/lib/apremios-client';
import { getUser } from '@/lib/auth-client';
import { useRefresco } from '@/lib/use-refresco';
import { CausaDetalle } from './CausaDetalle';

type Fila = Record<string, string | number | null> & { uuid: string };
type Resp = { content: Fila[]; totalElements: number; totalPages: number; page: number; conteos: Record<string, number>; conteosTrabajo?: Record<BandejaTrabajoId, number> };

/** Bandejas de trabajo de Faltas: por situación de la causa, con búsqueda y filtros (SF-02, SF-03). */
export function CausasBandeja() {
  // Bandeja de trabajo del menú lateral (?b=…). Sin ella, la vista «Todas las causas» con filtros de consulta.
  const sp = useSearchParams();
  const trabajo = (infoBandeja(sp.get('b'))?.id ?? null) as BandejaTrabajoId | null;
  useEffect(() => { fijarBandejaActiva(trabajo); }, [trabajo]);
  const [bandeja, setBandeja] = useState<BandejaId>('activas');
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [anio, setAnio] = useState('');
  const [page, setPage] = useState(0);
  const [r, setR] = useState<Resp | null>(null);
  const [cargando, setCargando] = useState(true);
  // Selección para «Exportar para Apremios» (se mantiene al cambiar de página o de filtros).
  const [sel, setSel] = useState<Map<string, string>>(new Map());
  const [exportar, setExportar] = useState(false);
  const notify = useNotify();
  const [gestion, setGestion] = useState(false);
  useEffect(() => { setGestion(puede(getUser()?.rol, 'gestionarCausas')); }, []);
  // Tipos de acta que el usuario puede labrar (su área): botón «Nueva acta».
  const [labra, setLabra] = useState<ModuloActa[]>([]);
  useEffect(() => { const u = getUser(); setLabra(puede(u?.rol, 'labrar') ? modulosDe(u) : []); }, []);
  // Vista dividida (minuta 20/10): lista a la izquierda y la causa abierta a la derecha, en pantallas anchas.
  // La preferencia queda en el navegador.
  const [dividida, setDividida] = useState(false);
  const [ancha, setAncha] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
  useEffect(() => {
    try { setDividida(localStorage.getItem('faltas:vista-dividida') === '1'); } catch { /* sin almacenamiento */ }
    const mq = window.matchMedia('(min-width: 1200px)');
    const f = () => setAncha(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  const alternarDividida = () => setDividida((v) => { try { localStorage.setItem('faltas:vista-dividida', v ? '0' : '1'); } catch { /* idem */ } if (v) setAbierta(null); return !v; });
  const enPanel = dividida && ancha;
  const alternar = (c: Fila) => setSel((m) => { const n = new Map(m); if (n.has(c.uuid)) n.delete(c.uuid); else n.set(c.uuid, String(c.legajo_numero_acta)); return n; });

  const cargar = useCallback((silencioso = false) => {
    if (!silencioso) setCargando(true);
    http.post<Resp>('/api/causas', { bandeja, trabajo: trabajo ?? undefined, texto, tipo, estado, anio, page, size: 15 }).then(setR).catch(() => undefined).finally(() => setCargando(false));
  }, [bandeja, trabajo, texto, tipo, estado, anio, page]);
  useEffect(() => { setPage(0); setEstado(''); }, [trabajo]);
  useRefresco(() => cargar(true));

  useEffect(() => {
    const t = setTimeout(cargar, texto ? 300 : 0);
    return () => clearTimeout(t);
  }, [cargar, texto]);

  const infoTrabajo = infoBandeja(trabajo);
  const info = infoTrabajo ? { id: infoTrabajo.id, titulo: texto ? `Búsqueda en todas las bandejas` : infoTrabajo.titulo, ayuda: texto ? 'La búsqueda recorre todas las causas, no solo esta bandeja.' : infoTrabajo.ayuda } : BANDEJAS.find((b) => b.id === bandeja)!;
  // Resumen al entrar (minuta 20/10): qué hay para hacer, con enlace a cada bandeja. Quien firma ve primero «Para firma».
  const firma = puede(getUser()?.rol, 'firmar');
  const resumen = BANDEJAS_TRABAJO.filter((b) => b.trabajo && (r?.conteosTrabajo?.[b.id] ?? 0) > 0)
    .sort((a, b) => (firma ? Number(b.id === 'firma') - Number(a.id === 'firma') : 0));
  const activos = (!trabajo && bandeja !== 'activas' ? 1 : 0) + (estado ? 1 : 0) + (tipo ? 1 : 0) + (anio ? 1 : 0);

  // Menú de filtros: se elige una opción, se aplica a la lista y el menú se cierra.
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuAbierto) return;
    const fuera = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbierto(false); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenuAbierto(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); };
  }, [menuAbierto]);
  function aplicar(f: () => void) { f(); setPage(0); setMenuAbierto(false); }

  const lista = (
    <div className="pagina">
      <h1 className="visually-hidden">{infoTrabajo ? `Bandeja: ${infoTrabajo.titulo}` : 'Causas'}</h1>
      {r?.conteosTrabajo ? (
        <div className="aviso aviso-info resumen-bandejas mb-2" role="status">
          {resumen.length ? (
            <>
              <span className="rb-titulo"><i className="fa-solid fa-list-check" aria-hidden="true" /> Tiene para hacer:</span>
              {resumen.map((b) => (
                <Link key={b.id} href={`/private/causas?b=${b.id}`} className="rb-item"><b>{r.conteosTrabajo![b.id]}</b> {b.titulo.toLowerCase()}</Link>
              ))}
            </>
          ) : <span><i className="fa-solid fa-circle-check" aria-hidden="true" /> No hay causas con tareas pendientes.</span>}
        </div>
      ) : null}
      <div className="filtros-barra mb-2">
        <div className="filtros-menu" ref={menuRef}>
          <button type="button" className={`btn btn-filtros ${menuAbierto ? 'abierto' : ''}`} aria-expanded={menuAbierto} onClick={() => setMenuAbierto((v) => !v)}>
            <i className="fa-solid fa-filter" aria-hidden="true" /> Filtros
            {activos ? <span className="n">{activos}</span> : null}
            <i className="fa-solid fa-chevron-down chev" aria-hidden="true" />
          </button>
          {menuAbierto ? (
            <div className="filtros-panel" role="dialog" aria-label="Filtros de causas">
              {!trabajo ? (
              <div className="filtros-seccion">
                <div className="filtros-titulo">Bandeja</div>
                <div className="filtros-chips">
                  {BANDEJAS.map((b) => (
                    <button key={b.id} type="button" title={b.ayuda} className={`filtro-chip ${b.id === bandeja ? 'activo' : ''}`} onClick={() => aplicar(() => setBandeja(b.id))}>
                      {b.titulo} <span className="n">{r?.conteos?.[b.id] ?? '·'}</span>
                    </button>
                  ))}
                </div>
              </div>
              ) : null}
              <div className="filtros-seccion">
                <div className="filtros-titulo">Estado</div>
                <div className="filtros-chips">
                  <button type="button" className={`filtro-chip ${!estado ? 'activo' : ''}`} onClick={() => aplicar(() => setEstado(''))}>Todos</button>
                  {ESTADOS_CAUSA.map((e) => (
                    <button key={e.nombre} type="button" className={`filtro-chip ${estado === e.nombre ? 'activo' : ''}`} onClick={() => aplicar(() => setEstado(e.nombre))}>{e.nombre}</button>
                  ))}
                </div>
              </div>
              <div className="filtros-seccion">
                <div className="filtros-titulo">Año del legajo</div>
                <div className="filtros-chips">
                  <button type="button" className={`filtro-chip ${!anio ? 'activo' : ''}`} onClick={() => aplicar(() => setAnio(''))}>Todos</button>
                  {[0, 1, 2].map((d) => String(new Date().getFullYear() - d)).map((y) => (
                    <button key={y} type="button" className={`filtro-chip ${anio === y ? 'activo' : ''}`} onClick={() => aplicar(() => setAnio(y))}>{y}</button>
                  ))}
                </div>
              </div>
              {Object.keys(TIPOS_ACTA).length > 1 ? (
                <div className="filtros-seccion">
                  <div className="filtros-titulo">Tipo de acta</div>
                  <div className="filtros-chips">
                    <button type="button" className={`filtro-chip ${!tipo ? 'activo' : ''}`} onClick={() => aplicar(() => setTipo(''))}>Todos</button>
                    {Object.entries(TIPOS_ACTA).map(([k, v]) => (
                      <button key={k} type="button" className={`filtro-chip ${tipo === k ? 'activo' : ''}`} onClick={() => aplicar(() => setTipo(k))}>{v.corto}</button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="filtros-aplicados">
          <span className="filtro-aplicado fijo" title={info.ayuda}>{info.titulo} <span className="n">{infoTrabajo ? (r?.totalElements ?? '·') : (r?.conteos?.[bandeja] ?? '·')}</span></span>
          {estado ? <button type="button" className="filtro-aplicado" onClick={() => { setEstado(''); setPage(0); }} aria-label={`Quitar estado ${estado}`}>{estado} <i className="fa-solid fa-xmark" aria-hidden="true" /></button> : null}
          {anio ? <button type="button" className="filtro-aplicado" onClick={() => { setAnio(''); setPage(0); }} aria-label="Quitar año">Año {anio} <i className="fa-solid fa-xmark" aria-hidden="true" /></button> : null}
          {tipo ? <button type="button" className="filtro-aplicado" onClick={() => { setTipo(''); setPage(0); }} aria-label="Quitar tipo">{TIPOS_ACTA[tipo as keyof typeof TIPOS_ACTA]?.corto ?? tipo} <i className="fa-solid fa-xmark" aria-hidden="true" /></button> : null}
        </div>
        <div className="filtros-busqueda">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input aria-label="Buscar por acta, legajo, dominio, documento o nombre" className="form-control" value={texto} onChange={(e) => { setTexto(e.target.value); setPage(0); }} placeholder="Buscar acta, legajo, dominio, documento o nombre" />
        </div>
        <button type="button" className={`btn btn-outline-secondary text-nowrap d-none d-xl-inline-flex align-items-center gap-1 ${dividida ? 'active' : ''}`} aria-pressed={dividida} title="Lista y causa lado a lado" onClick={alternarDividida}>
          <i className="fa-solid fa-table-columns" aria-hidden="true" /> Vista dividida
        </button>
        {labra.map((m) => (
          <Link key={m} href={`/private/crear-editar/${m}`} className="btn btn-primary text-nowrap">
            <i className="fa-solid fa-plus" aria-hidden="true" /> {labra.length === 1 ? 'Nueva acta' : `Nueva acta de ${TIPOS_ACTA[m].corto.toLowerCase()}`}
          </Link>
        ))}
      </div>

      <div className="card-step">
        <div className="card-step-header">
          <h2>{info.titulo}</h2>
          <p>{info.ayuda}</p>
        </div>
        {gestion ? (
          <div className="seleccion-barra">
            <span><i className="fa-solid fa-file-export" aria-hidden="true" /> {sel.size ? <><strong>{sel.size}</strong> causa(s) seleccionada(s)</> : 'Marque las causas a remitir a Apremios'}</span>
            {sel.size ? (
              <span className="d-flex gap-2">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSel(new Map())}>Limpiar</button>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => setExportar(true)}><i className="fa-solid fa-file-pdf" aria-hidden="true" /> Exportar para Apremios</button>
              </span>
            ) : null}
          </div>
        ) : null}
        <TablaVista>
          <table className="table custom-table align-middle">
            <thead>
              <tr>
                {gestion ? <th style={{ width: 36 }}><input type="checkbox" className="form-check-input" aria-label="Seleccionar todas las de esta página" checked={Boolean(r?.content.length) && (r?.content ?? []).every((c) => sel.has(c.uuid))} onChange={(e) => setSel((m) => { const n = new Map(m); for (const c of r?.content ?? []) { if (e.target.checked) n.set(c.uuid, String(c.legajo_numero_acta)); else n.delete(c.uuid); } return n; })} /></th> : null}
                <th>ACTA</th>
                <th>LEGAJO</th>
                <th>FECHA</th>
                <th>INFRACTOR</th>
                <th>DOMINIO</th>
                <th>ESTADO</th>
                <th>PLAZO</th>
                <th className="text-end">VALOR</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={gestion ? 9 : 8}><LoaderLogo tam={56} texto="Cargando causas…" /></td></tr>
              ) : null}
              {!cargando && (r?.content ?? []).map((c) => (
                <tr key={c.uuid} className={enPanel && abierta === c.uuid ? 'fila-abierta' : undefined}>
                  {gestion ? <td><input type="checkbox" className="form-check-input" aria-label={`Seleccionar ${c.legajo_numero_acta}`} checked={sel.has(c.uuid)} onChange={() => alternar(c)} /></td> : null}
                  <td>
                    <Link href={`/private/causa/${c.uuid}${trabajo ? `?b=${trabajo}` : ''}`} className="fw-semibold" onClick={(e) => { if (enPanel && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setAbierta(c.uuid); } }}>{c.legajo_numero_acta}</Link>
                    <div className="texto-ayuda">{TIPOS_ACTA[tipoActa(String(c.infraccion_tipo_nombre))].corto}</div>
                  </td>
                  <td>{c.legajo_number}/{c.legajo_anio}</td>
                  <td>{fechaCorta(String(c.legajo_fecha ?? ''))}</td>
                  <td>{c.infractor_razon_social || c.infractor_nombre || 'Sin identificar'}<div className="texto-ayuda">{c.infractor_cuit || c.infractor_documento_numero}</div></td>
                  <td>{c.vehiculo_numero_dominio || '-'}</td>
                  <td><EstadoChip estado={String(c.estado_faltas)} medida={Number(c.medida_vigente) === 1} />{c.marca ? <div className="marca-causa">{String(c.marca)}</div> : null}{c.bandeja && (!trabajo || texto) ? <div className="texto-ayuda">Bandeja: {infoBandeja(String(c.bandeja))?.titulo}</div> : null}{c.responsable ? <div className="texto-ayuda"><i className="fa-solid fa-user-check" aria-hidden="true" /> {String(c.responsable)}</div> : null}</td>
                  <td><Plazo vence={c.vence_plazo_at ? Number(c.vence_plazo_at) : null} estado={String(c.estado_faltas ?? "")} /></td>
                  <td className="text-end">{pesos(c.monto_estimado == null ? null : Number(c.monto_estimado))}</td>
                </tr>
              ))}
              {!cargando && r && !r.content.length ? (
                <tr><td colSpan={gestion ? 9 : 8}><div className="sin-resultados py-3"><i className="fa-solid fa-inbox" aria-hidden="true" /><p className="mb-0">No hay causas en esta bandeja.</p></div></td></tr>
              ) : null}
            </tbody>
          </table>
        </TablaVista>
        {exportar ? (
          <ModalForm
            titulo={`Exportar ${sel.size} causa(s) para Apremios`}
            icono="fa-solid fa-file-export"
            textoOk="Generar PDF"
            aviso={`Se genera un PDF con el remito del lote, y por cada causa la carátula con el saldo adeudado a hoy y el legajo completo (sin memos internos). Causas: ${[...sel.values()].join(', ')}.`}
            campos={[{ k: 'derivar', t: 'Pasar las causas a «En Apremios»', tipo: 'select', opciones: [{ v: 'si', t: 'Sí, derivarlas ahora' }, { v: 'no', t: 'No, solo generar el PDF' }] }]}
            onCancel={() => setExportar(false)}
            onOk={async (v) => {
              try {
                const res = await exportarApremios([...sel.keys()], v.derivar !== 'no');
                notify.success(`Lote ${res.lote}`, 'Guarde el PDF desde el diálogo de impresión y envíelo a Apremios.');
                setExportar(false); setSel(new Map()); cargar();
              } catch (e) {
                notify.error('No se pudo exportar', (e as Error).message);
              }
            }}
          />
        ) : null}
        {r && r.totalPages > 1 ? (
          <div className="paginado-footer">
            <span>Total: {r.totalElements}</span>
            <div className="paginacion-botones">
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
              <span className="px-2">{page + 1} / {r.totalPages}</span>
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page + 1 >= r.totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
  if (!enPanel) return lista;
  return (
    <div className="vista-dividida">
      <div className="vd-lista">{lista}</div>
      <aside className="vd-panel" aria-label="Causa abierta">
        {abierta ? (
          <>
            <div className="vd-panel-barra">
              <Link href={`/private/causa/${abierta}${trabajo ? `?b=${trabajo}` : ''}`} className="btn btn-sm btn-outline-secondary"><i className="fa-solid fa-up-right-and-down-left-from-center" aria-hidden="true" /> Abrir completa</Link>
              <button type="button" className="btn btn-sm btn-outline-secondary" aria-label="Cerrar el panel" onClick={() => setAbierta(null)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            </div>
            <CausaDetalle key={abierta} embebida={{ uuid: abierta, onCambio: () => cargar(true), onCerrar: () => setAbierta(null) }} />
          </>
        ) : (
          <div className="sin-resultados py-5"><i className="fa-solid fa-table-columns" aria-hidden="true" /><p className="mb-0">Elija una causa de la lista para verla acá.</p></div>
        )}
      </aside>
    </div>
  );
}

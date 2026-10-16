'use client';

import { TablaVista } from './TablaVista';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { http } from '@/lib/api-client';
import { BANDEJAS, type BandejaId } from '@/lib/bandejas';
import { ESTADOS_CAUSA, TIPOS_ACTA, fechaCorta, pesos, puede, tipoActa } from '@/lib/dominio';
import { EstadoChip } from './EstadoChip';
import { Plazo } from './Plazo';
import { LoaderLogo } from './LoaderLogo';
import { ModalForm } from './ModalForm';
import { useNotify } from './NotifyProvider';
import { exportarApremios } from '@/lib/apremios-client';
import { getUser } from '@/lib/auth-client';
import { useRefresco } from '@/lib/use-refresco';

type Fila = Record<string, string | number | null> & { uuid: string };
type Resp = { content: Fila[]; totalElements: number; totalPages: number; page: number; conteos: Record<string, number> };

/** Bandejas de trabajo de Faltas: por situación de la causa, con búsqueda y filtros (SF-02, SF-03). */
export function CausasBandeja() {
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
  const alternar = (c: Fila) => setSel((m) => { const n = new Map(m); if (n.has(c.uuid)) n.delete(c.uuid); else n.set(c.uuid, String(c.legajo_numero_acta)); return n; });

  const cargar = useCallback((silencioso = false) => {
    if (!silencioso) setCargando(true);
    http.post<Resp>('/api/causas', { bandeja, texto, tipo, estado, anio, page, size: 15 }).then(setR).catch(() => undefined).finally(() => setCargando(false));
  }, [bandeja, texto, tipo, estado, anio, page]);
  useRefresco(() => cargar(true));

  useEffect(() => {
    const t = setTimeout(cargar, texto ? 300 : 0);
    return () => clearTimeout(t);
  }, [cargar, texto]);

  const info = BANDEJAS.find((b) => b.id === bandeja)!;
  const activos = (bandeja !== 'activas' ? 1 : 0) + (estado ? 1 : 0) + (tipo ? 1 : 0) + (anio ? 1 : 0);

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

  return (
    <div className="pagina">
      <div className="filtros-barra mb-2">
        <div className="filtros-menu" ref={menuRef}>
          <button type="button" className={`btn btn-filtros ${menuAbierto ? 'abierto' : ''}`} aria-expanded={menuAbierto} onClick={() => setMenuAbierto((v) => !v)}>
            <i className="fa-solid fa-filter" aria-hidden="true" /> Filtros
            {activos ? <span className="n">{activos}</span> : null}
            <i className="fa-solid fa-chevron-down chev" aria-hidden="true" />
          </button>
          {menuAbierto ? (
            <div className="filtros-panel" role="dialog" aria-label="Filtros de causas">
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
          <span className="filtro-aplicado fijo" title={info.ayuda}>{info.titulo} <span className="n">{r?.conteos?.[bandeja] ?? '·'}</span></span>
          {estado ? <button type="button" className="filtro-aplicado" onClick={() => { setEstado(''); setPage(0); }} aria-label={`Quitar estado ${estado}`}>{estado} <i className="fa-solid fa-xmark" aria-hidden="true" /></button> : null}
          {anio ? <button type="button" className="filtro-aplicado" onClick={() => { setAnio(''); setPage(0); }} aria-label="Quitar año">Año {anio} <i className="fa-solid fa-xmark" aria-hidden="true" /></button> : null}
          {tipo ? <button type="button" className="filtro-aplicado" onClick={() => { setTipo(''); setPage(0); }} aria-label="Quitar tipo">{TIPOS_ACTA[tipo as keyof typeof TIPOS_ACTA]?.corto ?? tipo} <i className="fa-solid fa-xmark" aria-hidden="true" /></button> : null}
        </div>
        <div className="filtros-busqueda">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input aria-label="Buscar por acta, legajo, dominio, documento o nombre" className="form-control" value={texto} onChange={(e) => { setTexto(e.target.value); setPage(0); }} placeholder="Buscar acta, legajo, dominio, documento o nombre" />
        </div>
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
                <tr key={c.uuid}>
                  {gestion ? <td><input type="checkbox" className="form-check-input" aria-label={`Seleccionar ${c.legajo_numero_acta}`} checked={sel.has(c.uuid)} onChange={() => alternar(c)} /></td> : null}
                  <td>
                    <Link href={`/private/causa/${c.uuid}`} className="fw-semibold">{c.legajo_numero_acta}</Link>
                    <div className="texto-ayuda">{TIPOS_ACTA[tipoActa(String(c.infraccion_tipo_nombre))].corto}</div>
                  </td>
                  <td>{c.legajo_number}/{c.legajo_anio}</td>
                  <td>{fechaCorta(String(c.legajo_fecha ?? ''))}</td>
                  <td>{c.infractor_razon_social || c.infractor_nombre || 'NN'}<div className="texto-ayuda">{c.infractor_cuit || c.infractor_documento_numero}</div></td>
                  <td>{c.vehiculo_numero_dominio || '-'}</td>
                  <td><EstadoChip estado={String(c.estado_faltas)} medida={Number(c.medida_vigente) === 1} />{c.marca ? <div className="marca-causa">{String(c.marca)}</div> : null}</td>
                  <td><Plazo vence={c.vence_plazo_at ? Number(c.vence_plazo_at) : null} /></td>
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
}

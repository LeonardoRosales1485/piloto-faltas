'use client';

import { TablaVista } from './TablaVista';
import Link from 'next/link';
import { LoaderLogo } from './LoaderLogo';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { actaHtmlPorTipo } from '@/lib/acta-oficial';
import { apiClient } from '@/lib/api-client';
import { actaPublicaUrl, printTicket } from '@/lib/print';
import { useLayout } from '@/lib/layout-context';
import type { FiltrosInfraccion, Infraccion, Paginado } from '@/lib/types';
import { useNotify } from './NotifyProvider';
import { EstadoChip } from './EstadoChip';
import { ESTADOS_CAUSA, TIPOS_ACTA, tipoActa } from '@/lib/dominio';

const SIZE = 10;
const ESTADOS = ['Borrador', ...ESTADOS_CAUSA.map((e) => e.nombre)];
type Periodo = 'todos' | 'ultimo_mes' | 'periodo_manual';

const vacios = (): FiltrosInfraccion => ({
  nombreInfractor: '',
  acta: '',
  legajo: '',
  anio: '',
  patente: '',
  fechaDesde: '',
  fechaHasta: '',
  estado: '',
});

function hoyInput(): string {
  return new Date().toISOString().split('T')[0];
}

function haceUnMes(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
}

function AccionesFila({
  i,
  tipo,
  onDeleted,
  conEtiqueta = false,
}: {
  i: Infraccion;
  tipo: string;
  onDeleted: () => void;
  conEtiqueta?: boolean;
}) {
  const notify = useNotify();
  const [eliminar, setEliminar] = useState<Infraccion | null>(null);
  const [pdf, setPdf] = useState<Infraccion | null>(null);
  const [linkActa, setLinkActa] = useState<string | null>(null);

  const cerrarActa = () => {
    setPdf(null);
    setLinkActa(null);
  };

  const verLinkActa = async (item: Infraccion) => {
    if (!item.uuid) return;
    const url = actaPublicaUrl(item.uuid);
    setLinkActa(url);
    try {
      await navigator.clipboard.writeText(url);
      notify.success('Link del acta', 'Se copió el link al portapapeles.');
    } catch {
      notify.success('Link del acta', url);
    }
  };

  return (
    <>
      <div className="acciones-fila">
        <Link
          className="btn-accion-redondo btn-accion-editar"
          href={`/private/crear-editar/${tipo}/${i.uuid}`}
          title={i.estadoFaltas === 'Borrador' ? 'Continuar labrado' : 'Ver acta'}
          aria-label="Editar"
        >
          <i className="fa-solid fa-pen" aria-hidden="true" />
          {conEtiqueta ? <span>Editar</span> : null}
        </Link>
        {i.estadoFaltas !== 'Borrador' && i.estadoFaltas !== 'Anulada' ? (
          <Link
            className="btn-accion-redondo btn-accion-eliminar"
            style={{ backgroundColor: '#7c3aed' }}
            href={`/private/causa/${i.uuid}`}
            title="Ver causa"
            aria-label="Ver causa"
          >
            <i className="fa-solid fa-folder-open" aria-hidden="true" />
            {conEtiqueta ? <span>Causa</span> : null}
          </Link>
        ) : null}
        <button
          type="button"
          className="btn-accion-redondo btn-accion-pdf"
          title="Ver acta"
          aria-label="Ver acta"
          onClick={() => {
            setLinkActa(null);
            setPdf(i);
          }}
        >
          <i className="fa-solid fa-file-lines" aria-hidden="true" />
          {conEtiqueta ? <span>Ver acta</span> : null}
        </button>
        <button
          type="button"
          className="btn-accion-redondo btn-accion-imprimir"
          title="Imprimir"
          aria-label="Imprimir"
          onClick={() => void printTicket(i)}
        >
          <i className="fa-solid fa-print" aria-hidden="true" />
          {conEtiqueta ? <span>Imprimir</span> : null}
        </button>
      </div>
      {pdf ? (
        <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && cerrarActa()}>
          <div className="modal-fake modal-fake-xl" role="dialog" aria-modal="true" aria-label="Acta de Infracción">
            <div className="modal-fake-header">
              <i className="fa-solid fa-file-lines" aria-hidden="true" />
              <h2>Acta de Infracción</h2>
              <button type="button" aria-label="Cerrar" onClick={cerrarActa}>
                &times;
              </button>
            </div>
            <div className="modal-fake-body">
              {linkActa ? (
                <p className="acta-link-publico">
                  <a href={linkActa} target="_blank" rel="noreferrer">
                    {linkActa}
                  </a>
                </p>
              ) : null}
              <div
                className="acta-preview-scroll"
                dangerouslySetInnerHTML={{ __html: (() => { const a = actaHtmlPorTipo(pdf); return `<style>${a.css}</style>${a.html}`; })() }}
              />
            </div>
            <div className="modal-fake-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={cerrarActa}>
                Cerrar
              </button>
              <button type="button" className="btn btn-outline-primary" onClick={() => void verLinkActa(pdf)}>
                <i className="fa-solid fa-link" aria-hidden="true" /> Ver link del acta
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {eliminar ? (
        <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && setEliminar(null)}>
          <div className="modal-fake modal-fake-sm" role="dialog" aria-modal="true" aria-label="Eliminar Infracción">
            <div className="modal-fake-header">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
              <h2>Eliminar Infracción</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setEliminar(null)}>
                &times;
              </button>
            </div>
            <div className="modal-fake-body">
              <p className="mb-0">¿Está seguro que desea eliminar la infracción con Acta N.° {eliminar.legajoNumeroActa}?</p>
            </div>
            <div className="modal-fake-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEliminar(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  if (!eliminar.uuid) return;
                  await apiClient.deleteInfraccion(eliminar.uuid);
                  notify.success('Infracción eliminada', `Acta N.° ${eliminar.legajoNumeroActa}`);
                  setEliminar(null);
                  onDeleted();
                }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Paginador({ p, ir }: { p: Paginado<Infraccion>; ir: (page: number) => void }) {
  const desde = !p.totalElements ? 0 : p.page * SIZE + 1;
  const hasta = Math.min((p.page + 1) * SIZE, p.totalElements);
  const paginas = Array.from({ length: p.totalPages }, (_, i) => i).filter(
    (n) => n === 0 || n === p.totalPages - 1 || Math.abs(n - p.page) <= 1,
  );

  return (
    <div className="paginacion">
      <span>
        Mostrando <strong>{desde}</strong> a <strong>{hasta}</strong> de <strong>{p.totalElements}</strong> infraccione(s)
      </span>
      <div className="paginacion-botones">
        <button type="button" className="btn btn-sm btn-outline-secondary" disabled={p.page === 0} onClick={() => ir(p.page - 1)}>
          <i className="fa-solid fa-chevron-left" aria-hidden="true" /> Anterior
        </button>
        {paginas.map((n) => (
          <button
            key={n}
            type="button"
            className={`btn btn-sm ${n === p.page ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => ir(n)}
          >
            {n + 1}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={p.page >= p.totalPages - 1}
          onClick={() => ir(p.page + 1)}
        >
          Siguiente <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function ListaInfracciones() {
  const params = useParams();
  const tipo = (params.tipo as string) ?? 'multas';
  const layout = useLayout();
  const [paginado, setPaginado] = useState<Paginado<Infraccion> | null>(null);
  const [cargando, setCargando] = useState(true);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>('todos');
  const [filtros, setFiltros] = useState(vacios);
  const [aplicados, setAplicados] = useState(vacios);
  const cargar = useCallback(
    (page: number, f: FiltrosInfraccion) => {
      setCargando(true);
      apiClient
        .infracciones(tipo, f, page, SIZE)
        .then((res) => {
          setPaginado(res);
          setCargando(false);
        })
        .catch(() => setCargando(false));
    },
    [tipo],
  );

  useEffect(() => {
    setFiltros(vacios());
    setAplicados(vacios());
    setPeriodo('todos');
    setFiltrosAbiertos(false);
    cargar(0, vacios());
  }, [tipo, cargar]);

  const efectivos = (): FiltrosInfraccion => {
    if (periodo === 'ultimo_mes') {
      return { ...filtros, fechaDesde: haceUnMes(), fechaHasta: hoyInput() };
    }
    if (periodo === 'periodo_manual') return { ...filtros };
    return { ...filtros, fechaDesde: '', fechaHasta: '' };
  };

  const chips = useMemo(() => {
    const lista: { label: string; quitar: () => void }[] = [];
    if (aplicados.estado) {
      lista.push({
        label: `Estado: ${aplicados.estado}`,
        quitar: () => {
          const next = { ...filtros, estado: '' };
          const nextA = { ...aplicados, estado: '' };
          setFiltros(next);
          setAplicados(nextA);
          cargar(0, nextA);
        },
      });
    }
    if (aplicados.fechaDesde || aplicados.fechaHasta) {
      const desde = aplicados.fechaDesde || '...';
      const hasta = aplicados.fechaHasta || '...';
      lista.push({
        label: `Período: ${desde} al ${hasta}`,
        quitar: () => {
          setPeriodo('todos');
          const next = { ...filtros, fechaDesde: '', fechaHasta: '' };
          const nextA = { ...aplicados, fechaDesde: '', fechaHasta: '' };
          setFiltros(next);
          setAplicados(nextA);
          cargar(0, nextA);
        },
      });
    }
    return lista;
  }, [aplicados, filtros, cargar]);

  function buscar() {
    const aplicar = efectivos();
    setAplicados(aplicar);
    cargar(0, aplicar);
  }

  function limpiar() {
    setFiltros(vacios());
    setAplicados(vacios());
    setPeriodo('todos');
    cargar(0, vacios());
  }

  function legajo(i: Infraccion) {
    return `${i.legajoNumber ?? ''}${i.legajoAnio ? '/' + i.legajoAnio : ''}`;
  }

  function articulos(i: Infraccion) {
    return (i.leyesNombre ?? []).join(', ') || '-';
  }

  function badge(estado?: string) {
    if (estado === 'Pendiente') return 'badge-estado badge-estado-pendiente';
    if (estado === 'Cerrado') return 'badge-estado badge-estado-cerrado';
    return 'badge-estado badge-estado-activo';
  }

  const content = paginado?.content ?? [];

  const reloadAfterDelete = () => {
    const page = Math.min(paginado?.page ?? 0, Math.max(0, (paginado?.totalPages ?? 1) - 1));
    cargar(page, aplicados);
  };

  return (
    <div className="pagina">
      <div className="filtros-card filtros-card-compacto mb-2">
        <button
          type="button"
          className="filtros-header-toggle"
          aria-expanded={filtrosAbiertos}
          onClick={() => setFiltrosAbiertos((v) => !v)}
        >
          <span>
            <i className="fa-solid fa-filter" aria-hidden="true" />
            Filtros
            {chips.length ? <span className="filtros-badge">{chips.length}</span> : null}
          </span>
          <i className={`fa-solid ${filtrosAbiertos ? 'fa-chevron-up' : 'fa-chevron-down'}`} aria-hidden="true" />
        </button>
        {filtrosAbiertos ? (
          <div className="filtros-body">
            <div className="row g-2 align-items-end">
              <div className="col-6 col-md-4 col-lg-2">
                <label htmlFor="f-acta" className="form-label-v2">
                  N.Acta
                </label>
                <input
                  id="f-acta"
                  className="form-control form-control-sm"
                  placeholder="N.Acta"
                  value={filtros.acta}
                  onChange={(e) => setFiltros({ ...filtros, acta: e.target.value })}
                  onKeyUp={(e) => e.key === 'Enter' && buscar()}
                />
              </div>
              <div className="col-6 col-md-4 col-lg-2">
                <label htmlFor="f-legajo" className="form-label-v2">
                  N.Legajo
                </label>
                <input
                  id="f-legajo"
                  className="form-control form-control-sm"
                  placeholder="N.Legajo"
                  value={filtros.legajo}
                  onChange={(e) => setFiltros({ ...filtros, legajo: e.target.value })}
                  onKeyUp={(e) => e.key === 'Enter' && buscar()}
                />
              </div>
              <div className="col-6 col-md-4 col-lg-2">
                <label htmlFor="f-anio" className="form-label-v2">
                  Año del legajo
                </label>
                <input
                  id="f-anio"
                  className="form-control form-control-sm"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Ej: 2026"
                  value={filtros.anio ?? ''}
                  onChange={(e) => setFiltros({ ...filtros, anio: e.target.value.replace(/\D/g, '') })}
                  onKeyUp={(e) => e.key === 'Enter' && buscar()}
                />
              </div>
              <div className="col-6 col-md-4 col-lg-2">
                <label htmlFor="f-patente" className="form-label-v2">
                  Patente
                </label>
                <input
                  id="f-patente"
                  className="form-control form-control-sm"
                  placeholder="Patente"
                  value={filtros.patente}
                  onChange={(e) => setFiltros({ ...filtros, patente: e.target.value })}
                  onKeyUp={(e) => e.key === 'Enter' && buscar()}
                />
              </div>
              <div className="col-6 col-md-4 col-lg-2">
                <label htmlFor="f-infractor" className="form-label-v2">
                  Infractor
                </label>
                <input
                  id="f-infractor"
                  className="form-control form-control-sm"
                  placeholder="Infractor"
                  value={filtros.nombreInfractor}
                  onChange={(e) => setFiltros({ ...filtros, nombreInfractor: e.target.value })}
                  onKeyUp={(e) => e.key === 'Enter' && buscar()}
                />
              </div>
              <div className="col-6 col-md-4 col-lg-2">
                <label htmlFor="f-estado" className="form-label-v2">
                  Estado
                </label>
                <select
                  id="f-estado"
                  className="form-select form-select-sm"
                  value={filtros.estado}
                  onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                >
                  <option value="">Todos</option>
                  {ESTADOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-4 col-lg-2">
                <label htmlFor="f-periodo" className="form-label-v2">
                  Periodo
                </label>
                <select
                  id="f-periodo"
                  className="form-select form-select-sm"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value as Periodo)}
                >
                  <option value="todos">Todos</option>
                  <option value="ultimo_mes">Último mes</option>
                  <option value="periodo_manual">Período manual</option>
                </select>
              </div>
              {periodo === 'periodo_manual' ? (
                <>
                  <div className="col-6 col-md-3 col-lg-2">
                    <label htmlFor="f-desde" className="form-label-v2">
                      Desde
                    </label>
                    <input
                      id="f-desde"
                      type="date"
                      className="form-control form-control-sm"
                      value={filtros.fechaDesde}
                      onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                    />
                  </div>
                  <div className="col-6 col-md-3 col-lg-2">
                    <label htmlFor="f-hasta" className="form-label-v2">
                      Hasta
                    </label>
                    <input
                      id="f-hasta"
                      type="date"
                      className="form-control form-control-sm"
                      value={filtros.fechaHasta}
                      onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                    />
                  </div>
                </>
              ) : null}
            </div>
            <div className="filtros-acciones">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={limpiar}>
                <i className="fa-solid fa-rotate-left me-1" aria-hidden="true" /> Limpiar
              </button>
              <button type="button" className="btn btn-sm btn-primary" onClick={buscar}>
                <i className="fa-solid fa-magnifying-glass me-1" aria-hidden="true" /> Buscar
              </button>
            </div>
          </div>
        ) : null}
        {chips.length ? (
          <div className="filtros-chips filtros-chips-bar">
            {chips.map((chip) => (
              <span key={chip.label} className="filtro-chip">
                {chip.label}
                <button type="button" aria-label={`Quitar ${chip.label}`} onClick={chip.quitar}>
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="card-seccion">
        <div className="card-seccion-header border-0">
          <h2 className="h5 m-0">
            <i className="fa-solid fa-list me-2" aria-hidden="true" />
            {TIPOS_ACTA[tipoActa(tipo)].plural}
          </h2>
        </div>

        {cargando ? (
          <LoaderLogo tam={56} texto="Cargando actas…" />
        ) : layout.isMobile ? (
          <>
            {!content.length ? (
              <div className="sin-resultados">
                <i className="fa-solid fa-inbox" aria-hidden="true" />
                <p>No se encontraron infracciones.</p>
              </div>
            ) : null}
            <div className="row g-2 p-2">
              {content.map((i) => (
                <div key={i.uuid} className="col-12">
                  <div className="card card-movil-lista">
                    <div className="card-body">
                      <div className="mb-2">
                        <EstadoChip estado={i.estadoFaltas} medida={i.medidaVigente === 1} />
                      </div>
                      <div className="fila-movil">
                        <span>LEGAJO</span>
                        <strong>{legajo(i)}</strong>
                      </div>
                      <div className="fila-movil">
                        <span>ACTA</span>
                        <strong>{i.legajoNumeroActa}</strong>
                      </div>
                      <div className="fila-movil">
                        <span>INFRACTOR</span>
                        <strong>{i.infractorNombre || '-'}</strong>
                      </div>
                      <div className="fila-movil">
                        <span>PATENTE</span>
                        <strong>{i.vehiculoNumeroDominio || '-'}</strong>
                      </div>
                      <div className="fila-movil">
                        <span>ARTÍCULOS</span>
                        <strong>{articulos(i)}</strong>
                      </div>
                      <div className="fila-movil">
                        <span>RETENCIÓN</span>
                        <span className="badge-retencion">
                          Lic: {i.retencionDeLicencia === 1 ? 'Sí' : 'No'} / Veh:{' '}
                          {i.retencionDeVehiculo === 1 ? 'Sí' : 'No'}
                        </span>
                      </div>
                      <div className="acciones-card-movil">
                        <AccionesFila i={i} tipo={tipo} onDeleted={reloadAfterDelete} conEtiqueta />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {paginado ? (
              <div className="px-2 pb-2">
                <Paginador p={paginado} ir={(page) => cargar(page, aplicados)} />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <TablaVista>
              <table className="table custom-table tabla-objetivo">
                <thead>
                  <tr>
                    <th className="th-acciones">ACCIONES</th>
                    <th className="th-legajo text-center">LEGAJO</th>
                    <th className="th-acta text-center">ACTA</th>
                    <th className="th-infractor">INFRACTOR</th>
                    <th className="th-patente text-center">PATENTE</th>
                    <th className="th-articulos">ARTÍCULOS</th>
                    <th className="th-retencion text-center">RETENCION</th>
                    <th className="th-estado text-center">ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {content.map((i) => (
                    <tr key={i.uuid}>
                      <td className="td-acciones">
                        <AccionesFila i={i} tipo={tipo} onDeleted={reloadAfterDelete} />
                      </td>
                      <td className="text-center">{legajo(i)}</td>
                      <td className="text-center">{i.legajoNumeroActa}</td>
                      <td>{i.infractorNombre || '-'}</td>
                      <td className="text-center text-uppercase">{i.vehiculoNumeroDominio || '-'}</td>
                      <td>
                        <span className="texto-truncado" title={articulos(i)}>
                          {articulos(i)}
                        </span>
                      </td>
                      <td className="text-center">
                        {!i.retencionDeLicencia && !i.retencionDeVehiculo ? (
                          <span className="badge-retencion">No retiene</span>
                        ) : (
                          <div className="d-flex flex-column gap-1 align-items-center">
                            <span className="badge-retencion">
                              Licencia {i.retencionDeLicencia === 1 ? 'Sí' : 'No'}
                            </span>
                            <span className="badge-retencion">
                              Vehículo {i.retencionDeVehiculo === 1 ? 'Sí' : 'No'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <EstadoChip estado={i.estadoFaltas} medida={i.medidaVigente === 1} />
                      </td>
                    </tr>
                  ))}
                  {!content.length ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="sin-resultados">
                          <i className="fa-solid fa-inbox" aria-hidden="true" />
                          <p>No se encontraron infracciones.</p>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </TablaVista>
            {paginado ? (
              <div className="paginado-footer">
                <span>Total: {paginado.totalElements} resultados</span>
                <Paginador p={paginado} ir={(page) => cargar(page, aplicados)} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

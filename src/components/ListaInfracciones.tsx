'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { actaOficialCss, actaOficialHtml } from '@/lib/acta-oficial';
import { apiClient } from '@/lib/api-client';
import { useLayout } from '@/lib/layout-context';
import type { FiltrosInfraccion, Infraccion, Paginado } from '@/lib/types';
import { useNotify } from './NotifyProvider';

const SIZE = 10;
const ESTADOS = ['Activo', 'Pendiente', 'Cerrado'];
type Periodo = 'todos' | 'ultimo_mes' | 'periodo_manual';

const vacios = (): FiltrosInfraccion => ({
  nombreInfractor: '',
  acta: '',
  legajo: '',
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

function AccionesFila({ i, tipo, onDeleted }: { i: Infraccion; tipo: string; onDeleted: () => void }) {
  const notify = useNotify();
  const [eliminar, setEliminar] = useState<Infraccion | null>(null);
  const [pdf, setPdf] = useState<Infraccion | null>(null);

  const imprimir = useCallback((item: Infraccion) => {
    const win = window.open('', '_blank', 'width=820,height=640');
    if (!win) return;
    win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8" /><title>Acta de Infracción</title>
      <style>*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}${actaOficialCss()}</style>
      </head><body>${actaOficialHtml(item)}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 450);
  }, []);

  return (
    <>
      <div className="acciones-fila">
        <Link className="btn-accion-redondo btn-accion-editar" href={`/private/crear-editar/${tipo}/${i.uuid}`} title="Editar">
          <i className="fa-solid fa-pen" aria-hidden="true" />
        </Link>
        <button type="button" className="btn-accion-redondo btn-accion-eliminar" title="Eliminar" onClick={() => setEliminar(i)}>
          <i className="fa-solid fa-trash" aria-hidden="true" />
        </button>
        <button type="button" className="btn-accion-redondo btn-accion-pdf" title="Ver acta" onClick={() => setPdf(i)}>
          <i className="fa-solid fa-file-lines" aria-hidden="true" />
        </button>
        <button type="button" className="btn-accion-redondo btn-accion-imprimir" title="Imprimir" onClick={() => imprimir(i)}>
          <i className="fa-solid fa-print" aria-hidden="true" />
        </button>
      </div>
      {pdf ? (
        <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && setPdf(null)}>
          <div className="modal-fake modal-fake-xl" role="dialog" aria-modal="true" aria-label="Acta de Infracción">
            <div className="modal-fake-header">
              <i className="fa-solid fa-file-lines" aria-hidden="true" />
              <h2>Acta de Infracción</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setPdf(null)}>
                &times;
              </button>
            </div>
            <div className="modal-fake-body">
              <div
                className="acta-preview-scroll"
                dangerouslySetInnerHTML={{ __html: `<style>${actaOficialCss()}</style>${actaOficialHtml(pdf)}` }}
              />
            </div>
            <div className="modal-fake-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setPdf(null)}>
                Cerrar
              </button>
              <button type="button" className="btn btn-primary" onClick={() => imprimir(pdf)}>
                <i className="fa-solid fa-print" aria-hidden="true" /> Imprimir
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
            {tipo === 'multas' ? 'Multas de Tránsito' : 'Contravenciones'}
          </h2>
        </div>

        {cargando ? (
          <div className="celda-cargando">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando...
          </div>
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
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className={badge(i.estado)}>{i.estado}</span>
                        <AccionesFila i={i} tipo={tipo} onDeleted={reloadAfterDelete} />
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
            <div className="table-responsive">
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
                        <span className={badge(i.estado)}>{i.estado}</span>
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
            </div>
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

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { BANDEJAS, type BandejaId } from '@/lib/bandejas';
import { ESTADOS_CAUSA, TIPOS_ACTA, fechaCorta, pesos, tipoActa } from '@/lib/dominio';
import { EstadoChip } from './EstadoChip';
import { Plazo } from './Plazo';

type Fila = Record<string, string | number | null> & { uuid: string };
type Resp = { content: Fila[]; totalElements: number; totalPages: number; page: number; conteos: Record<string, number> };

/** Bandejas de trabajo de Faltas: por situación de la causa, con búsqueda y filtros (SF-02, SF-03). */
export function CausasBandeja() {
  const [bandeja, setBandeja] = useState<BandejaId>('activas');
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(0);
  const [r, setR] = useState<Resp | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    setCargando(true);
    http.post<Resp>('/api/causas', { bandeja, texto, tipo, estado, page, size: 15 }).then(setR).finally(() => setCargando(false));
  }, [bandeja, texto, tipo, estado, page]);

  useEffect(() => {
    const t = setTimeout(cargar, texto ? 300 : 0);
    return () => clearTimeout(t);
  }, [cargar, texto]);

  const info = BANDEJAS.find((b) => b.id === bandeja)!;

  return (
    <div className="pagina">
      <div className="bandeja-tabs" role="tablist">
        {BANDEJAS.map((b) => (
          <button key={b.id} type="button" role="tab" aria-selected={b.id === bandeja} className={`bandeja-tab ${b.id === bandeja ? 'activa' : ''}`} onClick={() => { setBandeja(b.id); setPage(0); }} title={b.ayuda}>
            {b.titulo} <span className="n">{r?.conteos?.[b.id] ?? '·'}</span>
          </button>
        ))}
      </div>

      <div className="filtros-card filtros-card-compacto mb-2">
        <div className="row g-2 p-2 align-items-end">
          <div className="col-12 col-md-5">
            <label className="form-label-v2" htmlFor="b-texto">Buscar por acta, legajo, dominio, documento o nombre</label>
            <input id="b-texto" className="form-control form-control-sm" value={texto} onChange={(e) => { setTexto(e.target.value); setPage(0); }} placeholder="T-001014, AB123CD, 28999111..." />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label-v2" htmlFor="b-tipo">Tipo de acta</label>
            <select id="b-tipo" className="form-select form-select-sm" value={tipo} onChange={(e) => { setTipo(e.target.value); setPage(0); }}>
              <option value="">Todos</option>
              {Object.entries(TIPOS_ACTA).map(([k, v]) => <option key={k} value={k}>{v.corto}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-4">
            <label className="form-label-v2" htmlFor="b-estado">Estado</label>
            <select id="b-estado" className="form-select form-select-sm" value={estado} onChange={(e) => { setEstado(e.target.value); setPage(0); }}>
              <option value="">Todos</option>
              {ESTADOS_CAUSA.map((e) => <option key={e.nombre} value={e.nombre}>{e.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card-step">
        <div className="card-step-header">
          <h2>{info.titulo}</h2>
          <p>{info.ayuda}</p>
        </div>
        <div className="table-responsive">
          <table className="table custom-table align-middle">
            <thead>
              <tr>
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
              {cargando && !r ? (
                <tr><td colSpan={8} className="celda-cargando"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando...</td></tr>
              ) : null}
              {(r?.content ?? []).map((c) => (
                <tr key={c.uuid}>
                  <td>
                    <Link href={`/private/causa/${c.uuid}`} className="fw-semibold">{c.legajo_numero_acta}</Link>
                    <div className="texto-ayuda">{TIPOS_ACTA[tipoActa(String(c.infraccion_tipo_nombre))].corto}</div>
                  </td>
                  <td>{c.legajo_number}/{c.legajo_anio}</td>
                  <td>{fechaCorta(String(c.legajo_fecha ?? ''))}</td>
                  <td>{c.infractor_razon_social || c.infractor_nombre || 'NN'}<div className="texto-ayuda">{c.infractor_cuit || c.infractor_documento_numero}</div></td>
                  <td>{c.vehiculo_numero_dominio || '-'}</td>
                  <td><EstadoChip estado={String(c.estado_faltas)} medida={Number(c.medida_vigente) === 1} /></td>
                  <td><Plazo vence={c.vence_plazo_at ? Number(c.vence_plazo_at) : null} /></td>
                  <td className="text-end">{pesos(c.monto_estimado == null ? null : Number(c.monto_estimado))}</td>
                </tr>
              ))}
              {r && !r.content.length ? (
                <tr><td colSpan={8}><div className="sin-resultados py-3"><i className="fa-solid fa-inbox" aria-hidden="true" /><p className="mb-0">No hay causas en esta bandeja.</p></div></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
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

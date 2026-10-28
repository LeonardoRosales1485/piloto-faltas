'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { http } from '@/lib/api-client';
import { CAMPOS_MIGRADA, COLUMNAS_CSV, fechaMigrada, parsearCsv, tipoMigradaDe, TIPOS_MIGRADA, type ActaMigrada } from '@/lib/actas-migradas';
import { ACCEPT_ADJUNTOS, leerAdjunto } from '@/lib/adjuntos';
import { fechaHora, puede, tiposPermitidos } from '@/lib/dominio';
import { useAuthUser } from '@/lib/use-auth-user';
import { useNotify } from './NotifyProvider';

type Fila = ActaMigrada & { tieneArchivo?: boolean };
type Correccion = { fecha: number; usuario: string; campos: Record<string, { antes: string; despues: string }> };

const tipoTexto = (id: number) => TIPOS_MIGRADA.find((t) => t.id === Number(id))?.t ?? '-';
const fechaCorta = (f?: string | null) => (f ? f.split('-').reverse().join('/') : '-');
const etiqueta = (k: string) => (k === 'archivo' ? 'Escaneo' : CAMPOS_MIGRADA.find((c) => c.k === k)?.t ?? k);
const MIME: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
const base = (n: string) => n.split(/[\\/]/).pop()!.toLowerCase();
const sinExt = (n: string) => base(n).replace(/\.[a-z0-9]+$/, '');
const clave = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Actas migradas: actas labradas antes de este sistema. Solo el acta (sus datos para buscarla y el escaneo): no son
 * causas, no tienen estados, bandejas, boletas ni portal. Carga manual o importación masiva (planilla + escaneos).
 */
export function ActasMigradas() {
  const user = useAuthUser();
  const notify = useNotify();
  const cargar = puede(user, 'cargarActasMigradas');
  const tipos = useMemo(() => { const p = tiposPermitidos(user); return TIPOS_MIGRADA.filter((t) => !p || p.includes(t.id)); }, [user]);

  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(0);
  const [res, setRes] = useState<{ lista: Fila[]; total: number; tam: number } | null>(null);
  const [error, setError] = useState('');
  const [ver, setVer] = useState<string | null>(null);
  const [alta, setAlta] = useState(false);
  const [importar, setImportar] = useState(false);

  const buscar = useCallback((p = 0) => {
    const sp = new URLSearchParams({ pagina: String(p) });
    if (q.trim()) sp.set('q', q.trim());
    if (tipo) sp.set('tipo', tipo);
    if (desde) sp.set('desde', desde);
    if (hasta) sp.set('hasta', hasta);
    setPagina(p);
    setError('');
    http.get<{ lista: Fila[]; total: number; tam: number }>(`/api/actas-migradas?${sp}`).then(setRes).catch((e: Error) => { setError(e.message); setRes({ lista: [], total: 0, tam: 50 }); });
  }, [q, tipo, desde, hasta]);
  useEffect(() => { buscar(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const paginas = res ? Math.max(1, Math.ceil(res.total / res.tam)) : 1;

  return (
    <div className="pagina">
      <div className="card-step mb-3">
        <div className="card-step-header d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h2>Actas migradas</h2>
            <p>Actas labradas antes de este sistema. Se consultan acá: el acta escaneada y sus datos. No son causas del sistema (no tienen estados, bandejas, boletas ni portal).</p>
          </div>
          {cargar ? (
            <div className="d-flex gap-2 flex-wrap">
              <button type="button" className="btn btn-outline-primary" onClick={() => setImportar(true)}><i className="fa-solid fa-file-import" aria-hidden="true" /> Importar planilla</button>
              <button type="button" className="btn btn-primary" onClick={() => setAlta(true)}><i className="fa-solid fa-plus" aria-hidden="true" /> Cargar acta</button>
            </div>
          ) : null}
        </div>
        <form className="d-flex flex-wrap gap-2 align-items-end p-3 pt-0" onSubmit={(e) => { e.preventDefault(); buscar(0); }}>
          <div style={{ flex: '1 1 240px' }}>
            <label className="form-label-v2" htmlFor="am-q">Buscar</label>
            <input id="am-q" className="form-control" placeholder="N.° de acta, DNI/CUIT, dominio, nombre o legajo" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {tipos.length > 1 ? (
            <div>
              <label className="form-label-v2" htmlFor="am-tipo">Tipo</label>
              <select id="am-tipo" className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="">Todos</option>
                {tipos.map((t) => <option key={t.id} value={t.id}>{t.t}</option>)}
              </select>
            </div>
          ) : null}
          <div><label className="form-label-v2" htmlFor="am-desde">Desde</label><input id="am-desde" type="date" className="form-control" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
          <div><label className="form-label-v2" htmlFor="am-hasta">Hasta</label><input id="am-hasta" type="date" className="form-control" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
          <button type="submit" className="btn btn-primary"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> Buscar</button>
        </form>
      </div>

      {error ? <div className="aviso aviso-peligro">{error}</div> : null}
      {!res ? <p className="texto-ayuda">Cargando…</p> : !res.lista.length ? <p className="texto-ayuda">No hay actas migradas{q || tipo || desde || hasta ? ' con esos filtros' : ' cargadas'}.</p> : (
        <div className="card-step">
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead><tr><th>Acta</th><th>Fecha</th><th>Infractor</th><th>DNI / CUIT</th><th>Dominio</th><th>Artículos</th><th>Escaneo</th></tr></thead>
              <tbody>
                {res.lista.map((a) => (
                  <tr key={a.uuid} role="button" tabIndex={0} onClick={() => setVer(a.uuid)} onKeyDown={(e) => { if (e.key === 'Enter') setVer(a.uuid); }}>
                    <td><strong>{a.numero_acta}</strong><div className="texto-ayuda">{tipoTexto(a.infraccion_tipo_id)}{a.legajo ? ` · Leg. ${a.legajo}` : ''}</div></td>
                    <td>{fechaCorta(a.fecha)}</td>
                    <td>{a.infractor_nombre || '-'}</td>
                    <td>{a.infractor_documento || '-'}</td>
                    <td>{a.dominio || '-'}</td>
                    <td className="texto-recortado" title={a.articulos ?? ''}>{a.articulos || '-'}</td>
                    <td>{a.tieneArchivo ? <i className="fa-solid fa-file-image text-primary" title="Con escaneo" aria-label="Con escaneo" /> : <span className="badge bg-warning text-dark">Sin escaneo</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between align-items-center p-2 flex-wrap gap-2">
            <span className="texto-ayuda">{res.total} acta(s)</span>
            {paginas > 1 ? (
              <span className="d-flex gap-1 align-items-center">
                <button type="button" className="btn btn-sm btn-outline-secondary" disabled={pagina === 0} onClick={() => buscar(pagina - 1)}>Anterior</button>
                <span className="texto-ayuda px-2">Página {pagina + 1} de {paginas}</span>
                <button type="button" className="btn btn-sm btn-outline-secondary" disabled={pagina + 1 >= paginas} onClick={() => buscar(pagina + 1)}>Siguiente</button>
              </span>
            ) : null}
          </div>
        </div>
      )}

      {ver ? <DetalleMigrada uuid={ver} puedeCorregir={cargar} onCerrar={() => setVer(null)} onCambio={() => buscar(pagina)} /> : null}
      {alta ? <AltaMigrada tipos={tipos} onCerrar={() => setAlta(false)} onHecho={(u) => { setAlta(false); buscar(0); setVer(u); notify.success('Acta migrada cargada'); }} /> : null}
      {importar ? <ImportarMigradas tipos={tipos} onCerrar={() => { setImportar(false); buscar(0); }} /> : null}
    </div>
  );
}

function Modal({ titulo, icono, onCerrar, children, pie }: { titulo: string; icono: string; onCerrar: () => void; children: React.ReactNode; pie?: React.ReactNode }) {
  return (
    <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal-fake modal-fake-xl" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-fake-header"><i className={icono} aria-hidden="true" /><h2>{titulo}</h2><button type="button" aria-label="Cerrar" onClick={onCerrar}>&times;</button></div>
        <div className="modal-fake-body">{children}</div>
        {pie ? <div className="modal-fake-footer">{pie}</div> : null}
      </div>
    </div>
  );
}

function CamposForm({ v, set }: { v: Record<string, string>; set: (k: string, x: string) => void }) {
  return (
    <div className="row g-3">
      {CAMPOS_MIGRADA.map((c) => (
        <div key={c.k} className={c.k === 'articulos' || c.k === 'observaciones' ? 'col-12' : 'col-12 col-md-6'}>
          <label className="form-label-v2" htmlFor={`am-${c.k}`}>{c.t}{c.k === 'numero_acta' ? <span className="requerido"> *</span> : null}</label>
          {c.k === 'articulos' || c.k === 'observaciones'
            ? <textarea id={`am-${c.k}`} className="form-control" rows={2} value={v[c.k] ?? ''} onChange={(e) => set(c.k, e.target.value)} />
            : <input id={`am-${c.k}`} className="form-control" type={c.k === 'fecha' ? 'date' : 'text'} inputMode={c.k === 'infractor_documento' ? 'numeric' : undefined} value={v[c.k] ?? ''} onChange={(e) => set(c.k, e.target.value)} />}
        </div>
      ))}
    </div>
  );
}

function VistaArchivo({ raw, nombre }: { raw: string; nombre: string }) {
  if (raw.startsWith('data:application/pdf')) return <object data={raw} type="application/pdf" className="visor-migrada" aria-label={nombre}><p className="texto-ayuda">No se puede mostrar el PDF acá: descárguelo.</p></object>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={raw} alt={`Escaneo del acta (${nombre})`} className="visor-migrada" />;
}

function DetalleMigrada({ uuid, puedeCorregir, onCerrar, onCambio }: { uuid: string; puedeCorregir: boolean; onCerrar: () => void; onCambio: () => void }) {
  const notify = useNotify();
  const [a, setA] = useState<ActaMigrada | null>(null);
  const [editar, setEditar] = useState<Record<string, string> | null>(null);
  const [guardando, setGuardando] = useState(false);
  const cargarActa = useCallback(() => { http.get<ActaMigrada>(`/api/actas-migradas/${uuid}`).then(setA).catch((e: Error) => { notify.error('No se pudo abrir', e.message); onCerrar(); }); }, [uuid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(cargarActa, [cargarActa]);
  let correcciones: Correccion[] = [];
  try { correcciones = JSON.parse(a?.correcciones_json ?? '[]') as Correccion[]; } catch { correcciones = []; }

  async function guardar(cuerpo: Record<string, unknown>, ok: string) {
    setGuardando(true);
    try {
      await http.post(`/api/actas-migradas/${uuid}`, cuerpo);
      notify.success(ok);
      setEditar(null);
      cargarActa();
      onCambio();
    } catch (e) { notify.error('No se pudo guardar', (e as Error).message); } finally { setGuardando(false); }
  }
  async function agregarEscaneo(f?: File) {
    if (!f) return;
    await guardar({ archivoNombre: f.name, archivoRaw: await leerAdjunto(f) }, 'Escaneo agregado');
  }

  return (
    <Modal titulo={a ? `Acta migrada ${a.numero_acta}` : 'Acta migrada'} icono="fa-solid fa-box-archive" onCerrar={onCerrar}
      pie={editar ? (
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setEditar(null)}>Cancelar</button>
          <button type="button" className="btn btn-primary" disabled={guardando || !editar.numero_acta?.trim()} onClick={() => void guardar({ datos: editar }, 'Datos corregidos')}>Guardar corrección</button>
        </>
      ) : (
        <>
          {puedeCorregir && a ? <button type="button" className="btn btn-outline-primary" onClick={() => setEditar(Object.fromEntries(CAMPOS_MIGRADA.map((c) => [c.k, String(a[c.k] ?? '')])))}><i className="fa-solid fa-pen" aria-hidden="true" /> Corregir datos</button> : null}
          <button type="button" className="btn btn-primary" onClick={onCerrar}>Cerrar</button>
        </>
      )}>
      {!a ? <p className="texto-ayuda">Cargando…</p> : (
        <div className="row g-3">
          <div className="col-12 col-lg-5">
            {editar ? <CamposForm v={editar} set={(k, x) => setEditar({ ...editar, [k]: x })} /> : (
              <dl className="ficha">
                <div><dt>Tipo</dt><dd>{tipoTexto(a.infraccion_tipo_id)}</dd></div>
                {CAMPOS_MIGRADA.map((c) => <div key={c.k}><dt>{c.t}</dt><dd>{c.k === 'fecha' ? fechaCorta(a.fecha) : String(a[c.k] ?? '') || '-'}</dd></div>)}
                <div><dt>Cargada</dt><dd>{a.cargado_por} · {fechaHora(a.cargado_at)}{a.lote ? ` · importación ${a.lote}` : ''}</dd></div>
              </dl>
            )}
            {correcciones.length ? (
              <details className="mt-3">
                <summary className="texto-ayuda">Correcciones ({correcciones.length})</summary>
                <ul className="texto-ayuda mt-1">
                  {correcciones.map((c, n) => (
                    <li key={n}>{fechaHora(c.fecha)} · {c.usuario}: {Object.entries(c.campos).map(([k, x]) => `${etiqueta(k)} «${x.antes || '—'}» → «${x.despues || '—'}»`).join('; ')}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
          <div className="col-12 col-lg-7">
            {a.archivo_raw ? (
              <>
                <VistaArchivo raw={a.archivo_raw} nombre={a.archivo_nombre ?? 'acta'} />
                <a className="btn btn-sm btn-outline-secondary mt-2" href={a.archivo_raw} download={a.archivo_nombre ?? `acta-${a.numero_acta}`}><i className="fa-solid fa-download" aria-hidden="true" /> Descargar {a.archivo_nombre}</a>
              </>
            ) : (
              <div className="aviso aviso-alerta">
                Esta acta se cargó sin el escaneo.
                {puedeCorregir ? <label className="d-block mt-2"><span className="btn btn-sm btn-outline-primary"><i className="fa-solid fa-upload" aria-hidden="true" /> Agregar escaneo</span><input type="file" className="d-none" accept={ACCEPT_ADJUNTOS} disabled={guardando} onChange={(e) => void agregarEscaneo(e.target.files?.[0])} /></label> : null}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function AltaMigrada({ tipos, onCerrar, onHecho }: { tipos: typeof TIPOS_MIGRADA; onCerrar: () => void; onHecho: (uuid: string) => void }) {
  const notify = useNotify();
  const [tipo, setTipo] = useState(String(tipos[0]?.id ?? ''));
  const [v, setV] = useState<Record<string, string>>({});
  const [archivo, setArchivo] = useState<{ nombre: string; raw: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function guardar() {
    setEnviando(true);
    try {
      const r = await http.post<{ uuid: string }>('/api/actas-migradas', { tipo: Number(tipo), datos: v, archivoNombre: archivo?.nombre, archivoRaw: archivo?.raw });
      onHecho(r.uuid);
    } catch (e) { notify.error('No se pudo cargar', (e as Error).message); } finally { setEnviando(false); }
  }
  return (
    <Modal titulo="Cargar acta migrada" icono="fa-solid fa-box-archive" onCerrar={onCerrar}
      pie={<><button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button><button type="button" className="btn btn-primary" disabled={enviando || !tipo || !v.numero_acta?.trim()} onClick={() => void guardar()}>{enviando ? 'Guardando…' : 'Guardar'}</button></>}>
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6">
          <label className="form-label-v2" htmlFor="am-alta-tipo">Tipo de acta <span className="requerido">*</span></label>
          <select id="am-alta-tipo" className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>{tipos.map((t) => <option key={t.id} value={t.id}>{t.t}</option>)}</select>
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label-v2" htmlFor="am-alta-archivo">Escaneo del acta (PDF, JPG o PNG)</label>
          <input id="am-alta-archivo" type="file" className="form-control" accept={ACCEPT_ADJUNTOS} onChange={async (e) => { const f = e.target.files?.[0]; setArchivo(f ? { nombre: f.name, raw: await leerAdjunto(f) } : null); }} />
          <p className="texto-ayuda mb-0">Una vez guardado, el escaneo no se reemplaza (es el original).</p>
        </div>
      </div>
      <CamposForm v={v} set={(k, x) => setV({ ...v, [k]: x })} />
    </Modal>
  );
}

type FilaImport = { n: number; tipo: number | null; datos: Record<string, string>; archivo: File | null; archivoPedido: string; errores: string[]; estado?: 'ok' | 'error'; mensaje?: string };

function ImportarMigradas({ tipos, onCerrar }: { tipos: typeof TIPOS_MIGRADA; onCerrar: () => void }) {
  const [csv, setCsv] = useState<File | null>(null);
  const [escaneos, setEscaneos] = useState<File[]>([]);
  const [filas, setFilas] = useState<FilaImport[] | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [error, setError] = useState('');
  const permitidos = tipos.map((t) => t.id);

  function modelo() {
    const ej = ['transito', 'T-012345', '15/03/2025', '1234/2025', 'Juan Pérez', '30123456', 'AB123CD', 'Ley 24.449 Art. 77 (sin VTV)', 'Av. Pte. Illia 1500', 'Inspector García', '', 'T-012345.pdf'];
    const txt = `﻿${COLUMNAS_CSV.join(';')}\n${ej.join(';')}\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
    a.download = 'actas-migradas-modelo.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  /** Escaneos sueltos o dentro de un ZIP. */
  async function archivosDe(lista: File[]): Promise<File[]> {
    const out: File[] = [];
    for (const f of lista) {
      if (/\.zip$/i.test(f.name)) {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(f);
        for (const e of Object.values(zip.files)) {
          const ext = base(e.name).split('.').pop() ?? '';
          if (e.dir || !MIME[ext] || base(e.name).startsWith('.')) continue;
          out.push(new File([await e.async('blob')], base(e.name), { type: MIME[ext] }));
        }
      } else out.push(f);
    }
    return out;
  }

  async function revisar() {
    if (!csv) return;
    setLeyendo(true);
    setError('');
    try {
      const filasCsv = parsearCsv(await csv.text());
      if (!filasCsv.length) throw new Error('La planilla está vacía o no tiene encabezado.');
      const faltan = ['tipo', 'numero'].filter((c) => !(c in filasCsv[0]));
      if (faltan.length) throw new Error(`Faltan las columnas: ${faltan.join(', ')}. Use la planilla modelo.`);
      const archivos = await archivosDe(escaneos);
      const porNombre = new Map(archivos.map((f) => [base(f.name), f]));
      const porClave = new Map(archivos.map((f) => [clave(sinExt(f.name)), f]));
      const vistos = new Set<string>();
      setFilas(filasCsv.map((r, i) => {
        const tipo = tipoMigradaDe(r.tipo);
        const datos = Object.fromEntries(CAMPOS_MIGRADA.map((c) => [c.k, r[c.csv] ?? '']));
        const pedido = (r.archivo ?? '').trim();
        const archivo = pedido ? porNombre.get(base(pedido)) ?? null : porClave.get(clave(datos.numero_acta)) ?? null;
        const errores: string[] = [];
        if (!tipo) errores.push(`tipo «${r.tipo}» desconocido`);
        else if (!permitidos.includes(tipo)) errores.push('tipo de acta que no gestiona');
        if (!datos.numero_acta.trim()) errores.push('sin número de acta');
        if (datos.fecha && !fechaMigrada(datos.fecha)) errores.push(`fecha «${datos.fecha}» inválida`);
        if (pedido && !archivo) errores.push(`no está el escaneo «${pedido}»`);
        const k = `${tipo}|${datos.numero_acta.trim()}`;
        if (vistos.has(k)) errores.push('número repetido en la planilla');
        vistos.add(k);
        return { n: i + 2, tipo, datos: { ...datos, fecha: fechaMigrada(datos.fecha) ?? '' }, archivo, archivoPedido: pedido, errores };
      }));
    } catch (e) { setError((e as Error).message); } finally { setLeyendo(false); }
  }

  async function importar() {
    if (!filas) return;
    const lote = `MIG-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;
    const nuevas = [...filas];
    const validas = nuevas.filter((f) => !f.errores.length && !f.estado);
    for (let i = 0; i < validas.length; i++) {
      const f = validas[i];
      setProgreso(i);
      try {
        const raw = f.archivo ? await leerAdjunto(f.archivo) : undefined;
        await http.post('/api/actas-migradas', { tipo: f.tipo, datos: f.datos, archivoNombre: f.archivo?.name, archivoRaw: raw, lote });
        f.estado = 'ok';
      } catch (e) { f.estado = 'error'; f.mensaje = (e as Error).message; }
      setFilas([...nuevas]);
    }
    setProgreso(null);
  }

  const validas = filas?.filter((f) => !f.errores.length) ?? [];
  const hechas = filas?.filter((f) => f.estado).length ?? 0;
  const ok = filas?.filter((f) => f.estado === 'ok').length ?? 0;
  const sinEscaneo = validas.filter((f) => !f.archivo).length;

  return (
    <Modal titulo="Importar actas migradas" icono="fa-solid fa-file-import" onCerrar={progreso === null ? onCerrar : () => undefined}
      pie={!filas ? (
        <><button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button><button type="button" className="btn btn-primary" disabled={!csv || leyendo} onClick={() => void revisar()}>{leyendo ? 'Revisando…' : 'Revisar'}</button></>
      ) : hechas ? (
        <button type="button" className="btn btn-primary" disabled={progreso !== null} onClick={onCerrar}>{progreso !== null ? `Importando ${progreso + 1} de ${validas.length}…` : 'Cerrar'}</button>
      ) : (
        <><button type="button" className="btn btn-outline-secondary" onClick={() => setFilas(null)}>Volver</button><button type="button" className="btn btn-primary" disabled={!validas.length || progreso !== null} onClick={() => void importar()}>{progreso !== null ? `Importando ${progreso + 1} de ${validas.length}…` : `Importar ${validas.length} acta(s)`}</button></>
      )}>
      {!filas ? (
        <>
          <p>Una fila por acta en una planilla CSV (Excel: «Guardar como → CSV»). Los escaneos van sueltos o en un ZIP: se asocian por la columna <code>archivo</code> o, si está vacía, por el número de acta (p. ej. <code>T-012345.pdf</code>).</p>
          <p className="texto-ayuda">Columnas: {COLUMNAS_CSV.join(' · ')}. Obligatorias: tipo (transito, contravencion o sustancias) y numero. Fecha DD/MM/AAAA.</p>
          <button type="button" className="btn btn-sm btn-outline-secondary mb-3" onClick={modelo}><i className="fa-solid fa-download" aria-hidden="true" /> Descargar planilla modelo</button>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label-v2" htmlFor="am-csv">Planilla (CSV) <span className="requerido">*</span></label>
              <input id="am-csv" type="file" className="form-control" accept=".csv,text/csv" onChange={(e) => setCsv(e.target.files?.[0] ?? null)} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label-v2" htmlFor="am-esc">Escaneos (PDF/JPG/PNG o un ZIP)</label>
              <input id="am-esc" type="file" className="form-control" multiple accept={`${ACCEPT_ADJUNTOS},.zip,application/zip`} onChange={(e) => setEscaneos(Array.from(e.target.files ?? []))} />
              {escaneos.length ? <p className="texto-ayuda mb-0">{escaneos.length} archivo(s) elegidos</p> : null}
            </div>
          </div>
          {error ? <div className="aviso aviso-peligro mt-3 mb-0">{error}</div> : null}
        </>
      ) : (
        <>
          <div className={`aviso ${hechas ? (ok === hechas ? 'aviso-ok' : 'aviso-alerta') : 'aviso-info'}`}>
            {hechas
              ? `Importadas ${ok} de ${hechas}.${hechas - ok ? ' Las que dieron error quedan marcadas: corríjalas en la planilla y vuelva a importar solo esas (las ya cargadas se rechazan por número repetido).' : ''}`
              : `${filas.length} fila(s): ${validas.length} lista(s) para importar${filas.length - validas.length ? `, ${filas.length - validas.length} con errores (no se importan)` : ''}${sinEscaneo ? `, ${sinEscaneo} sin escaneo` : ''}.`}
          </div>
          <div className="table-responsive" style={{ maxHeight: '50vh' }}>
            <table className="table table-sm align-middle mb-0">
              <thead><tr><th>Fila</th><th>Tipo</th><th>Acta</th><th>Fecha</th><th>Infractor</th><th>Escaneo</th><th>Resultado</th></tr></thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.n} className={f.errores.length || f.estado === 'error' ? 'table-danger' : f.estado === 'ok' ? 'table-success' : ''}>
                    <td>{f.n}</td>
                    <td>{f.tipo ? tipoTexto(f.tipo) : '-'}</td>
                    <td>{f.datos.numero_acta || '-'}</td>
                    <td>{fechaCorta(f.datos.fecha)}</td>
                    <td>{f.datos.infractor_nombre || '-'}</td>
                    <td>{f.archivo ? f.archivo.name : <span className="texto-ayuda">sin escaneo</span>}</td>
                    <td>{f.errores.length ? f.errores.join('; ') : f.estado === 'ok' ? 'Cargada' : f.estado === 'error' ? f.mensaje : 'Lista'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}

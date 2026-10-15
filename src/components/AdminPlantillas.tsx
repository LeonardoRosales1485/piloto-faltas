'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderLogo } from './LoaderLogo';
import { TablaVista } from './TablaVista';
import { ModalForm } from './ModalForm';
import { BuscadorOpciones } from './BuscadorOpciones';
import { useNotify } from './NotifyProvider';
import { useCarga } from '@/lib/use-carga';
import { http } from '@/lib/api-client';
import { ESTADOS_CAUSA, FAMILIA_ETIQUETA, fechaCorta, infoEstado, puede, TIPOS_ACTA, type FamiliaEstado } from '@/lib/dominio';
import { useAuthUser } from '@/lib/use-auth-user';
import { CATEGORIAS_PLANTILLA, comportamientosFijos, esDelSistema, estadosOrigen, textoPlano, tipoActaTexto, tiposDePlantilla, TIPOS_PLANTILLA } from '@/lib/plantillas';
import { docxAHtml } from '@/lib/docx-a-html';

type R = Record<string, any>;
export const CLAVE_IMPORTADA = 'faltas:plantilla-importada';

/** «hace 3 días», «hoy», «hace 2 meses». */
export function haceCuanto(ms?: number | null): string {
  if (!ms) return 'nunca';
  const dias = Math.floor((Date.now() - Number(ms)) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  return fechaCorta(ms);
}

/** Situación de la plantilla para la lista: publicada, con cambios sin publicar, nunca publicada, inactiva. */
export function situacion(p: R): { t: string; c: string } {
  if (!p.publicada_at) return { t: 'Borrador sin publicar', c: 'pl-sit-borrador' };
  if (!Number(p.activa)) return { t: 'Deshabilitada', c: 'pl-sit-inactiva' };
  if (p.borrador_json) return { t: 'Publicada · con cambios sin publicar', c: 'pl-sit-cambios' };
  return { t: 'Publicada', c: 'pl-sit-ok' };
}

type Filtros = { q: string; categoria: string; tipo: string; regla: string; situacion: string };
const FILTROS0: Filtros = { q: '', categoria: '', tipo: '', regla: '', situacion: 'habilitadas' };

/** Plantillas de escritos: lista con filtros y mapa de estados. La edición está en /private/plantillas/[id]. */
export function AdminPlantillas() {
  const notify = useNotify();
  const router = useRouter();
  const user = useAuthUser();
  const editar = puede(user?.rol, 'plantillas');
  const [lista, setLista] = useState<R[]>([]);
  const [vista, setVista] = useState<'lista' | 'mapa'>('lista');
  const [f, setF] = useState<Filtros>(FILTROS0);
  const [nueva, setNueva] = useState(false);
  const [confirmar, setConfirmar] = useState<R | null>(null);
  const [cargando, seguir] = useCarga();
  const cargar = useCallback(() => { void seguir(http.get<R[]>('/api/plantillas?todas=1').then(setLista)).catch((e: Error) => notify.error('No se pudieron cargar las plantillas', e.message)); }, [seguir, notify]);
  useEffect(cargar, [cargar]);

  const visibles = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return lista.filter((p) => {
      if (q && !`${p.titulo} ${p.categoria} ${p.estado_resultante ?? ''} ${textoPlano(String(p.contenido_html ?? ''))}`.toLowerCase().includes(q)) return false;
      if (f.categoria && p.categoria !== f.categoria) return false;
      if (f.tipo && !tiposDePlantilla(p.tipo_acta).includes(f.tipo as never)) return false;
      if (f.regla === 'cambia' && !p.estado_resultante) return false;
      if (f.regla === 'no' && p.estado_resultante) return false;
      if (f.regla === 'sistema' && !esDelSistema(p.codigo)) return false;
      if (f.situacion === 'habilitadas' && !(Number(p.activa) && p.publicada_at)) return false;
      if (f.situacion === 'deshabilitadas' && Number(p.activa) && p.publicada_at) return false;
      if (f.situacion === 'cambios' && !p.borrador_json) return false;
      return true;
    });
  }, [lista, f]);
  const hayFiltros = JSON.stringify(f) !== JSON.stringify(FILTROS0);
  const conCambios = lista.filter((p) => p.borrador_json).length;

  async function activar(p: R, activa: boolean) {
    try {
      await http.post('/api/plantillas', { accion: 'activar', id: p.id, activa });
      notify.success(activa ? 'Plantilla habilitada' : 'Plantilla deshabilitada');
      setConfirmar(null);
      cargar();
    } catch (e) { notify.error('No se pudo cambiar', (e as Error).message); }
  }

  function pedirDesactivar(p: R) {
    if (esDelSistema(p.codigo) || Number(p.usos) > 0) setConfirmar(p);
    else void activar(p, false);
  }

  return (
    <div className="pagina pl-pagina">
      <div className="card-step mb-3">
        <div className="pl-encabezado">
          <div>
            <h1>Plantillas de escritos</h1>
            <p>{lista.length} plantillas · {lista.filter((p) => Number(p.activa) && p.publicada_at).length} habilitadas{conCambios ? ` · ${conCambios} con cambios sin publicar` : ''}</p>
          </div>
          <div className="pl-encabezado-acciones">
            <div className="pl-segmentado" role="tablist" aria-label="Vista">
              <button type="button" role="tab" aria-selected={vista === 'lista'} className={vista === 'lista' ? 'activo' : ''} onClick={() => setVista('lista')}><i className="fa-solid fa-list" aria-hidden="true" /> Lista</button>
              <button type="button" role="tab" aria-selected={vista === 'mapa'} className={vista === 'mapa' ? 'activo' : ''} onClick={() => setVista('mapa')}><i className="fa-solid fa-diagram-project" aria-hidden="true" /> Mapa de estados</button>
            </div>
            {editar ? <button type="button" className="btn btn-primary" onClick={() => setNueva(true)}><i className="fa-solid fa-plus" aria-hidden="true" /> Nueva plantilla</button> : null}
          </div>
        </div>
        {!editar ? <div className="px-3 pb-3"><div className="aviso aviso-info mb-0"><i className="fa-solid fa-eye" aria-hidden="true" />Puede consultar las plantillas. Para crearlas o modificarlas hace falta el permiso «Plantillas de escritos».</div></div> : null}
      </div>

      {vista === 'lista' ? (
        <>
          <div className="card-step mb-3">
            <div className="pl-filtros">
              <div className="pl-filtro pl-filtro-q">
                <label htmlFor="pl-q">Buscar</label>
                <input id="pl-q" className="form-control" placeholder="Título, estado o texto de la plantilla" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
              </div>
              <div className="pl-filtro">
                <label htmlFor="pl-fc">Categoría</label>
                <select id="pl-fc" className="form-select" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
                  <option value="">Todas</option>{CATEGORIAS_PLANTILLA.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="pl-filtro">
                <label htmlFor="pl-ft">Tipo de acta</label>
                <select id="pl-ft" className="form-select" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
                  <option value="">Todos</option>{TIPOS_PLANTILLA.map((t) => <option key={t} value={t}>{TIPOS_ACTA[t].corto}</option>)}
                </select>
              </div>
              <div className="pl-filtro">
                <label htmlFor="pl-fr">Efecto en la causa</label>
                <select id="pl-fr" className="form-select" value={f.regla} onChange={(e) => setF({ ...f, regla: e.target.value })}>
                  <option value="">Todos</option><option value="cambia">Cambia el estado</option><option value="no">No cambia el estado</option><option value="sistema">Usadas por el sistema</option>
                </select>
              </div>
              <div className="pl-filtro">
                <label htmlFor="pl-fs">Situación</label>
                <select id="pl-fs" className="form-select" value={f.situacion} onChange={(e) => setF({ ...f, situacion: e.target.value })}>
                  <option value="habilitadas">Habilitadas</option><option value="cambios">Con cambios sin publicar</option><option value="deshabilitadas">Deshabilitadas o sin publicar</option><option value="">Todas</option>
                </select>
              </div>
              {hayFiltros ? <button type="button" className="btn btn-link pl-limpiar" onClick={() => setF(FILTROS0)}>Limpiar filtros</button> : null}
            </div>
          </div>

          <div className="card-step">
            <div className="card-step-header"><h2>{visibles.length === lista.length ? 'Todas las plantillas' : `${visibles.length} de ${lista.length} plantillas`}</h2></div>
            <div className="card-step-body">
              <TablaVista>
                <table className="table align-middle mb-0 pl-tabla">
                  <thead><tr><th>Plantilla</th><th>Categoría</th><th>Tipo de acta</th><th>La causa pasa a</th><th>Firma</th><th>Uso</th><th>Situación</th><th aria-label="Acciones" /></tr></thead>
                  <tbody>
                    {cargando && !lista.length ? <tr><td colSpan={8}><LoaderLogo tam={56} texto="Cargando…" /></td></tr> : null}
                    {visibles.map((p) => {
                      const s = situacion(p);
                      const habilitada = Number(p.activa) === 1 && Boolean(p.publicada_at);
                      return (
                        <tr key={p.id} className={habilitada ? '' : 'pl-fila-apagada'}>
                          <td>
                            <Link className="pl-titulo" href={`/private/plantillas/${p.id}`}>{p.titulo}</Link>
                            {esDelSistema(p.codigo) ? <span className="pl-badge pl-badge-sistema" title={comportamientosFijos(p.codigo, null).join(' ')}><i className="fa-solid fa-gear" aria-hidden="true" /> Usada por el sistema</span> : null}
                          </td>
                          <td>{p.categoria}</td>
                          <td>{tipoActaTexto(p.tipo_acta)}</td>
                          <td>{p.estado_resultante ? <span className={`estado-chip estado-${infoEstado(p.estado_resultante).familia}`}>{p.estado_resultante}</span> : <span className="texto-ayuda">No cambia</span>}</td>
                          <td>{Number(p.requiere_revision) ? <span title="Requiere revisión y firma de la Directora"><i className="fa-solid fa-signature" aria-hidden="true" /> Directora</span> : <span className="texto-ayuda">No</span>}</td>
                          <td>{Number(p.usos) ? <span title={p.ultimo_uso ? `Último uso: ${fechaCorta(p.ultimo_uso)}` : ''}>{p.usos} {Number(p.usos) === 1 ? 'escrito' : 'escritos'}<span className="texto-ayuda d-block">{haceCuanto(p.ultimo_uso)}</span></span> : <span className="texto-ayuda">Sin uso</span>}</td>
                          <td><span className={`pl-sit ${s.c}`}>{s.t}</span></td>
                          <td className="text-end text-nowrap">
                            <Link className="btn btn-sm btn-outline-primary me-1" href={`/private/plantillas/${p.id}`}>{editar ? <><i className="fa-solid fa-pen" aria-hidden="true" /> Editar</> : <><i className="fa-solid fa-eye" aria-hidden="true" /> Ver</>}</Link>
                            {editar ? <button type="button" className="btn btn-sm btn-outline-secondary me-1" title="Crear una plantilla nueva a partir de esta" onClick={() => router.push(`/private/plantillas/nueva?desde=${p.id}`)}><i className="fa-solid fa-copy" aria-hidden="true" /> Duplicar</button> : null}
                            {editar && p.publicada_at ? (
                              habilitada
                                ? <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => pedirDesactivar(p)}>Deshabilitar</button>
                                : <button type="button" className="btn btn-sm btn-outline-success" onClick={() => void activar(p, true)}>Habilitar</button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                    {!cargando && !visibles.length ? (
                      <tr><td colSpan={8} className="text-center py-4"><span className="texto-ayuda">No hay plantillas con estos filtros.</span>{hayFiltros ? <> <button type="button" className="btn btn-link btn-sm" onClick={() => setF(FILTROS0)}>Limpiar filtros</button></> : null}</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </TablaVista>
            </div>
          </div>
          <p className="texto-ayuda mt-2">Deshabilitar una plantilla no borra nada: deja de ofrecerse al generar escritos y los escritos ya generados no cambian.</p>
        </>
      ) : (
        <MapaEstados lista={lista.filter((p) => Number(p.activa) === 1 && p.publicada_at)} />
      )}

      {nueva ? <NuevaPlantilla lista={lista} onCancel={() => setNueva(false)} onElegir={(url) => { setNueva(false); router.push(url); }} /> : null}
      {confirmar ? (
        <ModalForm
          titulo="Deshabilitar plantilla" icono="fa-solid fa-ban" textoOk="Deshabilitar" peligro campos={[]}
          aviso={[
            esDelSistema(confirmar.codigo) ? `«${confirmar.titulo}» la usa el sistema: ${comportamientosFijos(confirmar.codigo, null).join(' ')} Si la deshabilita, esa acción va a fallar con «Plantilla inexistente».` : '',
            Number(confirmar.usos) ? `Se usó en ${confirmar.usos} escrito(s); esos escritos no cambian.` : '',
          ].filter(Boolean).join(' ')}
          onCancel={() => setConfirmar(null)} onOk={() => activar(confirmar, false)}
        />
      ) : null}
    </div>
  );
}

/** Elegir cómo empezar: en blanco, duplicando una existente o importando un Word. */
function NuevaPlantilla({ lista, onCancel, onElegir }: { lista: R[]; onCancel: () => void; onElegir: (url: string) => void }) {
  const notify = useNotify();
  const [modo, setModo] = useState<'blanco' | 'duplicar' | 'word'>('blanco');
  const [desde, setDesde] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function seguir() {
    if (modo === 'blanco') return onElegir('/private/plantillas/nueva');
    if (modo === 'duplicar') return desde ? onElegir(`/private/plantillas/nueva?desde=${desde}`) : undefined;
    if (!archivo) return;
    setTrabajando(true);
    try {
      const html = await docxAHtml(archivo);
      try { sessionStorage.setItem(CLAVE_IMPORTADA, JSON.stringify({ html, titulo: archivo.name.replace(/\.docx$/i, '') })); } catch { /* sin almacenamiento */ }
      onElegir('/private/plantillas/nueva?origen=word');
    } catch (e) {
      notify.error('No se pudo leer el Word', (e as Error).message);
    } finally { setTrabajando(false); }
  }

  const opciones = [
    { v: 'blanco' as const, i: 'fa-regular fa-file', t: 'En blanco', d: 'Empieza con fecha y referencia del acta.' },
    { v: 'duplicar' as const, i: 'fa-regular fa-copy', t: 'Duplicar una existente', d: 'Copia texto y reglas; después ajusta lo que cambie.' },
    { v: 'word' as const, i: 'fa-regular fa-file-word', t: 'Importar desde Word', d: 'Trae el texto de un .docx sin el formato sobrante.' },
  ];
  const listo = modo === 'blanco' || (modo === 'duplicar' && desde) || (modo === 'word' && archivo);
  return (
    <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-fake" role="dialog" aria-modal="true" aria-label="Nueva plantilla">
        <div className="modal-fake-header"><i className="fa-solid fa-file-circle-plus" aria-hidden="true" /><h2>Nueva plantilla</h2><button type="button" aria-label="Cerrar" onClick={onCancel}>&times;</button></div>
        <div className="modal-fake-body">
          <div className="pl-opciones" role="radiogroup" aria-label="Cómo empezar">
            {opciones.map((o) => (
              <label key={o.v} className={`pl-opcion ${modo === o.v ? 'activa' : ''}`}>
                <input type="radio" name="pl-nueva" checked={modo === o.v} onChange={() => setModo(o.v)} />
                <i className={o.i} aria-hidden="true" />
                <span><strong>{o.t}</strong><span>{o.d}</span></span>
              </label>
            ))}
          </div>
          {modo === 'duplicar' ? (
            <div className="mt-3">
              <label className="pl-label" htmlFor="pl-desde">Plantilla a duplicar</label>
              <BuscadorOpciones id="pl-desde" valor={desde} onChange={setDesde} placeholder="Buscar por título o categoría" opciones={lista.map((p) => ({ v: String(p.id), t: p.titulo, sub: `${p.categoria}${p.estado_resultante ? ` · pasa a «${p.estado_resultante}»` : ''}` }))} />
            </div>
          ) : null}
          {modo === 'word' ? (
            <div className="mt-3">
              <label className="pl-label" htmlFor="pl-docx">Archivo de Word (.docx)</label>
              <input id="pl-docx" type="file" className="form-control" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
              <p className="texto-ayuda">Se conservan párrafos, alineación, negrita, cursiva, subrayado y tablas. Los campos como «[Acta:Numero]» se reconocen solos; el resto se inserta después desde el panel de campos.</p>
            </div>
          ) : null}
        </div>
        <div className="modal-fake-footer">
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn btn-primary" disabled={!listo || trabajando} onClick={() => void seguir()}>{trabajando ? 'Leyendo…' : 'Continuar'}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Mapa de estados: para cada estado de la causa, qué plantillas llevan a él y cuáles se recomiendan desde él.
 * Sirve para ver huecos y duplicados y para validar el circuito con la Dirección.
 */
function MapaEstados({ lista }: { lista: R[] }) {
  const [soloConEscritos, setSoloConEscritos] = useState(false);
  const libres = lista.filter((p) => !estadosOrigen(p.estados_origen)).length;
  const familias = useMemo(() => {
    const m = new Map<FamiliaEstado, typeof ESTADOS_CAUSA>();
    for (const e of ESTADOS_CAUSA) m.set(e.familia, [...(m.get(e.familia) ?? []), e]);
    return Array.from(m.entries());
  }, []);
  const sinEntrada = ESTADOS_CAUSA.filter((e) => !lista.some((p) => p.estado_resultante === e.nombre)).length;

  return (
    <div className="card-step">
      <div className="card-step-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div><h2>Mapa de estados</h2><p>Qué escritos llevan la causa a cada estado y cuáles se recomiendan desde él. Solo plantillas habilitadas.</p></div>
        <label className="form-check form-switch mb-0"><input className="form-check-input" type="checkbox" role="switch" checked={soloConEscritos} onChange={(e) => setSoloConEscritos(e.target.checked)} /> Solo estados con escritos</label>
      </div>
      <div className="card-step-body">
        <div className="aviso aviso-info">
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          {sinEntrada} estados no se alcanzan con ningún escrito: se llega por acciones de la causa (notificar, emitir boletas, archivar) o por cambio manual. {libres} plantillas no tienen estados de origen y se ofrecen en cualquier estado.
        </div>
        {familias.map(([fam, estados]) => {
          const filas = estados.map((e) => ({
            e,
            entran: lista.filter((p) => p.estado_resultante === e.nombre),
            salen: lista.filter((p) => estadosOrigen(p.estados_origen)?.includes(e.nombre)),
          })).filter((x) => !soloConEscritos || x.entran.length || x.salen.length);
          if (!filas.length) return null;
          return (
            <section key={fam} className="pl-mapa-familia">
              <h3>{FAMILIA_ETIQUETA[fam]}</h3>
              <div className="pl-mapa-grid">
                {filas.map(({ e, entran, salen }) => {
                  const duplicadas = TIPOS_PLANTILLA.filter((t) => entran.filter((p) => tiposDePlantilla(p.tipo_acta).includes(t)).length > 1);
                  return (
                    <div key={e.nombre} className={`pl-mapa-estado ${entran.length || salen.length ? '' : 'vacio'}`}>
                      <span className={`estado-chip estado-${e.familia}`}>{e.nombre}</span>
                      <div className="pl-mapa-col">
                        <span className="pl-mapa-titulo"><i className="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" /> Llevan a este estado</span>
                        {entran.length ? <ul>{entran.map((p) => <li key={p.id}><Link href={`/private/plantillas/${p.id}`}>{p.titulo}</Link> <span className="texto-ayuda">· {tipoActaTexto(p.tipo_acta)}</span></li>)}</ul> : <span className="texto-ayuda">Ningún escrito</span>}
                        {duplicadas.length ? <span className="pl-mapa-alerta"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Varias plantillas para {duplicadas.map((t) => TIPOS_ACTA[t].corto).join(' y ')}: revisar si alguna sobra.</span> : null}
                      </div>
                      <div className="pl-mapa-col">
                        <span className="pl-mapa-titulo"><i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" /> Recomendadas desde este estado</span>
                        {salen.length ? <ul>{salen.map((p) => <li key={p.id}><Link href={`/private/plantillas/${p.id}`}>{p.titulo}</Link>{p.estado_resultante ? <span className="texto-ayuda"> → {p.estado_resultante}</span> : null}</li>)}</ul> : <span className="texto-ayuda">{e.final ? 'Estado final' : 'Ninguna en particular'}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

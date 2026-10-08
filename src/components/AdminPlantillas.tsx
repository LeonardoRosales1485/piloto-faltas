'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from 'react';
import { http } from '@/lib/api-client';
import { ESTADOS_CAUSA } from '@/lib/dominio';
import { ModalForm } from './ModalForm';
import { useNotify } from './NotifyProvider';

type R = Record<string, any>;
const CATEGORIAS = ['Fallo', 'Resolución', 'Disposición', 'Pago', 'Nota interna', 'Nota externa', 'Documentación', 'Notificación', 'General'];
const CAMPOS = ['[Acta:Numero]', '[Acta:Expediente]', '[Acta:Titular]', '[Acta:TipoDocumento]', '[Acta:Nro.Documento]', '[Acta:Calle]', '[Acta:Nro.Puerta]', '[Acta:Localidad]', '[Acta:Partido]', '[Acta:Provincia.Infractor]', '[Acta:Fecha]', '[Acta:Hora]', '[Acta:Calle.Infraccion]', '[Acta:Nro.Puerta.Infraccion]', '[Acta:Localidad_Infraccion]', '[Acta:Dependencia]', '[Acta:Dominio.Vehiculo]', '[Acta:Infracciones]', '[Causa:Monto]', '[Causa:Unidades]', '[Causa:Medidas]', '[Causa:FechaNotificacion]', '[Causa:Vencimiento]', '[Documento:Numero]', '[Documento:Fecha]', '[System:FECHA]', '[System:TEXTOFECHA]', '[System:HORA]', '[Usuario:Nombre]'];

/** Alta y edición de plantillas de escritos, con su regla de cambio de estado (SF-36, SF-37). */
export function AdminPlantillas() {
  const notify = useNotify();
  const [lista, setLista] = useState<R[]>([]);
  const [sel, setSel] = useState<R | null>(null);
  const [filtro, setFiltro] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const [nuevoCampo, setNuevoCampo] = useState(false);
  const rango = useRef<Range | null>(null);
  const cargar = useCallback(() => { http.get<R[]>('/api/plantillas?todas=1').then(setLista); }, []);
  useEffect(cargar, [cargar]);
  useEffect(() => { if (ref.current && sel) ref.current.innerHTML = sel.contenido_html ?? ''; }, [sel?.id, sel]);

  async function guardar() {
    if (!sel) return;
    try {
      const r = await http.post<R>('/api/plantillas', { ...sel, contenido_html: ref.current?.innerHTML ?? '' });
      notify.success('Plantilla guardada');
      cargar();
      setSel({ ...sel, id: r.id });
    } catch (e) { notify.error('No se pudo guardar', (e as Error).message); }
  }

  /** Inserta texto donde estaba el cursor dentro de la plantilla (o al final si el cursor no estaba en ella). */
  function insertarEnEditor(texto: string, r: Range | null = rango.current) {
    const el = ref.current;
    if (!el) return;
    const nodo = document.createTextNode(texto);
    if (r && el.contains(r.commonAncestorContainer)) {
      r.deleteContents();
      r.insertNode(nodo);
    } else {
      const ultimo = el.lastElementChild ?? el;
      ultimo.appendChild(nodo);
    }
    const sel = window.getSelection();
    const nuevo = document.createRange();
    nuevo.setStartAfter(nodo);
    nuevo.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(nuevo);
    rango.current = nuevo.cloneRange();
    el.focus();
  }

  function insertar(campo: string) {
    const sel = window.getSelection();
    insertarEnEditor(campo, sel && sel.rangeCount ? sel.getRangeAt(0) : null);
  }

  const visibles = lista.filter((p) => `${p.titulo} ${p.categoria}`.toLowerCase().includes(filtro.toLowerCase()));
  return (
    <div className="pagina">
      <div className="causa-layout" style={{ gridTemplateColumns: '340px minmax(0,1fr)' }}>
        <div className="card-step">
          <div className="card-step-header d-flex justify-content-between align-items-center">
            <div><h2>Plantillas</h2><p>{lista.length} cargadas</p></div>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setSel({ titulo: '', categoria: 'Nota interna', tipo_acta: 'todas', contenido_html: '<p>Los Polvorines, [System:TEXTOFECHA]</p><p>Ref. Acta N° [Acta:Numero] - Legajo N° [Acta:Expediente]</p><p></p>', estado_resultante: '', requiere_revision: 1, numerable: 0, activa: 1 })}>Nueva</button>
          </div>
          <div className="p-2"><input className="form-control form-control-sm" placeholder="Buscar por título" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Buscar plantilla" /></div>
          <ul className="lista-items px-3" style={{ maxHeight: '70vh', overflow: 'auto' }}>
            {visibles.map((p) => (
              <li key={p.id} style={{ cursor: 'pointer', opacity: p.activa ? 1 : 0.5 }} onClick={() => setSel({ ...p })}>
                <div><div className="li-titulo">{p.titulo}</div><div className="li-sub">{p.categoria}{p.estado_resultante ? ` → ${p.estado_resultante}` : ''}{p.activa ? '' : ' · inactiva'}</div></div>
              </li>
            ))}
          </ul>
        </div>
        {sel ? (
          <div className="card-step">
            <div className="card-step-body">
              <div className="row g-2">
                <div className="col-12 col-md-6"><label className="form-label-v2" htmlFor="pl-t">Título</label><input id="pl-t" className="form-control" value={sel.titulo} onChange={(e) => setSel({ ...sel, titulo: e.target.value })} /></div>
                <div className="col-6 col-md-3"><label className="form-label-v2" htmlFor="pl-c">Categoría</label><select id="pl-c" className="form-select" value={sel.categoria} onChange={(e) => setSel({ ...sel, categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></div>
                <div className="col-6 col-md-3"><label className="form-label-v2" htmlFor="pl-a">Tipo de acta</label><select id="pl-a" className="form-select" value={sel.tipo_acta} onChange={(e) => setSel({ ...sel, tipo_acta: e.target.value })}><option value="todas">Todas</option><option value="multas">Tránsito</option><option value="contravenciones">Contravención</option><option value="sustancias">Sustancias</option></select></div>
                <div className="col-12 col-md-6"><label className="form-label-v2" htmlFor="pl-e">Al quedar definitivo, la causa pasa a</label><select id="pl-e" className="form-select" value={sel.estado_resultante ?? ''} onChange={(e) => setSel({ ...sel, estado_resultante: e.target.value })}><option value="">No cambia de estado</option>{ESTADOS_CAUSA.map((e) => <option key={e.nombre}>{e.nombre}</option>)}</select></div>
                <div className="col-12 col-md-6 d-flex gap-3 align-items-end flex-wrap">
                  <label className="form-check"><input type="checkbox" className="form-check-input" checked={Number(sel.requiere_revision) === 1} onChange={(e) => setSel({ ...sel, requiere_revision: e.target.checked ? 1 : 0 })} /> Requiere revisión y firma de la Directora</label>
                  <label className="form-check"><input type="checkbox" className="form-check-input" checked={Number(sel.numerable) === 1} onChange={(e) => setSel({ ...sel, numerable: e.target.checked ? 1 : 0 })} /> Lleva número y fecha</label>
                  <label className="form-check"><input type="checkbox" className="form-check-input" checked={Number(sel.activa) === 1} onChange={(e) => setSel({ ...sel, activa: e.target.checked ? 1 : 0 })} /> Activa</label>
                </div>
              </div>
              <div className="mt-3">
                <span className="form-label-v2">Insertar campo del acta</span>
                <div className="mt-1 mb-2"><button type="button" className="btn btn-sm btn-primary" onMouseDown={(e) => { e.preventDefault(); const sel = window.getSelection(); rango.current = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null; setNuevoCampo(true); }}><i className="fa-solid fa-i-cursor" aria-hidden="true" /> Insertar campo a completar</button> <span className="texto-ayuda">Al generar el escrito, solo estos campos se completan; el resto del texto queda bloqueado.</span></div>
                <span className="form-label-v2">Campos automáticos del acta</span>
                <div className="d-flex flex-wrap gap-1 mt-1">{CAMPOS.map((c) => <button key={c} type="button" className="btn btn-sm btn-light" onMouseDown={(e) => { e.preventDefault(); insertar(c); }}>{c}</button>)}</div>
              </div>
              <div className="editor-escrito-wrap mt-3"><div className="hoja-a4" style={{ minHeight: '120mm' }}><div ref={ref} contentEditable suppressContentEditableWarning style={{ outline: 'none', minHeight: '100mm' }} aria-label="Contenido de la plantilla" /></div></div>
              <div className="botonera"><button type="button" className="btn btn-primary" onClick={() => void guardar()}>Guardar plantilla</button></div>
            </div>
          </div>
        ) : null}
        {!sel ? <div className="card-step"><div className="card-step-body"><p className="texto-ayuda">Elija una plantilla para editarla o cree una nueva. Las plantillas iniciales se cargaron de los DOCX de la Dirección de Faltas; las cédulas y notificaciones en persona quedan inactivas en la fase 1.</p></div></div> : null}
        {nuevoCampo ? (
          <ModalForm titulo="Insertar campo a completar" icono="fa-solid fa-i-cursor" textoOk="Insertar" campos={[{ k: 'label', t: 'Nombre del campo', tipo: 'texto', req: true, ayuda: 'Ej.: N° de expediente, Monto acarreo, Fecha del decreto' }, { k: 'tipo', t: 'Tipo de dato', tipo: 'select', opciones: [{ v: 'texto', t: 'Texto' }, { v: 'numero', t: 'Número' }, { v: 'fecha', t: 'Fecha' }, { v: 'moneda', t: 'Monto en pesos' }] }]} onCancel={() => setNuevoCampo(false)} onOk={(v) => { const marca = `[Completar:${v.label.replace(/[\]:]/g, '')}${v.tipo !== 'texto' ? `:${v.tipo}` : ''}]`; insertarEnEditor(marca); setNuevoCampo(false); }} />
        ) : null}
      </div>
    </div>
  );
}

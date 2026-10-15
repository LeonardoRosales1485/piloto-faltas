'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoaderLogo } from './LoaderLogo';
import { ModalForm } from './ModalForm';
import { HojasPaginadas } from './HojasPaginadas';
import { useNotify } from './NotifyProvider';
import { CLAVE_IMPORTADA, haceCuanto, situacion } from './AdminPlantillas';
import { http } from '@/lib/api-client';
import { normalizarHtml } from '@/lib/campos';
import { ESTADOS_CAUSA, FAMILIA_ETIQUETA, fechaHora, infoEstado, puede, TIPOS_ACTA, type FamiliaEstado } from '@/lib/dominio';
import { PIE_INSTITUCIONAL } from '@/lib/membrete';
import { useAuthUser } from '@/lib/use-auth-user';
import {
  CATEGORIAS_PLANTILLA, comportamientosFijos, datosDe, diferencias, esDelSistema, GRUPOS_CAMPOS, infoMarcador, RE_MARCADOR,
  tipoActaTexto, tipoActaValor, tiposDePlantilla, TIPOS_CAMPO_COMPLETAR, TIPOS_PLANTILLA, validarPlantilla, type DatosPlantilla, type Tramo,
} from '@/lib/plantillas';

type R = Record<string, any>;
type Tab = 'campos' | 'config' | 'revision' | 'historial';

const HTML_INICIAL = '<p style="text-align:right">Los Polvorines, [System:TEXTOFECHA]</p><p style="text-align:right">Ref. Acta N° [Acta:Numero] - Legajo N° [Acta:Expediente]</p><p><br></p>';
const ZW = '​';

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => escHtml(s).replace(/"/g, '&quot;');

/** Decodifica entidades HTML de un marcador («N&deg;» → «N°»). */
function decodificar(s: string) {
  if (!s.includes('&')) return s;
  const t = document.createElement('textarea');
  t.innerHTML = s;
  return t.value;
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const TIPO_TXT: Record<string, string> = Object.fromEntries(TIPOS_CAMPO_COMPLETAR.map((t) => [t.v, t.t]));

/** Un campo en la hoja: etiqueta de color, no editable letra por letra (se borra entera). */
function chipHtml(tk: string): string {
  const m = infoMarcador(tk);
  if (m.clase === 'auto') return `<span class="pl-tk pl-tk-auto" contenteditable="false" data-tk="${escAttr(tk)}" title="${escAttr(`Se completa solo: ${m.label} (${m.grupo})`)}">${escHtml(m.label)}</span>`;
  if (m.clase === 'completar') {
    const tipo = m.tipo !== 'texto' ? ` · ${TIPO_TXT[m.tipo] ?? m.tipo}` : '';
    return `<span class="pl-tk pl-tk-completar" contenteditable="false" data-tk="${escAttr(tk)}" title="${escAttr(`Lo completa quien redacta: ${m.label}${tipo}`)}">✎ ${escHtml(m.label || 'sin nombre')}<small>${escHtml(tipo)}</small></span>`;
  }
  return `<span class="pl-tk pl-tk-error" contenteditable="false" data-tk="${escAttr(tk)}" title="Campo desconocido: quítelo o reemplácelo">${escHtml(m.label)}</span>`;
}

function aChips(html: string) {
  return normalizarHtml(html).replace(RE_MARCADOR, (_m, a: string, b: string) => chipHtml(decodificar(`${a}:${b}`)));
}

/** HTML para guardar: las etiquetas vuelven a ser marcadores [Grupo:Campo] y se quitan los saltos de página. */
function serializar(el: HTMLElement): string {
  const c = el.cloneNode(true) as HTMLElement;
  c.querySelectorAll('.salto-auto').forEach((x) => x.remove());
  c.querySelectorAll('[data-tk]').forEach((x) => x.replaceWith(document.createTextNode(`[${x.getAttribute('data-tk')}]`)));
  return c.innerHTML.replace(new RegExp(ZW, 'g'), '');
}

const PERMITIDAS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'TABLE', 'TBODY', 'THEAD', 'TR', 'TD', 'TH']);

/** Deja solo párrafos, saltos, negrita, cursiva, subrayado, listas y tablas; de los estilos, solo la alineación. */
function limpiarPegado(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('style, script, meta, link, title').forEach((x) => x.remove());
  const limpiar = (el: Element) => {
    for (const c of Array.from(el.children)) {
      limpiar(c);
      const tag = c.tagName === 'DIV' || /^H[1-6]$/.test(c.tagName) ? 'P' : c.tagName;
      if (!PERMITIDAS.has(tag)) { c.replaceWith(...Array.from(c.childNodes)); continue; }
      const al = (c as HTMLElement).style?.textAlign;
      let nuevo: Element = c;
      if (tag !== c.tagName) { nuevo = doc.createElement(tag); nuevo.append(...Array.from(c.childNodes)); c.replaceWith(nuevo); }
      for (const a of Array.from(nuevo.attributes)) nuevo.removeAttribute(a.name);
      if (al && ['center', 'right', 'justify'].includes(al)) nuevo.setAttribute('style', `text-align:${al}`);
    }
  };
  limpiar(doc.body);
  return doc.body.innerHTML.replace(/<!--[\s\S]*?-->/g, '');
}

/** Vista previa: lo que no se completó queda resaltado con su nombre. */
function marcarPendientes(html: string) {
  return html.replace(RE_MARCADOR, (_m, a: string, b: string) => {
    const m = infoMarcador(`${a}:${b}`);
    if (m.clase === 'completar') return `<span class="pl-prev-completar" title="Lo completa quien redacta">${escHtml(m.label)}</span>`;
    if (a === 'Documento') return `<span class="pl-prev-auto" title="Se asigna al quedar definitivo o firmado">${b === 'Numero' ? 'N° (al firmar)' : 'fecha del número'}</span>`;
    return `<span class="pl-prev-auto">${escHtml(m.label)}</span>`;
  });
}

const HERRAMIENTAS: ({ cmd: string; i: string; t: string; k?: string } | null)[] = [
  { cmd: 'undo', i: 'fa-rotate-left', t: 'Deshacer', k: 'Ctrl+Z' },
  { cmd: 'redo', i: 'fa-rotate-right', t: 'Rehacer', k: 'Ctrl+Y' },
  null,
  { cmd: 'bold', i: 'fa-bold', t: 'Negrita', k: 'Ctrl+B' },
  { cmd: 'italic', i: 'fa-italic', t: 'Cursiva', k: 'Ctrl+I' },
  { cmd: 'underline', i: 'fa-underline', t: 'Subrayado', k: 'Ctrl+U' },
  null,
  { cmd: 'justifyLeft', i: 'fa-align-left', t: 'Alinear a la izquierda' },
  { cmd: 'justifyCenter', i: 'fa-align-center', t: 'Centrar' },
  { cmd: 'justifyRight', i: 'fa-align-right', t: 'Alinear a la derecha' },
  { cmd: 'justifyFull', i: 'fa-align-justify', t: 'Justificar' },
  null,
  { cmd: 'insertUnorderedList', i: 'fa-list-ul', t: 'Lista' },
  { cmd: 'insertOrderedList', i: 'fa-list-ol', t: 'Lista numerada' },
  { cmd: 'outdent', i: 'fa-outdent', t: 'Reducir sangría' },
  { cmd: 'indent', i: 'fa-indent', t: 'Aumentar sangría' },
  null,
  { cmd: 'removeFormat', i: 'fa-text-slash', t: 'Quitar formato' },
];

/** Diferencias de configuración entre dos versiones, en palabras. */
function cambiosConfig(a: DatosPlantilla, b: DatosPlantilla): string[] {
  const out: string[] = [];
  if (a.titulo !== b.titulo) out.push(`Título: «${a.titulo}» → «${b.titulo}»`);
  if (a.categoria !== b.categoria) out.push(`Categoría: ${a.categoria} → ${b.categoria}`);
  if (tipoActaTexto(a.tipo_acta) !== tipoActaTexto(b.tipo_acta)) out.push(`Tipo de acta: ${tipoActaTexto(a.tipo_acta)} → ${tipoActaTexto(b.tipo_acta)}`);
  if ((a.estado_resultante ?? '') !== (b.estado_resultante ?? '')) out.push(`La causa pasa a: ${a.estado_resultante ?? 'no cambia'} → ${b.estado_resultante ?? 'no cambia'}`);
  const oa = (a.estados_origen ?? []).join(', ') || 'cualquier estado', ob = (b.estados_origen ?? []).join(', ') || 'cualquier estado';
  if (oa !== ob) out.push(`Se recomienda en: ${oa} → ${ob}`);
  if (a.requiere_revision !== b.requiere_revision) out.push(`Firma de la Directora: ${a.requiere_revision ? 'sí' : 'no'} → ${b.requiere_revision ? 'sí' : 'no'}`);
  if (a.numerable !== b.numerable) out.push(`Lleva número y fecha: ${a.numerable ? 'sí' : 'no'} → ${b.numerable ? 'sí' : 'no'}`);
  return out;
}

/** Editor de una plantilla: hoja A4 con membrete en el centro y panel lateral (campos, configuración, revisión, historial). */
export function EditorPlantilla({ id }: { id: string }) {
  const esNueva = id === 'nueva';
  const params = useSearchParams();
  const router = useRouter();
  const notify = useNotify();
  const user = useAuthUser();
  const editable = puede(user?.rol, 'plantillas');

  const ref = useRef<HTMLDivElement>(null);
  const rango = useRef<Range | null>(null);
  const htmlCarga = useRef<string | null>(null);
  const marcarGuardado = useRef(false);

  const [pl, setPl] = useState<R | null>(null);
  const [versiones, setVersiones] = useState<R[]>([]);
  const [uso, setUso] = useState<R>({ usos: 0, ultimo_uso: null });
  const [datos, setDatos] = useState<DatosPlantilla | null>(null);
  const [guardado, setGuardado] = useState('');
  const [pintar, setPintar] = useState(0);
  const [tab, setTab] = useState<Tab>(editable ? 'campos' : 'config');
  const [trabajando, setTrabajando] = useState(false);
  const [publicar, setPublicar] = useState(false);
  const [confirmarDescartar, setConfirmarDescartar] = useState(false);
  const [campoCompletar, setCampoCompletar] = useState(false);
  const [ac, setAc] = useState<{ x: number; y: number } | null>(null);
  const [previa, setPrevia] = useState<{ html: string; causa: R; otroTipo: boolean } | null>(null);
  const [actaPrevia, setActaPrevia] = useState('');
  const [comparando, setComparando] = useState<{ titulo: string; tramos: Tramo[][]; config: string[] } | null>(null);
  const [error, setError] = useState('');
  const datosRef = useRef(datos);
  datosRef.current = datos;

  /** Carga datos en la hoja (y opcionalmente los toma como «guardados»). */
  const cargarEnHoja = useCallback((d: DatosPlantilla, comoGuardado: boolean) => {
    htmlCarga.current = d.contenido_html;
    marcarGuardado.current = comoGuardado;
    setDatos(d);
    setPintar((n) => n + 1);
  }, []);

  const cargar = useCallback(async () => {
    try {
      if (esNueva) {
        const desde = params.get('desde');
        if (desde) {
          const r = await http.get<{ plantilla: R }>(`/api/plantillas/${desde}`);
          const base = r.plantilla.borrador_json ? datosDe(JSON.parse(r.plantilla.borrador_json)) : datosDe(r.plantilla);
          cargarEnHoja({ ...base, titulo: `Copia de ${base.titulo}` }, false);
        } else if (params.get('origen') === 'word') {
          let imp: { html?: string; titulo?: string } = {};
          try { imp = JSON.parse(sessionStorage.getItem(CLAVE_IMPORTADA) ?? '{}'); sessionStorage.removeItem(CLAVE_IMPORTADA); } catch { /* sin almacenamiento */ }
          cargarEnHoja(datosDe({ titulo: imp.titulo ?? '', categoria: 'Nota interna', contenido_html: imp.html || HTML_INICIAL, requiere_revision: 1 }), false);
        } else {
          cargarEnHoja(datosDe({ titulo: '', categoria: 'Nota interna', contenido_html: HTML_INICIAL, requiere_revision: 1 }), true);
        }
        return;
      }
      const r = await http.get<{ plantilla: R; versiones: R[]; uso: R }>(`/api/plantillas/${id}`);
      setPl(r.plantilla);
      setVersiones(r.versiones);
      setUso(r.uso);
      cargarEnHoja(r.plantilla.borrador_json ? datosDe(JSON.parse(r.plantilla.borrador_json)) : datosDe(r.plantilla), true);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [esNueva, id, params, cargarEnHoja]);

  useEffect(() => { void cargar(); }, [cargar]);

  // Pinta la hoja cuando se cargan datos nuevos (apertura, restaurar versión, descartar).
  useEffect(() => {
    const el = ref.current;
    if (!el || htmlCarga.current === null) return;
    el.innerHTML = aChips(htmlCarga.current) || '<p><br></p>';
    htmlCarga.current = null;
    const d = datosRef.current;
    if (!d) return;
    const nd = { ...d, contenido_html: serializar(el) };
    setDatos(nd);
    if (marcarGuardado.current) setGuardado(JSON.stringify(nd));
  }, [pintar, previa]);

  const actualizarHtml = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const html = serializar(el);
    setDatos((d) => (d && d.contenido_html !== html ? { ...d, contenido_html: html } : d));
  }, []);

  const set = (cambio: Partial<DatosPlantilla>) => setDatos((d) => (d ? { ...d, ...cambio } : d));
  const sucio = Boolean(datos) && JSON.stringify(datos) !== guardado;
  const observaciones = useMemo(() => (datos ? validarPlantilla(datos) : []), [datos]);
  const errores = observaciones.filter((o) => o.nivel === 'error');
  const fijos = comportamientosFijos(pl?.codigo, datos?.estado_resultante);
  const usados = useMemo(() => new Set(Array.from((datos?.contenido_html ?? '').matchAll(RE_MARCADOR)).map((m) => `${m[1]}:${m[2]}`)), [datos?.contenido_html]);

  // Recuerda dónde estaba el cursor dentro de la hoja (para insertar campos desde el panel).
  useEffect(() => {
    const onSel = () => {
      const s = window.getSelection();
      if (s && s.rangeCount && ref.current?.contains(s.getRangeAt(0).commonAncestorContainer)) rango.current = s.getRangeAt(0).cloneRange();
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  function restaurarCursor() {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const s = window.getSelection();
    if (!s) return;
    s.removeAllRanges();
    if (rango.current && el.contains(rango.current.commonAncestorContainer)) s.addRange(rango.current);
    else {
      const r = document.createRange();
      r.selectNodeContents(el.lastElementChild ?? el);
      r.collapse(false);
      s.addRange(r);
    }
  }

  function insertarCampo(tk: string) {
    if (!editable || previa) return;
    restaurarCursor();
    document.execCommand('insertHTML', false, `${chipHtml(tk)}${ZW}`);
    actualizarHtml();
  }

  function formato(cmd: string) {
    restaurarCursor();
    document.execCommand(cmd, false);
    actualizarHtml();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const s = window.getSelection();
      if (s && s.rangeCount) {
        rango.current = s.getRangeAt(0).cloneRange();
        const rect = s.getRangeAt(0).getBoundingClientRect();
        const base = ref.current!.getBoundingClientRect();
        setAc({ x: rect.left || base.left + 40, y: (rect.bottom || base.top + 40) + 4 });
      }
    }
  }

  /** Pegado: se limpia el formato sobrante (Word, páginas web) y los marcadores pegados pasan a ser campos. */
  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    if (!editable) return;
    const html = e.clipboardData.getData('text/html');
    const texto = e.clipboardData.getData('text/plain');
    e.preventDefault();
    const limpio = html ? limpiarPegado(html) : texto.split(/\r?\n/).map((l) => `<p>${escHtml(l) || '<br>'}</p>`).join('');
    document.execCommand('insertHTML', false, aChips(limpio));
    actualizarHtml();
  }

  // ---------------------------------------------------------------- acciones
  async function guardar(): Promise<number | null> {
    if (!datos || !editable) return null;
    if (!datos.titulo.trim()) { setTab('config'); notify.error('Falta el título', 'Escriba un título en «Configuración» para guardar.'); return null; }
    setTrabajando(true);
    try {
      const r = await http.post<{ id: number }>('/api/plantillas', { accion: 'borrador', id: pl?.id, datos });
      setGuardado(JSON.stringify(datos));
      if (!pl) {
        notify.success('Borrador guardado', 'Publíquelo para que se pueda usar en las causas.');
        router.replace(`/private/plantillas/${r.id}`);
      } else {
        notify.success('Borrador guardado', 'Los escritos siguen usando la versión publicada hasta que publique los cambios.');
        const x = await http.get<{ plantilla: R }>(`/api/plantillas/${pl.id}`);
        setPl(x.plantilla);
      }
      return r.id;
    } catch (e) {
      notify.error('No se pudo guardar', (e as Error).message);
      return null;
    } finally { setTrabajando(false); }
  }
  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;

  async function confirmarPublicar(nota: string) {
    if (!datos) return;
    setTrabajando(true);
    try {
      let pid = pl?.id as number | undefined;
      if (!pid) {
        const r = await http.post<{ id: number }>('/api/plantillas', { accion: 'borrador', datos });
        pid = r.id;
      }
      const r = await http.post<{ version: number }>('/api/plantillas', { accion: 'publicar', id: pid, datos, nota });
      setGuardado(JSON.stringify(datos));
      setPublicar(false);
      notify.success(`Versión ${r.version} publicada`, 'Los próximos escritos usan esta versión. Los ya generados no cambian.');
      if (!pl) router.replace(`/private/plantillas/${pid}`);
      else await cargar();
    } catch (e) {
      notify.error('No se pudo publicar', (e as Error).message);
    } finally { setTrabajando(false); }
  }

  async function descartar() {
    if (!pl) return;
    try {
      if (pl.borrador_json) await http.post('/api/plantillas', { accion: 'descartar', id: pl.id });
      setConfirmarDescartar(false);
      notify.success('Cambios descartados', 'Volvió a la versión publicada.');
      await cargar();
    } catch (e) { notify.error('No se pudo descartar', (e as Error).message); }
  }

  async function activar(activa: boolean) {
    if (!pl) return;
    try {
      await http.post('/api/plantillas', { accion: 'activar', id: pl.id, activa });
      setPl({ ...pl, activa: activa ? 1 : 0 });
      notify.success(activa ? 'Plantilla habilitada' : 'Plantilla deshabilitada');
    } catch (e) { notify.error('No se pudo cambiar', (e as Error).message); }
  }

  async function verPrevia() {
    if (!datos) return;
    actualizarHtml();
    setTrabajando(true);
    try {
      const r = await http.post<{ html: string; causa: R; otroTipo: boolean }>('/api/plantillas/vista-previa', { html: datos.contenido_html, acta: actaPrevia, tipo_acta: datos.tipo_acta });
      htmlCarga.current = null;
      setPrevia({ ...r, html: marcarPendientes(r.html) });
    } catch (e) { notify.error('No se pudo armar la vista previa', (e as Error).message); }
    finally { setTrabajando(false); }
  }

  function salirPrevia() {
    // Al volver, se pinta de nuevo la hoja con lo que se estaba editando.
    htmlCarga.current = datos?.contenido_html ?? '';
    marcarGuardado.current = false;
    setPrevia(null);
  }

  function restaurar(v: R) {
    const d = datosDe(JSON.parse(v.datos_json));
    cargarEnHoja(d, false);
    setComparando(null);
    notify.success(`Versión ${v.version} cargada`, 'Revise el texto y publique para volver a usarla. Nada cambió todavía.');
  }

  function comparar(v: R, contra: 'anterior' | 'actual') {
    const dv = datosDe(JSON.parse(v.datos_json));
    if (contra === 'actual' && datos) {
      setComparando({ titulo: `Versión ${v.version} → lo que está editando`, tramos: diferencias(dv.contenido_html, datos.contenido_html), config: cambiosConfig(dv, datos) });
      return;
    }
    const prev = versiones.find((x) => Number(x.version) === Number(v.version) - 1);
    if (!prev) { notify.info('Es la primera versión', 'No hay una anterior para comparar.'); return; }
    const dp = datosDe(JSON.parse(prev.datos_json));
    setComparando({ titulo: `Versión ${prev.version} → versión ${v.version}`, tramos: diferencias(dp.contenido_html, dv.contenido_html), config: cambiosConfig(dp, dv) });
  }

  // Ctrl+S guarda el borrador.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void guardarRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Aviso al salir con cambios sin guardar (cerrar la pestaña o ir a otra pantalla).
  useEffect(() => {
    if (!sucio || !editable) return;
    const antes = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!window.confirm('Hay cambios sin guardar en la plantilla. ¿Salir sin guardarlos?')) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('beforeunload', antes);
    document.addEventListener('click', click, true);
    return () => { window.removeEventListener('beforeunload', antes); document.removeEventListener('click', click, true); };
  }, [sucio, editable]);

  if (error) return <div className="pagina"><div className="aviso aviso-peligro">{error}</div><Link href="/private/plantillas">← Volver a plantillas</Link></div>;
  if (!datos) return <LoaderLogo texto="Cargando plantilla…" pantalla />;

  const s = pl ? situacion(pl) : { t: 'Nueva · sin guardar', c: 'pl-sit-borrador' };
  const ultima = versiones[0];
  const firma = Number(datos.requiere_revision) === 1;
  const estadoGuardado = !editable ? 'Solo lectura'
    : sucio ? 'Cambios sin guardar'
      : pl?.borrador_json ? `Borrador guardado ${haceCuanto(pl.borrador_at)}${pl.borrador_por ? ` por ${pl.borrador_por}` : ''} · sin publicar`
        : pl ? 'Sin cambios: coincide con lo publicado' : 'Sin guardar';
  const hayParaPublicar = sucio || Boolean(pl?.borrador_json) || !pl?.publicada_at;

  return (
    <div className="pagina pl-pagina pl-editor">
      {/* Barra fija: volver, título, estado del guardado y acciones */}
      <div className="pl-barra" role="region" aria-label="Acciones de la plantilla">
        <Link href="/private/plantillas" className="pl-volver"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Plantillas</Link>
        <div className="pl-barra-titulo">
          <h1>{datos.titulo || 'Plantilla sin título'}</h1>
          <div className="pl-barra-meta">
            <span className={`pl-sit ${s.c}`}>{s.t}</span>
            {esDelSistema(pl?.codigo) ? <span className="pl-badge pl-badge-sistema"><i className="fa-solid fa-gear" aria-hidden="true" /> Usada por el sistema</span> : null}
            <span className={`pl-guardado ${sucio ? 'sucio' : ''}`} aria-live="polite">{sucio ? <i className="fa-solid fa-circle" aria-hidden="true" /> : null}{estadoGuardado}</span>
          </div>
        </div>
        <div className="pl-barra-acciones">
          {previa
            ? <button type="button" className="btn btn-outline-primary" onClick={salirPrevia}><i className="fa-solid fa-pen" aria-hidden="true" /> Volver a editar</button>
            : <button type="button" className="btn btn-outline-secondary" disabled={trabajando} onClick={() => void verPrevia()} title="Ver la plantilla completada con los datos de una causa real"><i className="fa-solid fa-eye" aria-hidden="true" /> Vista previa</button>}
          {editable ? (
            <>
              {pl?.borrador_json || (sucio && pl?.publicada_at) ? <button type="button" className="btn btn-link text-danger" onClick={() => setConfirmarDescartar(true)}>Descartar cambios</button> : null}
              <button type="button" className="btn btn-outline-primary" disabled={trabajando || !sucio} onClick={() => void guardar()} title="Guardar borrador (Ctrl+S)"><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Guardar borrador</button>
              <button type="button" className="btn btn-primary" disabled={trabajando || !hayParaPublicar} onClick={() => (errores.length ? (setTab('revision'), notify.error('No se puede publicar', 'Corrija los errores marcados en «Revisión».')) : setPublicar(true))}><i className="fa-solid fa-upload" aria-hidden="true" /> Publicar cambios</button>
            </>
          ) : null}
        </div>
      </div>

      <div className="pl-editor-grid">
        <div className="pl-editor-hoja">
          {previa ? (
            <div className="aviso aviso-info pl-previa-aviso">
              <i className="fa-solid fa-eye" aria-hidden="true" />
              Vista previa con el acta <strong>{previa.causa.acta}</strong> ({previa.causa.titular} · {previa.causa.estado}). No se generó ningún escrito.
              {previa.otroTipo ? ' El acta no es del tipo de esta plantilla.' : ''} En amarillo, lo que completa quien redacta.
            </div>
          ) : editable ? (
            <div className="editor-toolbar pl-toolbar" role="toolbar" aria-label="Formato del texto">
              {HERRAMIENTAS.map((h, i) => (h ? (
                <button key={h.cmd} type="button" className="btn btn-sm btn-light" title={`${h.t}${h.k ? ` (${h.k})` : ''}`} aria-label={h.t} onMouseDown={(e) => { e.preventDefault(); formato(h.cmd); }}>
                  <i className={`fa-solid ${h.i}`} aria-hidden="true" />
                </button>
              ) : <span key={`s${i}`} className="pl-toolbar-sep" aria-hidden="true" />))}
              <span className="pl-toolbar-sep" aria-hidden="true" />
              <button type="button" className="btn btn-sm btn-light" onMouseDown={(e) => { e.preventDefault(); const r = window.getSelection(); if (r?.rangeCount && ref.current?.contains(r.getRangeAt(0).commonAncestorContainer)) rango.current = r.getRangeAt(0).cloneRange(); setCampoCompletar(true); }}>
                <i className="fa-solid fa-i-cursor" aria-hidden="true" /> Campo a completar
              </button>
              <span className="pl-toolbar-ayuda">Escriba <kbd>[</kbd> para insertar un campo</span>
            </div>
          ) : null}
          <div className="editor-escrito-wrap">
            <HojasPaginadas pie={PIE_INSTITUCIONAL} deps={[pintar, previa]}>
              <div className="membrete" contentEditable={false}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/Municipio_malvinas_argentinas_logo.png" alt="" style={{ height: 44, display: 'block', margin: '0 auto 4px' }} />
                <strong>MUNICIPALIDAD DE MALVINAS ARGENTINAS</strong>DIRECCIÓN DE FALTAS
              </div>
              {previa ? (
                <div data-paginar="" dangerouslySetInnerHTML={{ __html: previa.html }} />
              ) : (
                <div
                  ref={ref}
                  data-paginar=""
                  className="pl-contenido"
                  contentEditable={editable}
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Texto de la plantilla"
                  onInput={actualizarHtml}
                  onBlur={actualizarHtml}
                  onKeyDown={onKeyDown}
                  onPaste={onPaste}
                />
              )}
            </HojasPaginadas>
          </div>
          {previa ? (
            <div className="pl-previa-otra">
              <label htmlFor="pl-acta-previa" className="pl-label">Probar con otra acta</label>
              <div className="d-flex gap-2"><input id="pl-acta-previa" className="form-control" placeholder="N° de acta" value={actaPrevia} onChange={(e) => setActaPrevia(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void verPrevia()} /><button type="button" className="btn btn-outline-primary" onClick={() => void verPrevia()}>Ver</button></div>
            </div>
          ) : null}
        </div>

        <aside className="pl-panel" aria-label="Panel de la plantilla">
          <div className="pl-tabs" role="tablist" aria-label="Secciones">
            {([
              editable ? ['campos', 'Campos', 'fa-solid fa-tags', 0] : null,
              ['config', 'Configuración', 'fa-solid fa-sliders', 0],
              ['revision', 'Revisión', 'fa-solid fa-list-check', observaciones.length],
              ['historial', 'Historial', 'fa-solid fa-clock-rotate-left', 0],
            ].filter(Boolean) as [Tab, string, string, number][]).map(([k, t, i, n]) => (
              <button key={k} type="button" role="tab" id={`pl-tab-${k}`} aria-controls={`pl-panel-${k}`} aria-selected={tab === k} className={tab === k ? 'activo' : ''} onClick={() => setTab(k)}>
                <i className={i} aria-hidden="true" /> {t}{n ? <span className={`pl-tab-n ${errores.length ? 'error' : ''}`}>{n}</span> : null}
              </button>
            ))}
          </div>

          <div className="pl-panel-cuerpo" role="tabpanel" id={`pl-panel-${tab}`} aria-labelledby={`pl-tab-${tab}`}>
            {tab === 'campos' ? <PanelCampos usados={usados} onInsertar={insertarCampo} onCompletar={() => setCampoCompletar(true)} deshabilitado={Boolean(previa)} /> : null}

            {tab === 'config' ? (
              <fieldset disabled={!editable} className="pl-config">
                <section>
                  <h3>General</h3>
                  <label className="pl-label" htmlFor="pl-titulo">Título</label>
                  <input id="pl-titulo" className="form-control" value={datos.titulo} onChange={(e) => set({ titulo: e.target.value })} placeholder="Ej.: Cédula de notificación de fallo" />
                  <label className="pl-label" htmlFor="pl-cat">Categoría</label>
                  <select id="pl-cat" className="form-select" value={datos.categoria} onChange={(e) => set({ categoria: e.target.value })}>
                    {[...new Set([...CATEGORIAS_PLANTILLA, datos.categoria])].map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <span className="pl-label" id="pl-tipos">Tipos de acta</span>
                  <div className="pl-checks" role="group" aria-labelledby="pl-tipos">
                    {TIPOS_PLANTILLA.map((t) => {
                      const sel = tiposDePlantilla(datos.tipo_acta);
                      const on = sel.includes(t);
                      return (
                        <label key={t} className="form-check">
                          <input type="checkbox" className="form-check-input" checked={on} disabled={on && sel.length === 1} onChange={(e) => set({ tipo_acta: tipoActaValor(e.target.checked ? [...sel, t] : sel.filter((x) => x !== t)) })} />
                          {TIPOS_ACTA[t].corto}
                        </label>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <h3>Comportamiento</h3>
                  <label className="pl-label" htmlFor="pl-destino">Cuando el escrito queda {firma ? 'firmado por la Directora' : 'definitivo'}, la causa pasa a</label>
                  <select id="pl-destino" className="form-select" value={datos.estado_resultante ?? ''} onChange={(e) => set({ estado_resultante: e.target.value || null })}>
                    <option value="">No cambia de estado</option>
                    {Object.entries(FAMILIA_ETIQUETA).map(([fam, etq]) => (
                      <optgroup key={fam} label={etq}>{ESTADOS_CAUSA.filter((e) => e.familia === fam).map((e) => <option key={e.nombre}>{e.nombre}</option>)}</optgroup>
                    ))}
                  </select>
                  <EstadosOrigen valor={datos.estados_origen} onChange={(v) => set({ estados_origen: v })} />
                  <label className="pl-switch">
                    <input type="checkbox" role="switch" className="form-check-input" checked={firma} onChange={(e) => set({ requiere_revision: e.target.checked ? 1 : 0 })} />
                    <span><strong>Requiere revisión y firma de la Directora</strong><span>Quien redacta lo envía a la bandeja «Escritos y firma»; recién al firmarse tiene efectos.</span></span>
                  </label>
                  <label className="pl-switch">
                    <input type="checkbox" role="switch" className="form-check-input" checked={Number(datos.numerable) === 1} onChange={(e) => set({ numerable: e.target.checked ? 1 : 0 })} />
                    <span><strong>Lleva número y fecha</strong><span>Al quedar {firma ? 'firmado' : 'definitivo'} recibe un número correlativo por categoría y año. Muéstrelo con el campo «Número del escrito».</span></span>
                  </label>
                  {fijos.length ? (
                    <div className="aviso aviso-alerta mt-2 mb-0">
                      <strong><i className="fa-solid fa-gear" aria-hidden="true" /> Comportamiento fijo del sistema</strong>
                      <ul className="mb-0 mt-1 ps-3">{fijos.map((x) => <li key={x}>{x}</li>)}</ul>
                    </div>
                  ) : null}
                </section>

                {pl ? (
                  <section>
                    <h3>Uso</h3>
                    <dl className="pl-datos">
                      <div><dt>Escritos generados</dt><dd>{uso.usos ? `${uso.usos} · último ${haceCuanto(uso.ultimo_uso)}` : 'Todavía no se usó'}</dd></div>
                      <div><dt>Versión publicada</dt><dd>{ultima ? `v${ultima.version} · ${fechaHora(ultima.publicada_at)} · ${ultima.publicada_por}` : 'Nunca se publicó'}</dd></div>
                      <div><dt>Código interno</dt><dd><code>{pl.codigo}</code></dd></div>
                    </dl>
                    {editable && pl.publicada_at ? (
                      Number(pl.activa)
                        ? <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void activar(false)}>Deshabilitar plantilla</button>
                        : <button type="button" className="btn btn-sm btn-outline-success" onClick={() => void activar(true)}>Habilitar plantilla</button>
                    ) : null}
                    {esDelSistema(pl.codigo) && Number(pl.activa) ? <p className="texto-ayuda">Si la deshabilita, las acciones del sistema que la usan van a fallar.</p> : null}
                  </section>
                ) : null}
              </fieldset>
            ) : null}

            {tab === 'revision' ? (
              <div className="pl-revision">
                {!observaciones.length ? <div className="aviso aviso-ok mb-0"><i className="fa-solid fa-circle-check" aria-hidden="true" /> No hay observaciones. La plantilla se puede publicar.</div> : null}
                {observaciones.map((o) => (
                  <div key={o.texto} className={`aviso ${o.nivel === 'error' ? 'aviso-peligro' : 'aviso-alerta'}`}>
                    <i className={`fa-solid ${o.nivel === 'error' ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}`} aria-hidden="true" />
                    <strong>{o.nivel === 'error' ? 'Impide publicar: ' : 'Revisar: '}</strong>{o.texto}
                  </div>
                ))}
                <p className="texto-ayuda">Los errores impiden publicar. Los avisos son sugerencias: puede publicar igual.</p>
              </div>
            ) : null}

            {tab === 'historial' ? (
              <div className="pl-historial">
                <div className="aviso aviso-info"><i className="fa-solid fa-shield-halved" aria-hidden="true" /> Los escritos ya generados conservan su texto: cambiar o restaurar la plantilla no los modifica.</div>
                {!versiones.length ? <p className="texto-ayuda">Todavía no hay versiones publicadas.</p> : null}
                <ol className="pl-versiones">
                  {versiones.map((v, i) => (
                    <li key={v.id}>
                      <div className="pl-version-cab"><strong>Versión {v.version}</strong>{i === 0 ? <span className="pl-badge">Vigente</span> : null}</div>
                      <div className="texto-ayuda">{fechaHora(v.publicada_at)} · {v.publicada_por}</div>
                      {v.nota ? <div className="pl-version-nota">{v.nota}</div> : null}
                      <div className="pl-version-acciones">
                        {Number(v.version) > 1 ? <button type="button" className="btn btn-sm btn-link" onClick={() => comparar(v, 'anterior')}>Ver cambios</button> : null}
                        <button type="button" className="btn btn-sm btn-link" onClick={() => comparar(v, 'actual')}>Comparar con lo editado</button>
                        {editable && i > 0 ? <button type="button" className="btn btn-sm btn-link" onClick={() => restaurar(v)}>Restaurar</button> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {ac ? (
        <Autocompletar
          x={ac.x} y={ac.y}
          onElegir={(v) => {
            setAc(null);
            if (v === '__completar') { setCampoCompletar(true); return; }
            if (v === '__literal') { restaurarCursor(); document.execCommand('insertText', false, '['); actualizarHtml(); return; }
            insertarCampo(v);
          }}
          onCerrar={() => { setAc(null); restaurarCursor(); }}
        />
      ) : null}

      {campoCompletar ? (
        <ModalForm
          titulo="Campo a completar" icono="fa-solid fa-i-cursor" textoOk="Insertar"
          aviso="Quien redacta el escrito lo completa en un formulario; el resto del texto queda bloqueado."
          campos={[
            { k: 'label', t: 'Nombre del campo', tipo: 'texto', req: true, ayuda: 'Ej.: Monto del acarreo, Fecha del decreto, N° de expediente judicial' },
            { k: 'tipo', t: 'Tipo de dato', tipo: 'select', opciones: TIPOS_CAMPO_COMPLETAR.map((t) => ({ v: t.v, t: t.t })) },
          ]}
          onCancel={() => { setCampoCompletar(false); restaurarCursor(); }}
          onOk={(v) => { setCampoCompletar(false); insertarCampo(`Completar:${v.label.replace(/[\][:<>]/g, '').trim()}${v.tipo !== 'texto' ? `:${v.tipo}` : ''}`); }}
        />
      ) : null}

      {publicar ? (
        <ModalForm
          titulo="Publicar cambios" icono="fa-solid fa-upload" textoOk="Publicar"
          aviso={`Los próximos escritos van a usar esta versión${pl?.publicada_at ? '' : ' y la plantilla queda habilitada'}. Los escritos ya generados no cambian.${observaciones.length ? ` Hay ${observaciones.length} aviso(s) en «Revisión».` : ''}`}
          campos={[{ k: 'nota', t: 'Qué cambió (queda en el historial)', tipo: 'area', ayuda: 'Ej.: Se actualizó el artículo citado según la Ordenanza 2026.' }]}
          onCancel={() => setPublicar(false)} onOk={(v) => confirmarPublicar(v.nota ?? '')}
        />
      ) : null}

      {confirmarDescartar ? (
        <ModalForm titulo="Descartar cambios" icono="fa-solid fa-rotate-left" textoOk="Descartar" peligro campos={[]} aviso="Se pierden los cambios sin publicar y la plantilla vuelve a la versión publicada." onCancel={() => setConfirmarDescartar(false)} onOk={descartar} />
      ) : null}

      {comparando ? (
        <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && setComparando(null)}>
          <div className="modal-fake pl-modal-ancho" role="dialog" aria-modal="true" aria-label="Comparar versiones">
            <div className="modal-fake-header"><i className="fa-solid fa-code-compare" aria-hidden="true" /><h2>{comparando.titulo}</h2><button type="button" aria-label="Cerrar" onClick={() => setComparando(null)}>&times;</button></div>
            <div className="modal-fake-body">
              {comparando.config.length ? <div className="aviso aviso-info"><strong>Configuración</strong><ul className="mb-0 ps-3">{comparando.config.map((c) => <li key={c}>{c}</li>)}</ul></div> : null}
              <div className="pl-diff">
                {comparando.tramos.every((p) => p.every((t) => t.t === '=')) ? <p className="texto-ayuda">El texto no cambió.</p> : comparando.tramos.map((p, i) => (
                  <p key={i} className={p.every((t) => t.t === '=') ? 'igual' : ''}>
                    {p.map((t, j) => (t.t === '=' ? <span key={j}>{t.s}</span> : t.t === '+' ? <ins key={j}>{t.s}</ins> : <del key={j}>{t.s}</del>))}
                  </p>
                ))}
              </div>
              <p className="texto-ayuda mb-0"><ins>Agregado</ins> · <del>Quitado</del>. Los párrafos sin cambios se ven atenuados.</p>
            </div>
            <div className="modal-fake-footer"><button type="button" className="btn btn-primary" onClick={() => setComparando(null)}>Cerrar</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Campos automáticos agrupados, con buscador, nombres legibles y el marcador técnico como ayuda. */
function PanelCampos({ usados, onInsertar, onCompletar, deshabilitado }: { usados: Set<string>; onInsertar: (tk: string) => void; onCompletar: () => void; deshabilitado: boolean }) {
  const [q, setQ] = useState('');
  const n = normalizar;
  const grupos = GRUPOS_CAMPOS.map((g) => ({ ...g, campos: g.campos.filter((c) => !q || n(`${g.g} ${c.label} ${c.tk} ${c.ayuda ?? ''}`).includes(n(q))) })).filter((g) => g.campos.length);
  return (
    <div className="pl-campos">
      {deshabilitado ? <div className="aviso aviso-info">Vuelva a editar para insertar campos.</div> : null}
      <button type="button" className="pl-campo-completar" disabled={deshabilitado} onMouseDown={(e) => e.preventDefault()} onClick={onCompletar}>
        <span className="pl-tk pl-tk-completar">✎ Campo a completar</span>
        <span>Un dato que escribe quien redacta (monto, fecha, número de expediente…)</span>
      </button>
      <label className="pl-label" htmlFor="pl-buscar-campo">Campos que se completan solos</label>
      <input id="pl-buscar-campo" className="form-control form-control-sm" placeholder="Buscar campo (ej.: dominio, fecha)" value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="texto-ayuda">Haga clic para insertarlo donde está el cursor, o escriba <kbd>[</kbd> en la hoja.</p>
      {grupos.map((g) => (
        <details key={g.g} open className="pl-grupo">
          <summary><i className={g.i} aria-hidden="true" /> {g.g} <span className="texto-ayuda">({g.campos.length})</span></summary>
          <ul>
            {g.campos.map((c) => (
              <li key={c.tk}>
                <button type="button" disabled={deshabilitado} onMouseDown={(e) => e.preventDefault()} onClick={() => onInsertar(c.tk)} title={`Inserta [${c.tk}]`}>
                  <span className="pl-campo-nombre">{c.label}{usados.has(c.tk) ? <i className="fa-solid fa-check pl-usado" title="Ya está en el texto" aria-label="Ya está en el texto" /> : null}</span>
                  <span className="pl-campo-ayuda">{c.ayuda ? `${c.ayuda} · ` : ''}<code>[{c.tk}]</code></span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      ))}
      {!grupos.length ? <p className="texto-ayuda">No hay campos con ese nombre.</p> : null}
      <div className="pl-leyenda"><span className="pl-tk pl-tk-auto">Automático</span><span className="pl-tk pl-tk-completar">✎ Lo completa quien redacta</span><span className="pl-tk pl-tk-error">Desconocido</span></div>
    </div>
  );
}

/** «Se recomienda cuando la causa está en…»: cualquier estado o una lista agrupada por familia. */
function EstadosOrigen({ valor, onChange }: { valor: string[] | null; onChange: (v: string[] | null) => void }) {
  const algunos = valor !== null;
  const sel = new Set(valor ?? []);
  const toggle = (e: string, on: boolean) => {
    const n = new Set(sel);
    if (on) n.add(e); else n.delete(e);
    onChange(Array.from(n));
  };
  return (
    <div className="pl-origen">
      <span className="pl-label" id="pl-origen">Se recomienda cuando la causa está en</span>
      <div className="pl-checks" role="radiogroup" aria-labelledby="pl-origen">
        <label className="form-check"><input type="radio" className="form-check-input" name="pl-origen" checked={!algunos} onChange={() => onChange(null)} /> Cualquier estado</label>
        <label className="form-check"><input type="radio" className="form-check-input" name="pl-origen" checked={algunos} onChange={() => onChange(valor ?? [])} /> Solo en algunos estados</label>
      </div>
      {algunos ? (
        <>
          <p className="texto-ayuda">Al generar un escrito desde la causa, estas plantillas aparecen primero como «Recomendadas». Las demás siguen disponibles.</p>
          {!sel.size ? <div className="aviso aviso-alerta py-2">Elija al menos un estado o vuelva a «Cualquier estado».</div> : null}
          {(Object.keys(FAMILIA_ETIQUETA) as FamiliaEstado[]).map((fam) => {
            const est = ESTADOS_CAUSA.filter((e) => e.familia === fam && !e.final);
            if (!est.length) return null;
            const n = est.filter((e) => sel.has(e.nombre)).length;
            return (
              <details key={fam} className="pl-grupo" open={n > 0}>
                <summary>{FAMILIA_ETIQUETA[fam]} {n ? <span className="pl-tab-n">{n}</span> : null}</summary>
                <div className="pl-checks pl-checks-col">
                  {est.map((e) => (
                    <label key={e.nombre} className="form-check">
                      <input type="checkbox" className="form-check-input" checked={sel.has(e.nombre)} onChange={(ev) => toggle(e.nombre, ev.target.checked)} />
                      <span className={`estado-chip estado-${infoEstado(e.nombre).familia}`}>{e.nombre}</span>
                    </label>
                  ))}
                </div>
              </details>
            );
          })}
        </>
      ) : null}
    </div>
  );
}

/** Lista que aparece al escribir «[» en la hoja: buscar un campo y elegirlo con el teclado. */
function Autocompletar({ x, y, onElegir, onCerrar }: { x: number; y: number; onElegir: (v: string) => void; onCerrar: () => void }) {
  const [q, setQ] = useState('');
  const [activo, setActivo] = useState(0);
  const elegido = useRef(false);
  const elegir = (v: string) => { elegido.current = true; onElegir(v); };
  const opciones = useMemo(() => {
    const n = normalizar;
    const base = [
      { v: '__completar', t: 'Campo a completar…', g: 'Lo escribe quien redacta' },
      ...GRUPOS_CAMPOS.flatMap((g) => g.campos.map((c) => ({ v: c.tk, t: c.label, g: g.g }))),
      { v: '__literal', t: 'Escribir el corchete «[» como texto', g: '' },
    ];
    return q ? base.filter((o) => n(`${o.t} ${o.g} ${o.v}`).includes(n(q))) : base;
  }, [q]);
  const lista = useRef<HTMLUListElement>(null);
  useEffect(() => { lista.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [activo]);
  const top = Math.min(y, window.innerHeight - 340);
  const left = Math.min(x, window.innerWidth - 340);
  return (
    <div className="pl-ac" style={{ top, left }} role="dialog" aria-label="Insertar campo">
      <input
        autoFocus className="form-control form-control-sm" placeholder="Buscar campo…" value={q}
        role="combobox" aria-expanded="true" aria-controls="pl-ac-lista" aria-activedescendant={opciones[activo] ? `pl-ac-${activo}` : undefined}
        onChange={(e) => { setQ(e.target.value); setActivo(0); }}
        onBlur={() => setTimeout(() => { if (!elegido.current) onCerrar(); }, 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((a) => Math.min(a + 1, opciones.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); if (opciones[activo]) elegir(opciones[activo].v); }
          else if (e.key === 'Escape') { e.preventDefault(); elegido.current = true; onCerrar(); }
        }}
      />
      <ul id="pl-ac-lista" role="listbox" ref={lista}>
        {opciones.map((o, i) => (
          <li key={o.v} id={`pl-ac-${i}`} role="option" aria-selected={i === activo} className={i === activo ? 'activo' : ''} onMouseDown={(e) => { e.preventDefault(); elegir(o.v); }} onMouseEnter={() => setActivo(i)}>
            <span>{o.t}</span>{o.g ? <small>{o.g}</small> : null}
          </li>
        ))}
        {!opciones.length ? <li className="texto-ayuda px-2">Sin coincidencias</li> : null}
      </ul>
    </div>
  );
}

'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from 'react';
import { http } from '@/lib/api-client';
import { exportarApremios } from '@/lib/apremios-client';
import { useNotify } from './NotifyProvider';

type R = Record<string, any>;
type Destino = 'apremios' | 'juzgado' | 'pdf';
type Pieza = { id: string; t: string; incluir: boolean };

const DESTINOS: { v: Destino; t: string; d: string }[] = [
  { v: 'apremios', t: 'Exportar para Apremios', d: 'Remito, carátula de deuda y legajo. Requiere la nota de Apremios firmada.' },
  { v: 'juzgado', t: 'Exportar para Juzgado de Paz', d: 'Carátula de remisión y legajo. Requiere el escrito «Juzgado de Paz» firmado.' },
  { v: 'pdf', t: 'Solo PDF', d: 'El legajo con las piezas que elija, sin carátula ni cambio de estado.' },
];

const firmado = (x: R) => ['firmado', 'definitivo'].includes(x.estado);

/** Orden sugerido (reunión 27/10): acta, informe de dominio, cédula notificada, fallo, resoluciones y notas. */
function rango(x: R): number {
  const t = String(x.titulo ?? '').toLowerCase();
  const cat = x.plantilla?.categoria ?? '';
  if (x.tipo === 'adjunto' && t.includes('dominio')) return 1;
  if (cat === 'Notificación') return 2;
  if (cat === 'Fallo') return 3;
  if (cat === 'Resolución' || cat === 'Disposición') return 4;
  if (x.tipo === 'adjunto') return 5;
  if (cat === 'Nota externa' || cat === 'Nota interna') return 6;
  return 7;
}

/**
 * Menú «Exportar» de la causa (reunión 27/10): un solo botón con Apremios, Juzgado de Paz y Solo PDF. Apremios y Juzgado
 * exigen su escrito firmado. Las piezas se eligen y se ordenan antes de generar el PDF.
 */
export function ExportarLegajo({ d, uuid, onCerrar, onHecho }: { d: R; uuid: string; onCerrar: () => void; onHecho: () => void }) {
  const notify = useNotify();
  const [destino, setDestino] = useState<Destino>(d.acta?.estadoFaltas === 'Nota apremios' ? 'apremios' : 'pdf');
  const [derivar, setDerivar] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const inicial = useMemo<Pieza[]>(() => {
    const docs = (d.documentos as R[]).filter((x) => x.tipo === 'adjunto' || firmado(x));
    const ordenados = [...docs].sort((a, b) => rango(a) - rango(b) || Number(a.date_created) - Number(b.date_created));
    return [
      { id: 'acta', t: 'Acta labrada', incluir: true },
      ...ordenados.map((x) => ({ id: `doc:${x.uuid}`, t: `${x.tipo === 'adjunto' ? 'Adjunto' : 'Escrito'}: ${x.titulo}${x.numero ? ` N.° ${x.numero}` : ''}`, incluir: true })),
      { id: 'historial', t: 'Historial de la causa', incluir: destino !== 'apremios' },
    ];
  }, [d.documentos, destino]);
  const [piezas, setPiezas] = useState<Pieza[]>(inicial);

  const escritoRequerido = destino === 'apremios'
    ? (d.documentos as R[]).find((x) => String(x.plantilla?.codigo ?? '').startsWith('NOTA_APREMIOS') && firmado(x))
    : destino === 'juzgado' ? (d.documentos as R[]).find((x) => x.plantilla?.codigo === 'JUZGADO_DE_PAZ' && firmado(x)) : true;
  const falta = destino === 'apremios' ? 'la nota de Apremios firmada (botón «Nota de Apremios» o un escrito «NOTA APREMIOS…»)' : 'el escrito «Juzgado de Paz» firmado (Generar escrito → JUZGADO DE PAZ)';

  const mover = (i: number, delta: number) => setPiezas((p) => {
    const n = [...p];
    const j = i + delta;
    if (j < 0 || j >= n.length) return p;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  async function generar() {
    const ids = piezas.filter((p) => p.incluir).map((p) => p.id);
    if (!ids.length) { notify.error('Sin piezas', 'Elija al menos una pieza.'); return; }
    setEnviando(true);
    try {
      if (destino === 'apremios') {
        await exportarApremios([uuid], derivar && d.acta?.estadoFaltas !== 'En Apremios', { [uuid]: ids });
      } else {
        const url = `/imprimir/legajo/${uuid}?piezas=${encodeURIComponent(ids.join(','))}${destino === 'juzgado' ? '&destino=juzgado' : ''}`;
        window.open(url, '_blank');
        await http.post('/api/causa/accion', { uuid, accion: 'registrar_exportacion', datos: { destino, piezas: ids.length } });
      }
      notify.success('PDF generado', 'Guárdelo desde el diálogo de impresión.');
      onHecho();
    } catch (e) {
      notify.error('No se pudo exportar', (e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal-fake modal-fake-xl" role="dialog" aria-modal="true" aria-label="Exportar">
        <div className="modal-fake-header">
          <i className="fa-solid fa-file-export" aria-hidden="true" />
          <h2>Exportar</h2>
          <button type="button" aria-label="Cerrar" onClick={onCerrar}>&times;</button>
        </div>
        <div className="modal-fake-body">
          <div className="opciones-grandes mb-3" role="radiogroup" aria-label="Destino">
            {DESTINOS.map((x) => (
              <label key={x.v} className={`opcion-grande ${destino === x.v ? 'activa' : ''}`}>
                <input type="radio" name="destino-export" checked={destino === x.v} onChange={() => { setDestino(x.v); setPiezas((p) => p.map((pz) => (pz.id === 'historial' ? { ...pz, incluir: x.v !== 'apremios' } : pz))); }} />
                <span><strong>{x.t}</strong><br /><small>{x.d}</small></span>
              </label>
            ))}
          </div>
          {!escritoRequerido ? <div className="aviso aviso-alerta">Para exportar falta {falta}.</div> : null}
          {destino === 'apremios' && d.acta?.estadoFaltas !== 'En Apremios' ? (
            <label className="form-check mb-2"><input type="checkbox" className="form-check-input" checked={derivar} onChange={(e) => setDerivar(e.target.checked)} /> <span className="form-check-label">Pasar la causa a «En Apremios»</span></label>
          ) : null}
          <h3 className="subtitulo-paso">Piezas y orden</h3>
          <ol className="lista-piezas">
            {piezas.map((p, i) => (
              <li key={p.id} className={p.incluir ? '' : 'excluida'}>
                <label className="d-flex align-items-center gap-2 flex-grow-1 mb-0">
                  <input type="checkbox" className="form-check-input" checked={p.incluir} onChange={(e) => setPiezas((ps) => ps.map((x) => (x.id === p.id ? { ...x, incluir: e.target.checked } : x)))} />
                  <span>{p.t}</span>
                </label>
                <span className="d-flex gap-1">
                  <button type="button" className="btn btn-sm btn-outline-secondary" aria-label={`Subir ${p.t}`} disabled={i === 0} onClick={() => mover(i, -1)}><i className="fa-solid fa-arrow-up" aria-hidden="true" /></button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" aria-label={`Bajar ${p.t}`} disabled={i === piezas.length - 1} onClick={() => mover(i, 1)}><i className="fa-solid fa-arrow-down" aria-hidden="true" /></button>
                </span>
              </li>
            ))}
          </ol>
          <p className="texto-ayuda mb-0">Los escritos en borrador no se incluyen. Los memos internos nunca se exportan.</p>
        </div>
        <div className="modal-fake-footer">
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="button" className="btn btn-primary" disabled={enviando || !escritoRequerido} onClick={() => void generar()}>{enviando ? 'Generando…' : 'Generar PDF'}</button>
        </div>
      </div>
    </div>
  );
}

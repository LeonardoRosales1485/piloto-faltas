'use client';

import { useEffect, useState } from 'react';
import { guardarAjustesImpresora, imprimirPrueba, infoImpresora, leerAjustesImpresora, type AjustesImpresora } from '@/lib/print';

type Info = {
  equipo?: { fabricante?: string; marca?: string; modelo?: string; android?: string; senraise?: boolean; sunmi?: boolean };
  vinculados?: { nombre: string; mac: string }[];
  errorBluetooth?: string | null;
  via?: string;
  impresoraBluetooth?: { nombre: string; mac: string } | null;
  error?: string;
};

const VIA: Record<string, string> = { senraise: 'Impresora Senraise (SDK)', bluetooth: 'Impresora interna por Bluetooth (ESC/POS)', ninguna: 'No se encontró impresora' };

/**
 * Prueba de impresora del POS (oculta: se abre manteniendo apretada la versión al pie del login).
 * Muestra el equipo, los Bluetooth vinculados y la vía que usaría; permite forzar la vía, elegir el dispositivo,
 * el ancho del papel y ajustes de la impresora ESC/POS, e imprimir un ticket de prueba. Los ajustes quedan en este equipo.
 */
export function PruebaImpresora({ onCerrar }: { onCerrar: () => void }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [a, setA] = useState<AjustesImpresora>(() => leerAjustesImpresora());
  const [estado, setEstado] = useState<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    infoImpresora().then((i) => setInfo((i ?? { error: 'Esta pantalla funciona solo en la app del POS.' }) as Info)).catch((e: Error) => setInfo({ error: e.message }));
  }, []);

  const cambiar = (p: Partial<AjustesImpresora>) => setA((x) => ({ ...x, ...p }));

  async function probar() {
    setTrabajando(true);
    setEstado({ tipo: 'info', texto: 'Imprimiendo…' });
    try {
      const via = await imprimirPrueba(a);
      setEstado({ tipo: 'ok', texto: `Enviado a la impresora (${VIA[via] ?? via}). Si salió bien, toque «Guardar».` });
    } catch (e) {
      setEstado({ tipo: 'error', texto: (e as Error).message });
    } finally {
      setTrabajando(false);
    }
  }

  const eq = info?.equipo;
  return (
    <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal-fake" role="dialog" aria-modal="true" aria-label="Prueba de impresora">
        <div className="modal-fake-header">
          <h2>Prueba de impresora</h2>
          <button type="button" aria-label="Cerrar" onClick={onCerrar}>&times;</button>
        </div>
        <div className="modal-fake-body">
          {!info ? <p>Consultando el equipo…</p> : info.error ? <div className="aviso aviso-alerta">{info.error}</div> : (
            <>
              <dl className="ficha mb-3">
                <div><dt>Equipo</dt><dd>{[eq?.fabricante, eq?.marca, eq?.modelo].filter(Boolean).join(' · ') || '-'} · Android {eq?.android || '-'}</dd></div>
                <div><dt>Servicios</dt><dd>Senraise: {eq?.senraise ? 'sí' : 'no'} · Sunmi: {eq?.sunmi ? 'sí' : 'no'}</dd></div>
                <div><dt>Vía automática</dt><dd><strong>{VIA[info.via ?? ''] ?? info.via}</strong>{info.impresoraBluetooth ? ` · ${info.impresoraBluetooth.nombre} (${info.impresoraBluetooth.mac})` : ''}</dd></div>
                <div><dt>Bluetooth vinculados</dt><dd>{info.errorBluetooth ? `Error: ${info.errorBluetooth}` : (info.vinculados ?? []).length ? (info.vinculados ?? []).map((d) => `${d.nombre || 'sin nombre'} (${d.mac})`).join(' · ') : 'ninguno'}</dd></div>
              </dl>
              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label-v2" htmlFor="pi-via">Vía</label>
                  <select id="pi-via" className="form-select" value={a.impresora ?? 'auto'} onChange={(e) => cambiar({ impresora: e.target.value as AjustesImpresora['impresora'] })}>
                    <option value="auto">Automática</option>
                    <option value="senraise">Senraise (SDK)</option>
                    <option value="bluetooth">Bluetooth (ESC/POS)</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label-v2" htmlFor="pi-col">Papel</label>
                  <select id="pi-col" className="form-select" value={a.columnas ?? 32} onChange={(e) => cambiar({ columnas: Number(e.target.value) })}>
                    <option value={32}>58 mm</option>
                    <option value={48}>80 mm</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label-v2" htmlFor="pi-mac">Dispositivo Bluetooth</label>
                  <select id="pi-mac" className="form-select" value={a.mac ?? ''} onChange={(e) => cambiar({ mac: e.target.value || undefined })}>
                    <option value="">Automático{info.impresoraBluetooth ? ` (${info.impresoraBluetooth.nombre})` : ''}</option>
                    {(info.vinculados ?? []).map((d) => <option key={d.mac} value={d.mac}>{d.nombre || 'sin nombre'} ({d.mac})</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label-v2" htmlFor="pi-qr">Tamaño del QR (1–16)</label>
                  <input id="pi-qr" type="number" min={1} max={16} className="form-control" value={a.qrTam ?? 6} onChange={(e) => cambiar({ qrTam: Number(e.target.value) || 6 })} />
                </div>
                <div className="col-6 d-flex flex-column justify-content-end gap-1">
                  <label className="d-flex gap-2 align-items-center"><input type="checkbox" className="form-check-input" checked={Boolean(a.sinAcentos)} onChange={(e) => cambiar({ sinAcentos: e.target.checked })} /> Sin tildes ni ñ</label>
                  <label className="d-flex gap-2 align-items-center"><input type="checkbox" className="form-check-input" checked={Boolean(a.sinLogo)} onChange={(e) => cambiar({ sinLogo: e.target.checked })} /> Sin logo</label>
                </div>
              </div>
              <p className="texto-ayuda mt-2 mb-0">Papel, QR, tildes y logo aplican a la vía Bluetooth. Si el Bluetooth está apagado o la impresora interna no figura como vinculada, actívela en los ajustes de Android.</p>
            </>
          )}
          {estado ? <div className={`aviso mt-3 mb-0 ${estado.tipo === 'error' ? 'aviso-alerta' : estado.tipo === 'ok' ? 'aviso-ok' : 'aviso-info'}`} role="status">{estado.texto}</div> : null}
        </div>
        <div className="modal-fake-footer">
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cerrar</button>
          <button type="button" className="btn btn-outline-primary" disabled={!info || Boolean(info.error) || trabajando} onClick={() => void probar()}>Imprimir prueba</button>
          <button type="button" className="btn btn-primary" onClick={() => { guardarAjustesImpresora(a); setEstado({ tipo: 'ok', texto: 'Ajustes guardados en este equipo.' }); }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

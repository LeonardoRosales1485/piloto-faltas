'use client';

import Link from 'next/link';
import { useState } from 'react';
import { portal } from '@/lib/portal-client';

type Fila = { uuid: string; numero: string; fecha: string; tipo: string; estado: string; dominio: string | null };

/**
 * Consulta sin cuenta por dominio o por documento (minuta 20/10, esquema CABA): muestra si hay actas, sin datos
 * personales; para verlas, pagar o presentar algo, se ingresa al portal y se vuelve a esa acta.
 */
export function ConsultaPublica() {
  const [por, setPor] = useState<'dominio' | 'documento'>('dominio');
  const [valor, setValor] = useState('');
  const [items, setItems] = useState<Fila[] | null>(null);
  const [error, setError] = useState('');
  const [buscando, setBuscando] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBuscando(true);
    try {
      setItems(await portal.get<Fila[]>(`/api/portal/consulta?${por}=${encodeURIComponent(valor)}`));
    } catch (er) {
      setItems(null);
      setError((er as Error).message);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="portal-card" style={{ maxWidth: 460, margin: '1rem auto 0' }}>
      <h2>Consultar sin cuenta</h2>
      <p className="texto-ayuda">Por dominio del vehículo (aunque no haya manejado usted) o por número de documento.</p>
      <form onSubmit={buscar}>
        <div className="opciones-grandes mb-2" role="radiogroup" aria-label="Consultar por">
          {([{ v: 'dominio', t: 'Dominio' }, { v: 'documento', t: 'Documento / CUIT' }] as const).map((o) => (
            <label key={o.v} className={`opcion-grande ${por === o.v ? 'activa' : ''}`}><input type="radio" name="cp-por" checked={por === o.v} onChange={() => { setPor(o.v); setItems(null); setValor(''); }} />{o.t}</label>
          ))}
        </div>
        <label htmlFor="cp-valor" className="visually-hidden">{por === 'dominio' ? 'Dominio' : 'Documento o CUIT'}</label>
        <div className="d-flex gap-2">
          <input id="cp-valor" className="form-control form-control-lg" value={valor} required
            placeholder={por === 'dominio' ? 'Ej.: AB123CD' : 'Ej.: 30111222'} inputMode={por === 'dominio' ? 'text' : 'numeric'}
            onChange={(e) => setValor(por === 'dominio' ? e.target.value.toUpperCase() : e.target.value)} />
          <button type="submit" className="btn btn-outline-primary btn-lg" disabled={buscando}>Consultar</button>
        </div>
      </form>
      {error ? <div className="aviso aviso-peligro mt-2" role="alert">{error}</div> : null}
      {items ? (
        items.length ? (
          <ul className="lista-items mt-2" aria-live="polite">
            {items.map((c) => (
              <li key={c.uuid} className="d-block">
                <strong>{c.numero}</strong> · {c.tipo} · {c.fecha}{c.dominio ? ` · ${c.dominio}` : ''}
                <div className="texto-ayuda">{c.estado} · <Link href={`/portal?volver=${encodeURIComponent(`/portal/causa/${c.uuid}`)}`}>Ingresar para verla o pagar</Link></div>
              </li>
            ))}
          </ul>
        ) : <div className="aviso aviso-ok mt-2" role="status">No hay actas para ese {por === 'dominio' ? 'dominio' : 'documento'}.</div>
      ) : null}
    </div>
  );
}

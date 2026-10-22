'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { InputClave } from './InputClave';
import { LoaderLogo } from './LoaderLogo';
import { useCarga } from '@/lib/use-carga';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { fechaCorta } from '@/lib/dominio';
import { guardarPerfil, guardarSesion, nombrePerfil, portal, portalPerfil, type Perfil } from '@/lib/portal-client';

type R = Record<string, any>;

function Login({ volver }: { volver: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [verificar, setVerificar] = useState(false);
  const [codigo, setCodigo] = useState('');

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const r = await portal.post<{ token: string; perfil: Perfil }>('/api/portal/login', { email, password });
      guardarSesion(r.token, r.perfil);
      window.location.href = volver || '/portal';
    } catch (er) {
      const m = (er as Error).message;
      if (m.includes('Valide')) setVerificar(true);
      setError(m);
    }
  }

  async function validar() {
    try {
      const r = await portal.post<{ token: string; perfil: Perfil }>('/api/portal/verificar', { email, codigo });
      guardarSesion(r.token, r.perfil);
      window.location.href = volver || '/portal';
    } catch (er) { setError((er as Error).message); }
  }

  return (
    <div className="portal-card" style={{ maxWidth: 460, margin: '0 auto' }}>
      <h1>Ingresar</h1>
      <p className="texto-ayuda">Para consultar y gestionar sus actas necesita una cuenta. Si llegó escaneando el QR del ticket, ingrese y lo llevamos a su acta.</p>
      <form onSubmit={entrar}>
        <div className="form-group mb-2"><label htmlFor="p-email">Correo electrónico</label><input id="p-email" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" aria-invalid={error && !verificar ? true : undefined} /></div>
        <div className="form-group mb-3"><label htmlFor="p-pass">Contraseña</label><InputClave id="p-pass" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" aria-invalid={error && !verificar ? true : undefined} /></div>
        {error ? <div className="aviso aviso-peligro" role="alert">{error}</div> : null}
        <button type="submit" className="btn btn-primary btn-lg w-100">Ingresar</button>
      </form>
      {verificar ? (
        <div className="mt-3">
          <label htmlFor="p-cod">Código de verificación</label>
          <div className="d-flex gap-2"><input id="p-cod" className="form-control" value={codigo} onChange={(e) => setCodigo(e.target.value)} inputMode="numeric" /><button type="button" className="btn btn-success" onClick={() => void validar()}>Validar</button></div>
        </div>
      ) : null}
      <div className="d-flex justify-content-between mt-3 flex-wrap gap-2">
        <Link href={`/portal/registro${volver ? `?volver=${encodeURIComponent(volver)}` : ''}`} onClick={() => router.prefetch('/portal/registro')}>Crear una cuenta</Link>
        <Link href="/portal/recuperar">Olvidé mi contraseña</Link>
      </div>
    </div>
  );
}

function Causas({ perfil }: { perfil: Perfil }) {
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const [items, setItems] = useState<R[] | null>(null);
  const [cargando, seguir] = useCarga();
  const [error, setError] = useState('');
  const buscar = useCallback((texto: string) => {
    setError('');
    void seguir(portal.get<R[]>(`/api/portal/buscar?q=${encodeURIComponent(texto)}&tipo=${tipo}`).then(setItems).catch((e: Error) => setError(e.message)));
  }, [tipo, seguir]);
  useEffect(() => buscar(''), [buscar]);

  return (
    <>
      {!perfil.domicilioElectronico ? (
        <div className="aviso aviso-info">
          <i className="fa-solid fa-envelope-circle-check" aria-hidden="true" /> Puede recibir las notificaciones por correo constituyendo domicilio electrónico. <Link href="/portal/perfil">Constituir domicilio electrónico</Link>
        </div>
      ) : null}
      <div className="portal-card">
        <h1>Hola, {nombrePerfil(perfil)}</h1>
        <form className="row g-2 align-items-end" onSubmit={(e) => { e.preventDefault(); buscar(q); }}>
          <div className="col-12 col-md-6"><label htmlFor="p-q">Buscar por número de acta, dominio o documento</label><input id="p-q" className="form-control form-control-lg" value={q} onChange={(e) => setQ(e.target.value)} placeholder="T-001014 · AB123CD · 28999111" /></div>
          <div className="col-7 col-md-3"><label htmlFor="p-t">Tipo</label><select id="p-t" className="form-select form-select-lg" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="">Tránsito y contravención</option><option value="transito">Tránsito</option><option value="contravencion">Contravención</option></select></div>
          <div className="col-5 col-md-3"><button type="submit" className="btn btn-primary btn-lg w-100">Buscar</button></div>
        </form>
      </div>
      {error ? <div className="aviso aviso-peligro" role="alert">{error}</div> : null}
      <div className="portal-card">
        <h2>{q ? 'Resultados' : 'Mis actas'}</h2>
        <ul className="lista-items">
          {cargando ? <li className="d-block"><LoaderLogo tam={56} texto="Buscando actas…" /></li> : null}
          {!cargando && (items ?? []).map((c) => (
            <li key={c.uuid}>
              <div>
                <div className="li-titulo">Acta {c.legajo_numero_acta} {c.medida_vigente ? <span className="medida-chip ms-1">Medida vigente</span> : null}</div>
                <div className="li-sub">{fechaCorta(String(c.legajo_fecha ?? '').replace('T', ' '))} · {[c.domicilio_infraccion_calle, c.domicilio_infraccion_numero].filter(Boolean).join(' ')}{c.vehiculo_numero_dominio ? ` · ${c.vehiculo_numero_dominio}` : ''}</div>
                <div className="li-sub">Estado: <strong>{c.estadoVisible}</strong>{!c.notificada_at ? ' · Todavía no la abrió' : ''}</div>
              </div>
              <Link className="btn btn-primary" href={`/portal/causa/${c.uuid}`}>Ver</Link>
            </li>
          ))}
          {!cargando && items && !items.length ? <li><span className="texto-ayuda">{q ? 'No encontramos actas con ese dato.' : 'No hay actas a su nombre. Puede buscar por número de acta o dominio.'}</span></li> : null}
        </ul>
      </div>
    </>
  );
}

export function PortalInicio() {
  const sp = useSearchParams();
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined);
  useEffect(() => {
    const local = portalPerfil();
    setPerfil(local);
    // El perfil guardado al iniciar sesión puede estar desactualizado (p. ej. la DD.JJ. se constituyó después o en otro
    // dispositivo): se toma el del servidor, así lo ya declarado no se vuelve a ofrecer.
    if (local) portal.get<Perfil>('/api/portal/yo').then((p) => { guardarPerfil(p); setPerfil(p); }).catch(() => undefined);
  }, []);
  if (perfil === undefined) return null;
  return perfil ? <Causas perfil={perfil} /> : <Login volver={sp.get('volver')} />;
}

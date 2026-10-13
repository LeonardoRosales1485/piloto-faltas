'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { InputClave } from './InputClave';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fechaHora } from '@/lib/dominio';
import { guardarPerfil, guardarSesion, portal, portalPerfil, type Perfil } from '@/lib/portal-client';

/** Registro con los datos del Anexo III y validación del correo por código (PI-03, PI-04). */
export function PortalRegistro() {
  const sp = useSearchParams();
  const volver = sp.get('volver');
  const [f, setF] = useState<Record<string, string>>({ tipoPersona: 'fisica', documentoTipo: 'DNI', tipoSocietario: 'S.A.' });
  const [paso, setPaso] = useState<'datos' | 'codigo'>('datos');
  const [codigoPiloto, setCodigoPiloto] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const juridica = f.tipoPersona === 'juridica';
  const campo = (k: string, t: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, col = 'col-12 col-md-6') => (
    <div className={col}><label htmlFor={`r-${k}`}>{t}</label>{props.type === 'password' ? <InputClave id={`r-${k}`} value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)} required={props.required} autoComplete={props.autoComplete} minLength={props.minLength} /> : <input id={`r-${k}`} className="form-control" value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)} {...props} />}</div>
  );

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (f.password !== f.password2) return setError('Las contraseñas no coinciden');
    try {
      const r = await portal.post<{ codigoPiloto: string }>('/api/portal/registro', f);
      setCodigoPiloto(r.codigoPiloto);
      setPaso('codigo');
    } catch (er) { setError((er as Error).message); }
  }

  async function validar() {
    setError('');
    try {
      const r = await portal.post<{ token: string; perfil: Perfil }>('/api/portal/verificar', { email: f.email, codigo });
      guardarSesion(r.token, r.perfil);
      window.location.href = volver || '/portal/perfil?nuevo=1';
    } catch (er) { setError((er as Error).message); }
  }

  if (paso === 'codigo') {
    return (
      <div className="portal-card" style={{ maxWidth: 480, margin: '0 auto' }}>
        <h1>Valide su correo</h1>
        <p>Le enviamos un código de 6 dígitos a <strong>{f.email}</strong>.</p>
        <div className="codigo-piloto mb-3">Piloto: el correo es simulado. Su código es <strong>{codigoPiloto}</strong>.</div>
        <label htmlFor="r-cod">Código</label>
        <input id="r-cod" className="form-control form-control-lg mb-2" inputMode="numeric" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        {error ? <div className="aviso aviso-peligro">{error}</div> : null}
        <button type="button" className="btn btn-primary btn-lg w-100" onClick={() => void validar()}>Validar y entrar</button>
      </div>
    );
  }

  return (
    <form className="portal-card" onSubmit={registrar}>
      <h1>Crear cuenta</h1>
      <fieldset className="mb-3">
        <legend className="fs-6 fw-semibold">Usted se registra como</legend>
        <div className="opciones-grandes">
          {[{ v: 'fisica', t: 'Persona física' }, { v: 'juridica', t: 'Persona jurídica (empresa)' }].map((o) => (
            <label key={o.v} className={`opcion-grande ${f.tipoPersona === o.v ? 'activa' : ''}`}><input type="radio" name="tp" checked={f.tipoPersona === o.v} onChange={() => set('tipoPersona', o.v)} />{o.t}</label>
          ))}
        </div>
      </fieldset>
      <div className="row g-3">
        {juridica ? (
          <>
            <div className="col-12 col-md-4"><label htmlFor="r-ts">Tipo societario</label><select id="r-ts" className="form-select" value={f.tipoSocietario} onChange={(e) => set('tipoSocietario', e.target.value)}>{['S.A.', 'S.R.L.', 'S.A.S.', 'Cooperativa', 'Otra'].map((x) => <option key={x}>{x}</option>)}</select></div>
            {campo('cuit', 'CUIT', { required: true, inputMode: 'numeric', placeholder: '30-12345678-9' }, 'col-12 col-md-4')}
            {campo('razonSocial', 'Razón social', { required: true }, 'col-12 col-md-4')}
          </>
        ) : (
          <>
            {campo('nombre', 'Nombre', { required: true, autoComplete: 'given-name' })}
            {campo('apellido', 'Apellido', { required: true, autoComplete: 'family-name' })}
            <div className="col-5 col-md-3"><label htmlFor="r-dt">Tipo de documento</label><select id="r-dt" className="form-select" value={f.documentoTipo} onChange={(e) => set('documentoTipo', e.target.value)}>{['DNI', 'LC', 'LE', 'Pasaporte'].map((x) => <option key={x}>{x}</option>)}</select></div>
            {campo('documentoNumero', 'Número de documento', { required: true, inputMode: 'numeric' }, 'col-7 col-md-3')}
          </>
        )}
        {campo('telefono', 'Teléfono', { inputMode: 'tel', autoComplete: 'tel' }, 'col-12 col-md-6')}
        {campo('domicilio', 'Domicilio', { autoComplete: 'street-address' })}
        {campo('localidad', 'Localidad')}
        {campo('email', 'Correo electrónico', { required: true, type: 'email', autoComplete: 'email' })}
        {campo('password', 'Contraseña (mínimo 8 caracteres)', { required: true, type: 'password', autoComplete: 'new-password', minLength: 8 })}
        {campo('password2', 'Repetir contraseña', { required: true, type: 'password', autoComplete: 'new-password' })}
      </div>
      {error ? <div className="aviso aviso-peligro mt-3">{error}</div> : null}
      <div className="d-flex gap-2 mt-3 flex-wrap"><button type="submit" className="btn btn-primary btn-lg">Crear cuenta</button><Link className="btn btn-outline-secondary btn-lg" href="/portal">Ya tengo cuenta</Link></div>
    </form>
  );
}

/** Recuperación de contraseña por código (PI-06). */
export function PortalRecuperar() {
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [piloto, setPiloto] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [msg, setMsg] = useState('');
  return (
    <div className="portal-card" style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1>Recuperar contraseña</h1>
      <label htmlFor="rc-e">Correo electrónico</label>
      <input id="rc-e" type="email" className="form-control mb-2" value={email} onChange={(e) => setEmail(e.target.value)} />
      {!enviado ? (
        <button type="button" className="btn btn-primary w-100" onClick={() => portal.post<{ codigoPiloto?: string }>('/api/portal/recuperar', { email }).then((r) => { setEnviado(true); setPiloto(r.codigoPiloto ?? ''); })}>Enviar código</button>
      ) : (
        <>
          {piloto ? <div className="codigo-piloto mb-2">Piloto: su código es <strong>{piloto}</strong>.</div> : null}
          <label htmlFor="rc-c">Código</label><input id="rc-c" className="form-control mb-2" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          <label htmlFor="rc-p">Nueva contraseña</label><div className="mb-2"><InputClave id="rc-p" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <button type="button" className="btn btn-primary w-100" onClick={() => portal.post('/api/portal/restablecer', { email, codigo, password }).then(() => setMsg('Listo. Ya puede ingresar con su nueva contraseña.')).catch((e: Error) => setMsg(e.message))}>Cambiar contraseña</button>
        </>
      )}
      {msg ? <div className="aviso aviso-info mt-2">{msg} <Link href="/portal">Ingresar</Link></div> : null}
    </div>
  );
}

/** Perfil y constitución de domicilio electrónico por DD.JJ. (PI-05). */
export function PortalPerfil() {
  const sp = useSearchParams();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [acepto, setAcepto] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setPerfil(portalPerfil());
    portal.get<Perfil>('/api/portal/yo').then((p) => { setPerfil(p); guardarPerfil(p); }).catch(() => undefined);
    portal.get<{ textos: Record<string, string> }>('/api/portal/textos').then((r) => setTextos(r.textos));
  }, []);
  if (!perfil) return <div className="portal-card"><p>Ingrese al portal para ver su perfil. <Link href="/portal">Ingresar</Link></p></div>;

  async function constituir() {
    try {
      const p = await portal.post<Perfil>('/api/portal/ddjj', { acepto: true });
      setPerfil(p);
      guardarPerfil(p);
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      {sp.get('nuevo') ? <div className="aviso aviso-ok">Cuenta creada. Ya puede buscar sus actas.</div> : null}
      <div className="portal-card">
        <h1>Mis datos</h1>
        <dl className="ficha">
          <div><dt>{perfil.tipoPersona === 'juridica' ? 'Razón social' : 'Nombre'}</dt><dd>{perfil.tipoPersona === 'juridica' ? perfil.razonSocial : `${perfil.nombre} ${perfil.apellido}`}</dd></div>
          <div><dt>{perfil.tipoPersona === 'juridica' ? 'CUIT' : 'Documento'}</dt><dd>{perfil.tipoPersona === 'juridica' ? perfil.cuit : `${perfil.documentoTipo} ${perfil.documentoNumero}`}</dd></div>
          <div><dt>Correo</dt><dd>{perfil.email}</dd></div>
        </dl>
      </div>
      <div className="portal-card">
        <h2>Domicilio electrónico</h2>
        {perfil.domicilioElectronico ? (
          <div className="aviso aviso-ok mb-0"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Constituido el {fechaHora(perfil.ddjjAt ?? undefined)}. Las notificaciones le llegan a {perfil.email} y se tienen por válidas.</div>
        ) : (
          <>
            <p>Si constituye domicilio electrónico, las notificaciones de la Dirección de Faltas le llegarán por correo y se tendrán por válidas, sin necesidad de entrar al portal.</p>
            <div className="aviso aviso-info" style={{ whiteSpace: 'pre-wrap' }}>{textos.ddjj_domicilio}</div>
            <label className="form-check mb-2"><input type="checkbox" className="form-check-input" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} /> Leí y acepto la declaración jurada</label>
            {error ? <div className="aviso aviso-peligro">{error}</div> : null}
            <button type="button" className="btn btn-primary btn-lg" disabled={!acepto} onClick={() => void constituir()}>Constituir domicilio electrónico</button>
          </>
        )}
      </div>
      <Link href="/portal" className="btn btn-outline-secondary">Volver a mis actas</Link>
    </>
  );
}

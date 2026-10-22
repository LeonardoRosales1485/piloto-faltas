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
  // DD.JJ. de domicilio electrónico al validar el correo (primer ingreso): una vez aceptada no se vuelve a pedir.
  const [ddjj, setDdjj] = useState(false);
  const [textoDdjj, setTextoDdjj] = useState('');
  useEffect(() => { portal.get<{ textos: Record<string, string> }>('/api/portal/textos').then((r) => setTextoDdjj(r.textos.ddjj_domicilio ?? '')).catch(() => undefined); }, []);
  // Errores por campo (id del input → mensaje), anunciados con aria-invalid + aria-describedby (A11Y-011).
  const [errores, setErrores] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrores((p) => { if (!p[`r-${k}`]) return p; const n = { ...p }; delete n[`r-${k}`]; return n; });
  };
  const juridica = f.tipoPersona === 'juridica';
  const campo = (k: string, t: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, col = 'col-12 col-md-6') => {
    const id = `r-${k}`;
    const err = errores[id];
    const aria = { 'aria-invalid': err ? true : undefined, 'aria-describedby': err ? `${id}-error` : undefined } as const;
    return (
      <div className={col}><label htmlFor={id}>{t}</label>{props.type === 'password' ? <InputClave id={id} value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)} required={props.required} autoComplete={props.autoComplete} minLength={props.minLength} {...aria} /> : <input id={id} className="form-control" value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)} {...props} {...aria} />}{err ? <div id={`${id}-error`} className="texto-error small mt-1">{err}</div> : null}</div>
    );
  };

  /** Valida en la página (no con el globo del navegador) para que el error quede escrito y asociado al campo. */
  function validarCampos(form: HTMLFormElement) {
    const nuevos: Record<string, string> = {};
    for (const el of Array.from(form.elements)) {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement) || !el.id.startsWith('r-')) continue;
      const v = el.value.trim();
      if (el.required && !v) nuevos[el.id] = 'Complete este campo.';
      else if (el instanceof HTMLInputElement && el.type === 'email' && v && el.validity.typeMismatch) nuevos[el.id] = 'Ingrese un correo electrónico válido.';
      else if (el instanceof HTMLInputElement && el.minLength > 0 && v && el.value.length < el.minLength) nuevos[el.id] = `Debe tener al menos ${el.minLength} caracteres.`;
    }
    if (!nuevos['r-password2'] && f.password && f.password2 && f.password !== f.password2) nuevos['r-password2'] = 'Las contraseñas no coinciden.';
    return nuevos;
  }

  async function registrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = e.currentTarget;
    const nuevos = validarCampos(form);
    setErrores(nuevos);
    const ids = Object.keys(nuevos);
    if (ids.length) {
      const nombres = ids.map((id) => form.querySelector(`label[for="${id}"]`)?.textContent?.trim() ?? id);
      setError(`Revise ${ids.length === 1 ? 'este campo' : `estos ${ids.length} campos`}: ${nombres.join(', ')}.`);
      document.getElementById(ids[0])?.focus();
      return;
    }
    try {
      const r = await portal.post<{ codigoPiloto: string }>('/api/portal/registro', f);
      setCodigoPiloto(r.codigoPiloto);
      setPaso('codigo');
    } catch (er) { setError((er as Error).message); }
  }

  async function validar() {
    setError('');
    try {
      const r = await portal.post<{ token: string; perfil: Perfil }>('/api/portal/verificar', { email: f.email, codigo, ddjj });
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
        <input id="r-cod" className="form-control form-control-lg mb-2" inputMode="numeric" value={codigo} onChange={(e) => setCodigo(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? 'r-cod-error' : undefined} />
        <fieldset className="mb-3">
          <legend className="fs-6 fw-semibold">Domicilio electrónico (opcional)</legend>
          {textoDdjj ? <div className="aviso aviso-info small" style={{ whiteSpace: 'pre-wrap' }}>{textoDdjj}</div> : null}
          <label className="form-check"><input type="checkbox" className="form-check-input" checked={ddjj} onChange={(e) => setDdjj(e.target.checked)} /> Declaro bajo juramento que este correo es mi domicilio electrónico: las notificaciones que reciba en él se tendrán por válidas. No se le volverá a pedir.</label>
        </fieldset>
        {error ? <div id="r-cod-error" className="aviso aviso-peligro" role="alert">{error}</div> : null}
        <button type="button" className="btn btn-primary btn-lg w-100" onClick={() => void validar()}>Validar y entrar</button>
      </div>
    );
  }

  return (
    <form className="portal-card" onSubmit={registrar} noValidate>
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
      {error ? <div className="aviso aviso-peligro mt-3" role="alert">{error}</div> : null}
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
      {msg ? <div className="aviso aviso-info mt-2" role="status">{msg} <Link href="/portal">Ingresar</Link></div> : null}
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
            {error ? <div className="aviso aviso-peligro" role="alert">{error}</div> : null}
            <button type="button" className="btn btn-primary btn-lg" disabled={!acepto} onClick={() => void constituir()}>Constituir domicilio electrónico</button>
          </>
        )}
      </div>
      <Link href="/portal" className="btn btn-outline-secondary">Volver a mis actas</Link>
    </>
  );
}

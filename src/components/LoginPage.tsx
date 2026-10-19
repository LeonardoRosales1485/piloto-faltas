'use client';
import { inicioPara } from '@/lib/role-guard';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { login } from '@/lib/auth-client';

type Acceso = { u: string; p: string; t: string; i: string };

/** Acceso rápido por área: a la izquierda quien dirige el área, a la derecha el agente. */
const AREAS: { area: string; responsable: Acceso; agente: Acceso }[] = [
  {
    area: 'Tránsito',
    responsable: { u: 'directora', p: 'directora123', t: 'Directora de Tránsito', i: 'fa-solid fa-car' },
    agente: { u: 'operador', p: 'operador123', t: 'Agente de Tránsito', i: 'fa-solid fa-user-tie' },
  },
  {
    area: 'Contravenciones',
    responsable: { u: 'responsable_contrav', p: 'responsable123', t: 'Responsable Contravenciones', i: 'fa-solid fa-scale-balanced' },
    agente: { u: 'agente_contrav', p: 'agente123', t: 'Agente de Contravenciones', i: 'fa-solid fa-user-tie' },
  },
  {
    area: 'Sustancias alimenticias',
    responsable: { u: 'responsable_sust', p: 'responsable123', t: 'Responsable Sustancias', i: 'fa-solid fa-utensils' },
    agente: { u: 'agente_sust', p: 'agente123', t: 'Agente de Sustancias', i: 'fa-solid fa-user-tie' },
  },
];

const INSPECTORES: Acceso[] = [
  { u: 'inspector', p: 'inspector123', t: 'Inspector Tránsito', i: 'fa-solid fa-car-side' },
  { u: 'inspector_contrav', p: 'inspector123', t: 'Inspector Contrav.', i: 'fa-solid fa-clipboard-list' },
  { u: 'inspector_sustancias', p: 'inspector123', t: 'Inspector Sustancias', i: 'fa-solid fa-truck' },
];

export function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  // En la app del POS (WebView) el user agent trae «FaltasPOS/<versión>».
  const [versionPos, setVersionPos] = useState('');
  useEffect(() => { setVersionPos(navigator.userAgent.match(/FaltasPOS\/(\d+)/)?.[1] ?? ''); }, []);
  const [aviso, setAviso] = useState('');
  useEffect(() => { if (new URLSearchParams(window.location.search).get('sesion') === 'vencida') setAviso('Su sesión venció o se cerró. Vuelva a ingresar.'); }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const year = new Date().getFullYear();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await entrar(username, password);
  }

  async function entrar(us: string, pw: string) {
    setError('');
    setLoading(true);
    setUsername(us);
    setPassword(pw);
    try {
      const u = await login(us, pw);
      router.push(inicioPara(u.rol, u.sector, u.modulosActa));
    } catch {
      setError('Usuario o contraseña incorrectos.');
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card login-card-doble">
        <div className="login-col-form">
        <header className="login-brand">
          <div className="login-bo">
            <i className="fa-solid fa-building-columns" aria-hidden="true" />
          </div>
          <h1>
            <strong>BLUE OPENDATA</strong>
            <span>SISTEMA DE FALTAS</span>
          </h1>
        </header>
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <div className="input-icono">
              <i className="fa-solid fa-user" aria-hidden="true" />
              <input
                id="username"
                name="username"
                className="form-control"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                aria-invalid={error ? true : undefined}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="input-icono">
              <i className="fa-solid fa-lock" aria-hidden="true" />
              <input
                id="password"
                name="password"
                type={verPass ? 'text' : 'password'}
                className="form-control input-con-ojo"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                aria-invalid={error ? true : undefined}
              />
              <button type="button" className="btn-ojo" onClick={() => setVerPass((v) => !v)} aria-label={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={verPass}>
                <i className={`fa-solid ${verPass ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Ingresando...
              </>
            ) : (
              <>
                <i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Ingresar
              </>
            )}
          </button>
        </form>
        {aviso && !error ? <p className="err mt-2" role="status">{aviso}</p> : null}
        {error ? <p className="err mt-2" role="alert">{error}</p> : null}
        <div className="login-footer">
          <span>Municipalidad de Malvinas Argentinas</span>
          <span>© {year} Blue Open Data</span>
          <span>V:1.0.0</span>
          {versionPos ? <span>App POS v{versionPos}</span> : null}
        </div>
        </div>
        <section className="login-rapido" aria-label="Acceso rápido">
          <p className="login-rapido-titulo">Acceso rápido (piloto)</p>
          {AREAS.map((a) => (
            <div key={a.area} className="login-rapido-area">
              <p className="login-rapido-subtitulo">{a.area}</p>
              <div className="login-rapido-grid">
                {[a.responsable, a.agente].map((x) => (
                  <button key={x.u} type="button" className="login-rapido-btn" disabled={loading} onClick={() => void entrar(x.u, x.p)} title={`${x.u} / ${x.p}`}>
                    <i className={x.i} aria-hidden="true" />
                    <span>{x.t}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="login-rapido-area">
            <p className="login-rapido-subtitulo">Inspectores y portal ciudadano</p>
            <div className="login-rapido-grid">
              {INSPECTORES.map((x) => (
                <button key={x.u} type="button" className="login-rapido-btn" disabled={loading} onClick={() => void entrar(x.u, x.p)} title={`${x.u} / ${x.p}`}>
                  <i className={x.i} aria-hidden="true" />
                  <span>{x.t}</span>
                </button>
              ))}
              <a className="login-rapido-btn" href="/portal" title="valeria@example.com / ciudadano123">
                <i className="fa-solid fa-users" aria-hidden="true" />
                <span>Portal ciudadano</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

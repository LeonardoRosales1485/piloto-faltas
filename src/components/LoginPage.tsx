'use client';
import { inicioPara } from '@/lib/role-guard';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login } from '@/lib/auth-client';

const ACCESOS = [
  { u: 'inspector', p: 'inspector123', t: 'Inspector', i: 'fa-solid fa-clipboard-list' },
  { u: 'operador', p: 'operador123', t: 'Agente', i: 'fa-solid fa-user-tie' },
  { u: 'directora', p: 'directora123', t: 'Directora (tránsito)', i: 'fa-solid fa-car' },
  { u: 'abogada', p: 'abogada123', t: 'Abogada (contrav.)', i: 'fa-solid fa-scale-balanced' },
  { u: 'tributario', p: 'tributario123', t: 'Tributario', i: 'fa-solid fa-coins' },
  { u: 'becario', p: 'becario123', t: 'Becario', i: 'fa-solid fa-user-graduate' },
  { u: 'admin', p: 'admin123', t: 'Administrador', i: 'fa-solid fa-gear' },
];

export function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      router.push(inicioPara(u.rol));
    } catch {
      setError('Usuario o contraseña incorrectos.');
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-bo">
            <i className="fa-solid fa-building-columns" aria-hidden="true" />
          </div>
          <h1>
            <strong>BLUE OPENDATA</strong>
            <span>SISTEMA DE FALTAS</span>
          </h1>
        </div>
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
                required
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
                type="password"
                className="form-control"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" /> Ingresando...
              </>
            ) : (
              <>
                <i className="fa-solid fa-right-to-bracket" /> Ingresar
              </>
            )}
          </button>
        </form>
        {error ? <p className="err mt-2">{error}</p> : null}
        <div className="login-rapido">
          <p className="login-rapido-titulo">Acceso rápido (piloto)</p>
          <div className="login-rapido-grid">
            {ACCESOS.map((x) => (
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
        <div className="login-footer">
          <span>Municipalidad de Malvinas Argentinas</span>
          <span>© {year} Blue Open Data</span>
          <span>V:1.0.0</span>
        </div>
      </div>
    </div>
  );
}

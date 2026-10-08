'use client';
import { inicioPara } from '@/lib/role-guard';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login } from '@/lib/auth-client';

export function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const year = new Date().getFullYear();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const u = await login(username, password);
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
        <div className="login-cred">
          <p>
            Credenciales de prueba: <strong>inspector/inspector123</strong> (labrado) · <strong>operador/operador123</strong> (agente) ·{' '}
            <strong>directora/directora123</strong> · <strong>tributario/tributario123</strong> · <strong>becario/becario123</strong> · <strong>admin/admin123</strong>.
            Portal de infractores: <a href="/portal">/portal</a> (valeria@example.com / ciudadano123)
          </p>
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

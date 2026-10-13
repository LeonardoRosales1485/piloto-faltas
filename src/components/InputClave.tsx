'use client';

import { useState } from 'react';

/** Campo de contraseña con el botón de ojo para mostrarla u ocultarla. */
export function InputClave({ className = 'form-control', ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [ver, setVer] = useState(false);
  return (
    <div className="input-clave">
      <input {...props} type={ver ? 'text' : 'password'} className={className} />
      <button type="button" className="btn-ojo" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={ver}>
        <i className={`fa-solid ${ver ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
      </button>
    </div>
  );
}

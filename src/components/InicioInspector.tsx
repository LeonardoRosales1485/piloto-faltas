'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TIPOS_ACTA, modulosDe, type ModuloActa } from '@/lib/dominio';
import { useAuthUser } from '@/lib/use-auth-user';

const ICONO: Record<ModuloActa, string> = { multas: 'fa-solid fa-car', contravenciones: 'fa-solid fa-store', sustancias: 'fa-solid fa-truck' };

/**
 * Inicio de los inspectores: dos botones grandes a pantalla completa («Crear nueva acta» y «Ver mis borradores»).
 * Si tiene más de un tipo de acta autorizado, el siguiente paso pide elegir el tipo (solo los permitidos).
 */
export function InicioInspector() {
  const router = useRouter();
  const user = useAuthUser();
  const modulos = modulosDe(user);
  const [elegir, setElegir] = useState<'crear' | 'borradores' | null>(null);
  const destino = (accion: 'crear' | 'borradores', m: ModuloActa) => (accion === 'crear' ? `/private/crear-editar/${m}` : `/private/lista-infracciones/${m}`);

  function ir(accion: 'crear' | 'borradores') {
    if (modulos.length === 1) router.push(destino(accion, modulos[0]));
    else setElegir(accion);
  }

  if (!user) return null;

  return (
    <div className="inicio-inspector">
      {elegir ? (
        <>
          <p className="inicio-inspector-titulo">{elegir === 'crear' ? '¿Qué acta va a generar?' : '¿Qué borradores quiere ver?'}</p>
          {modulos.map((m) => (
            <button key={m} type="button" className="inicio-inspector-boton" onClick={() => router.push(destino(elegir, m))}>
              <i className={ICONO[m]} aria-hidden="true" />
              <span>{TIPOS_ACTA[m].titulo}</span>
            </button>
          ))}
          <button type="button" className="inicio-inspector-volver" onClick={() => setElegir(null)}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Volver
          </button>
        </>
      ) : (
        <>
          <button type="button" className="inicio-inspector-boton principal" onClick={() => ir('crear')}>
            <i className="fa-solid fa-file-circle-plus" aria-hidden="true" />
            <span>{modulos.length > 1 ? 'Generar un acta' : 'Crear nueva acta'}</span>
            {modulos.length === 1 ? <small>{TIPOS_ACTA[modulos[0]].titulo}</small> : null}
          </button>
          <button type="button" className="inicio-inspector-boton" onClick={() => ir('borradores')}>
            <i className="fa-solid fa-folder-open" aria-hidden="true" />
            <span>Ver mis borradores</span>
          </button>
        </>
      )}
    </div>
  );
}

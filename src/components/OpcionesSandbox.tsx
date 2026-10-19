'use client';

import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/api-client';
import { fechaHora } from '@/lib/dominio';
import { useCarga } from '@/lib/use-carga';
import { LoaderLogo } from './LoaderLogo';
import { useNotify } from './NotifyProvider';

type Info = Record<string, { creado_at: number; creado_por: string; actas: number }>;
type Accion = { accion: 'restablecer' | 'borrar' | 'usuarios' | 'cargar' | 'guardar_foto'; origen?: 'default' | 'foto'; palabra: string; titulo: string; aviso: string };

const ETIQUETA: Record<string, string> = {
  ciudadano: 'cuentas del portal', lote: 'lotes', infraccion: 'actas', infraccion_ley: 'artículos', infraccion_dependencia: 'dependencias', infraccion_imagen: 'imágenes',
  causa_historial: 'movimientos', presentacion: 'presentaciones', documento: 'escritos y documentos', boleta: 'boletas', notificacion: 'notificaciones', correo_saliente: 'correos',
  subsanacion: 'subsanaciones', memo: 'memos internos', causa_ley_ajuste: 'montos ajustados por artículo',
  datos_borrados: 'registros de datos borrados', usuario: 'usuarios de prueba', plantilla: 'plantillas de escritos', plantilla_version: 'versiones de plantillas',
  ley: 'artículos de ordenanzas', configuracion: 'valores y tarifas', feriado: 'feriados', texto_portal: 'textos del portal', catalogo: 'catálogos',
  permiso_rol: 'permisos editados por tipo de usuario', vehiculo_marca: 'marcas de vehículos', vehiculo_modelo: 'modelos de vehículos',
};

/** Opciones sandbox (solo administrador): borrar datos, resetear usuarios y cargar datos dummy. */
export function OpcionesSandbox() {
  const notify = useNotify();
  const [info, setInfo] = useState<Info>({});
  const [cargando, seguir] = useCarga();
  const [pend, setPend] = useState<Accion | null>(null);
  const [palabra, setPalabra] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [resultado, setResultado] = useState<{ titulo: string; filas: [string, number][] } | null>(null);

  const cargar = useCallback(() => { void seguir(http.get<Info>('/api/admin/sandbox').then(setInfo)); }, [seguir]);
  useEffect(cargar, [cargar]);

  async function ejecutar() {
    if (!pend) return;
    setTrabajando(true);
    try {
      const r = await http.post<{ resultado: Record<string, number> }>('/api/admin/sandbox', { accion: pend.accion, origen: pend.origen, confirmacion: palabra });
      const filas = Object.entries(r.resultado ?? {}).map(([k, v]) => [ETIQUETA[k] ?? k, Number(v)] as [string, number]);
      setResultado({ titulo: pend.titulo, filas });
      notify.success('Listo', pend.titulo);
      setPend(null); setPalabra('');
      cargar();
    } catch (e) {
      notify.error('No se pudo completar', (e as Error).message);
    } finally {
      setTrabajando(false);
    }
  }

  const def = info.default;
  const foto = info.foto;
  const pedir = (a: Accion) => { setPend(a); setPalabra(''); };

  return (
    <div className="pagina">
      <div className="aviso aviso-alerta"><i className="fa-solid fa-flask" aria-hidden="true" /> Estas acciones son para el entorno de pruebas: modifican la base de datos y <strong>no se pueden deshacer</strong>.</div>
      {cargando ? <div className="card-step"><LoaderLogo tam={56} /></div> : (
        <div className="sandbox-grid">
          <article className="card-step sandbox-card">
            <div className="card-step-header"><h2><i className="fa-solid fa-rotate-left" aria-hidden="true" /> Restablecer piloto</h2><p>Como recién instalado</p></div>
            <div className="card-step-body">
              <p>Borra todas las actas y causas y vuelve todo al origen: solo los usuarios de prueba, las plantillas de escritos originales, ordenanzas, valores y tarifas, feriados, textos del portal, marcas y modelos y los permisos por defecto.</p>
              <p className="texto-ayuda">Se pierden las ediciones de configuración. Después se pueden cargar datos dummy.</p>
              <button type="button" className="btn btn-danger w-100" onClick={() => pedir({ accion: 'restablecer', palabra: 'RESTABLECER', titulo: 'Piloto restablecido', aviso: 'Se borrarán todos los datos y se perderán las ediciones de usuarios, plantillas y configuración: la base queda como recién instalada.' })}>Restablecer piloto</button>
            </div>
          </article>

          <article className="card-step sandbox-card">
            <div className="card-step-header"><h2><i className="fa-solid fa-trash-can" aria-hidden="true" /> Borrar todo</h2><p>Solo datos: conserva usuarios y configuración</p></div>
            <div className="card-step-body">
              <p>Elimina actas, causas, escritos, presentaciones, boletas, notificaciones, correos y cuentas del portal. Reinicia la numeración (la próxima acta de tránsito será T-001001).</p>
              <p className="texto-ayuda">Se conservan usuarios, plantillas, ordenanzas, valores y tarifas, feriados y textos del portal.</p>
              <button type="button" className="btn btn-danger w-100" onClick={() => pedir({ accion: 'borrar', palabra: 'BORRAR', titulo: 'Datos borrados', aviso: 'Se eliminarán todos los datos de prueba y se reiniciará la numeración.' })}>Borrar todo</button>
            </div>
          </article>

          <article className="card-step sandbox-card">
            <div className="card-step-header"><h2><i className="fa-solid fa-users-gear" aria-hidden="true" /> Resetear usuarios</h2><p>A los usuarios de prueba del repositorio</p></div>
            <div className="card-step-body">
              <p>Borra los usuarios creados y revierte las ediciones. Quedan: admin, los inspectores, directora y operador (tránsito), responsable_contrav y agente_contrav, responsable_sust y agente_sust, tributario y becario, con sus contraseñas originales.</p>
              <p className="texto-ayuda">Su sesión sigue abierta: el usuario admin se vuelve a crear.</p>
              <button type="button" className="btn btn-outline-danger w-100" onClick={() => pedir({ accion: 'usuarios', palabra: 'USUARIOS', titulo: 'Usuarios reseteados', aviso: 'Se borrarán todos los usuarios y se volverán a crear los de prueba.' })}>Resetear usuarios</button>
            </div>
          </article>

          <article className="card-step sandbox-card">
            <div className="card-step-header"><h2><i className="fa-solid fa-database" aria-hidden="true" /> Cargar datos dummy</h2><p>Borra todo y carga un conjunto de prueba</p></div>
            <div className="card-step-body">
              <p>Las fechas se corren al día de hoy, para que los plazos y vencimientos sigan teniendo sentido.</p>
              <div className="sandbox-opcion">
                <div><strong>Datos de sistema</strong><span className="texto-ayuda d-block">{def ? `${def.actas} actas en todas las bandejas, con fotos, firmas, escritos y pagos` : 'No cargados: corra sql/010_sandbox_default.sql'}</span></div>
                <button type="button" className="btn btn-primary" disabled={!def} onClick={() => pedir({ accion: 'cargar', origen: 'default', palabra: 'CARGAR', titulo: 'Datos de sistema cargados', aviso: 'Se borrarán los datos actuales y se cargarán los datos de prueba del sistema.' })}>Cargar</button>
              </div>
              <div className="sandbox-opcion">
                <div><strong>Foto guardada</strong><span className="texto-ayuda d-block">{foto ? `${foto.actas} actas · guardada el ${fechaHora(foto.creado_at)} por ${foto.creado_por}` : 'Todavía no se guardó ninguna'}</span></div>
                <button type="button" className="btn btn-outline-primary" disabled={!foto} onClick={() => pedir({ accion: 'cargar', origen: 'foto', palabra: 'CARGAR', titulo: 'Foto cargada', aviso: 'Se borrarán los datos actuales y se cargará la foto guardada.' })}>Cargar</button>
              </div>
              <button type="button" className="btn btn-light w-100 mt-2" onClick={() => pedir({ accion: 'guardar_foto', palabra: 'GUARDAR', titulo: 'Foto guardada', aviso: foto ? 'Se reemplazará la foto guardada anterior por el estado actual de los datos.' : 'Se guardará el estado actual de los datos como foto.' })}>
                <i className="fa-solid fa-camera" aria-hidden="true" /> Guardar estado actual como dummy
              </button>
              <p className="texto-ayuda mt-1 mb-0">Se guarda una sola foto; guardar otra reemplaza la anterior.</p>
            </div>
          </article>
        </div>
      )}

      {resultado ? (
        <div className="card-step mt-3"><div className="card-step-header"><h2>{resultado.titulo}</h2><p>Registros por tabla</p></div>
          <div className="card-step-body"><ul className="sandbox-resultado">{resultado.filas.map(([k, n]) => <li key={k}><span>{k}</span><strong>{n}</strong></li>)}</ul></div></div>
      ) : null}

      {pend ? (
        <div className="modal-fake-overlay" onClick={(e) => e.target === e.currentTarget && !trabajando && setPend(null)}>
          <div className="modal-fake" role="dialog" aria-modal="true" aria-label={pend.titulo}>
            <div className="modal-fake-header"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /><h2>Confirmar</h2><button type="button" aria-label="Cerrar" onClick={() => setPend(null)} disabled={trabajando}>&times;</button></div>
            <div className="modal-fake-body">
              <div className="aviso aviso-alerta">{pend.aviso} No se puede deshacer.</div>
              <label htmlFor="sb-conf">Escriba <strong>{pend.palabra}</strong> para confirmar</label>
              <input id="sb-conf" className="form-control" autoFocus autoComplete="off" value={palabra} onChange={(e) => setPalabra(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && palabra.toUpperCase() === pend.palabra && void ejecutar()} />
            </div>
            <div className="modal-fake-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setPend(null)} disabled={trabajando}>Cancelar</button>
              <button type="button" className="btn btn-danger" disabled={palabra.trim().toUpperCase() !== pend.palabra || trabajando} onClick={() => void ejecutar()}>
                {trabajando ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> : null} Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

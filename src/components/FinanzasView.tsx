'use client';

import { useEffect, useState } from 'react';
import { LoaderLogo } from './LoaderLogo';
import { apiClient } from '@/lib/api-client';
import { useNotify } from './NotifyProvider';

interface FinanzasState {
  finanza_unidad_fija: string;
  finanza_acarreo_auto: string;
  finanza_acarreo_moto: string;
  finanza_acarreo_camion: string;
  finanza_estadia_moto_3a7: string;
  finanza_estadia_moto_8a30: string;
  finanza_estadia_moto_mas31_por_dia: string;
  finanza_estadia_auto_3a7: string;
  finanza_estadia_auto_8a30: string;
  finanza_estadia_auto_mas31_por_dia: string;
  finanza_estadia_camion_3a7: string;
  finanza_estadia_camion_8a30: string;
  finanza_estadia_camion_mas31_por_dia: string;
  finanza_salario_minimo: string;
}

const CLAVES: (keyof FinanzasState)[] = [
  'finanza_unidad_fija',
  'finanza_acarreo_auto',
  'finanza_acarreo_moto',
  'finanza_acarreo_camion',
  'finanza_estadia_moto_3a7',
  'finanza_estadia_moto_8a30',
  'finanza_estadia_moto_mas31_por_dia',
  'finanza_estadia_auto_3a7',
  'finanza_estadia_auto_8a30',
  'finanza_estadia_auto_mas31_por_dia',
  'finanza_estadia_camion_3a7',
  'finanza_estadia_camion_8a30',
  'finanza_estadia_camion_mas31_por_dia',
  'finanza_salario_minimo',
];

function vacias(): FinanzasState {
  return {
    finanza_unidad_fija: '',
    finanza_acarreo_auto: '',
    finanza_acarreo_moto: '',
    finanza_acarreo_camion: '',
    finanza_estadia_moto_3a7: '',
    finanza_estadia_moto_8a30: '',
    finanza_estadia_moto_mas31_por_dia: '',
    finanza_estadia_auto_3a7: '',
    finanza_estadia_auto_8a30: '',
    finanza_estadia_auto_mas31_por_dia: '',
    finanza_estadia_camion_3a7: '',
    finanza_estadia_camion_8a30: '',
    finanza_estadia_camion_mas31_por_dia: '',
    finanza_salario_minimo: '',
  };
}

const ACARREOS: { key: keyof FinanzasState; label: string }[] = [
  { key: 'finanza_acarreo_auto', label: 'Autos' },
  { key: 'finanza_acarreo_moto', label: 'Motos' },
  { key: 'finanza_acarreo_camion', label: 'Camiones' },
];

const ESTADIAS: {
  titulo: string;
  base: keyof FinanzasState;
  filas: { key: keyof FinanzasState; label: string }[];
}[] = [
  {
    titulo: 'MOTOVEHICULOS',
    base: 'finanza_estadia_moto_8a30',
    filas: [
      { key: 'finanza_estadia_moto_3a7', label: 'de 3 a 7 días' },
      { key: 'finanza_estadia_moto_8a30', label: 'de 8 a 30 días' },
      { key: 'finanza_estadia_moto_mas31_por_dia', label: 'de 31 por día subsiguiente' },
    ],
  },
  {
    titulo: 'AUTOMOVILES',
    base: 'finanza_estadia_auto_8a30',
    filas: [
      { key: 'finanza_estadia_auto_3a7', label: 'de 3 a 7 días' },
      { key: 'finanza_estadia_auto_8a30', label: 'de 8 a 30 días' },
      { key: 'finanza_estadia_auto_mas31_por_dia', label: 'de 31 por día subsiguiente' },
    ],
  },
  {
    titulo: 'CAMIONES',
    base: 'finanza_estadia_camion_8a30',
    filas: [
      { key: 'finanza_estadia_camion_3a7', label: 'de 3 a 7 días' },
      { key: 'finanza_estadia_camion_8a30', label: 'de 8 a 30 días' },
      { key: 'finanza_estadia_camion_mas31_por_dia', label: 'de 31 por día subsiguiente' },
    ],
  },
];

export function FinanzasView() {
  const notify = useNotify();
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState<FinanzasState>(vacias);

  const cargar = () => {
    setCargando(true);
    apiClient.configAll().then((items) => {
      const next = vacias();
      for (const item of items ?? []) {
        if ((CLAVES as string[]).includes(item.llave)) {
          next[item.llave as keyof FinanzasState] = String(item.valor ?? '');
        }
      }
      setEstado(next);
      setCargando(false);
    });
  };

  useEffect(() => {
    cargar();
  }, []);

  function numero(v: string) {
    return v ? Number(v).toLocaleString('es-AR') : '0';
  }

  function patch(key: keyof FinanzasState, value: string) {
    setEstado((prev) => ({ ...prev, [key]: value }));
  }

  function guardar() {
    setGuardando(true);
    let pendientes = CLAVES.length;
    let failed = false;
    for (const llave of CLAVES) {
      apiClient.configSave({ llave, valor: estado[llave] || '0', publico: '1' }).then(
        () => {
          pendientes -= 1;
          if (pendientes === 0 && !failed) {
            setGuardando(false);
            setEditando(false);
            notify.success('Configuración guardada', 'Los valores de finanzas fueron actualizados.');
          }
        },
        () => {
          if (!failed) {
            failed = true;
            setGuardando(false);
            notify.error('No se pudo guardar', 'Intente nuevamente.');
          }
        },
      );
    }
  }

  if (cargando) {
    return (
      <div className="pagina">
        <LoaderLogo />
      </div>
    );
  }

  return (
    <div className="pagina">
      <div className="row g-3 mb-3">
        <div className="col-md-4 col-12">
          <div className="card h-100">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>Unidad Tributaria</div>
                  <div className="texto-muted">Valor base para cálculos</div>
                </div>
                <i className="fa-solid fa-sack-dollar text-primary fa-xl" />
              </div>
            </div>
            <div className="card-body d-flex justify-content-center align-items-center">
              {editando ? (
                <div className="d-flex align-items-center gap-2">
                  <strong className="text-primary" style={{ fontSize: '1.5rem' }}>$</strong>
                  <input type="number" className="form-control input-grande" min={0} value={estado.finanza_unidad_fija} onChange={(e) => patch('finanza_unidad_fija', e.target.value)} />
                </div>
              ) : (
                <div className="text-primary" style={{ fontSize: '1.75rem', fontWeight: 700 }}>$ {numero(estado.finanza_unidad_fija)}</div>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-4 col-12">
          <div className="card h-100">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>Acarreo de Vehículo</div>
                  <div className="texto-muted">Costo de traslado al depósito</div>
                </div>
                <i className="fa-solid fa-car-side text-success fa-xl" />
              </div>
            </div>
            <div className="card-body">
              <div className="d-flex flex-column gap-2">
                {ACARREOS.map((item) => (
                  <div key={item.key} className="d-flex align-items-center justify-content-between">
                    <strong className="text-success">{item.label}:</strong>
                    {editando ? (
                      <div className="d-flex align-items-center gap-2 col-7">
                        <strong>$</strong>
                        <input type="number" className="form-control" min={0} value={estado[item.key]} onChange={(e) => patch(item.key, e.target.value)} />
                      </div>
                    ) : (
                      <span className="text-success">$ {numero(estado[item.key])}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4 col-12">
          <div className="card h-100">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>Medio Salario</div>
                  <div className="texto-muted">Costo por día en depósito</div>
                </div>
                <i className="fa-solid fa-wallet text-info fa-xl" />
              </div>
            </div>
            <div className="card-body d-flex justify-content-center align-items-center">
              {editando ? (
                <div className="d-flex align-items-center gap-2">
                  <strong className="text-info" style={{ fontSize: '1.5rem' }}>$</strong>
                  <input type="number" className="form-control input-grande" min={0} value={estado.finanza_estadia_moto_3a7} onChange={(e) => patch('finanza_estadia_moto_3a7', e.target.value)} />
                </div>
              ) : (
                <div className="text-info" style={{ fontSize: '1.75rem', fontWeight: 700 }}>$ {numero(estado.finanza_estadia_moto_3a7)}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>Estadías</div>
              <div className="texto-muted">Costo por día en depósito</div>
            </div>
            <i className="fa-solid fa-calendar-days text-warning fa-xl" />
          </div>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {ESTADIAS.map((grupo) => (
              <div key={grupo.titulo} className="col-12 col-md-4">
                <h6 className="text-warning">{grupo.titulo}</h6>
                <div className="d-flex flex-column gap-2 texto-muted">
                  {grupo.filas.map((fila, idx) => (
                    <div key={fila.key}>
                      <div>{fila.label}</div>
                      {editando ? (
                        <div className="d-flex align-items-center gap-2 col-7">
                          <strong>$</strong>
                          <input type="number" className="form-control" min={0} value={estado[fila.key]} onChange={(e) => patch(fila.key, e.target.value)} />
                        </div>
                      ) : idx === 2 ? (
                        <div>$ {numero(estado[grupo.base])} + $ {numero(estado[fila.key])}</div>
                      ) : (
                        <div>$ {numero(estado[fila.key])}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Información de Tarifas</div>
              <div className="texto-muted">Detalles sobre el uso de las tarifas en el sistema</div>
            </div>
            <div className="d-flex gap-2">
              {editando ? (
                <>
                  <button type="button" className="btn btn-primary" onClick={() => { cargar(); setEditando(false); }}>Cancelar</button>
                  <button type="button" className="btn btn-success" disabled={guardando} onClick={guardar}>
                    {guardando ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> : <i className="fa-solid fa-floppy-disk" aria-hidden="true" />}
                    Guardar
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-success" onClick={() => setEditando(true)}>
                  <i className="fa-solid fa-pen" aria-hidden="true" /> Editar
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <strong className="text-primary">Unidad Tributaria</strong>
              <p className="texto-muted mt-1">
                Se utiliza como base para el cálculo de multas y contravenciones según los artículos aplicables. Valor vigente:
                <strong>$ {numero(estado.finanza_unidad_fija)}</strong>.
              </p>
            </div>
            <div className="col-12 col-md-4">
              <strong className="text-success">Acarreo de Vehículo</strong>
              <p className="texto-muted mt-1">Tarifa fija que se cobra por el traslado del vehículo desde el lugar de la infracción hasta el depósito municipal.</p>
            </div>
            <div className="col-12 col-md-4">
              <strong className="text-warning">Estadía Diaria</strong>
              <p className="texto-muted mt-1">Costo por cada día que el vehículo permanece en el depósito municipal. Se calcula automáticamente.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

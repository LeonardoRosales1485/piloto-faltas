'use client';

import { useParams } from 'next/navigation';

const TITULOS: Record<string, string> = {
  inspectores: 'Inspectores',
  gps: 'GPS',
  escritos: 'Administrar Escritos',
  retenciones: 'Retenciones',
};

export function ProximamenteView() {
  const params = useParams();
  const modulo = (params.modulo as string) ?? '';
  const titulo = TITULOS[modulo] ?? 'Módulo';

  return (
    <div className="card-seccion p-4 text-center">
      <div className="mb-4">
        <i className="fa-solid fa-screwdriver-wrench fa-3x" style={{ color: 'var(--bo-azul)' }} aria-hidden="true" />
      </div>
      <h2 className="h4 mb-2">{titulo}</h2>
      <p className="text-secondary mb-0">Este módulo se encuentra en desarrollo y estará disponible próximamente.</p>
    </div>
  );
}

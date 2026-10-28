import { infoEstado } from '@/lib/dominio';

/** Etiqueta del estado de la causa (Anexo I) con color por familia; opcionalmente el estado visible en el portal. */
export function EstadoChip({ estado, medida, portal }: { estado?: string | null; medida?: boolean; portal?: boolean }) {
  const info = infoEstado(estado);
  return (
    <span className="d-inline-flex align-items-center gap-1 flex-wrap">
      <span className={`estado-chip estado-${estado === 'Borrador' ? 'presentacion' : info.familia}`} title={portal ? `Interno: ${info.nombre}` : `Visible en el portal: ${info.portal}`}>
        {portal ? info.portal : info.etiqueta ?? info.nombre}
      </span>
      {medida ? (
        <span className="medida-chip" title="Medida preventiva vigente">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Medida
        </span>
      ) : null}
    </span>
  );
}

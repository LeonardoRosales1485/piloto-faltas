import Link from 'next/link';
import { EvidenciaPublica } from '@/components/EvidenciaPublica';
import { TIPOS_ACTA, tipoActa } from '@/lib/dominio';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Destino del QR del ticket y del PDF: verifica en el sitio oficial que el acta es válida (PI-02)
 * y lleva al infractor al portal para consultarla y gestionarla (PI-01). No muestra datos personales.
 */
export default async function ActaPublicaPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  let a: Record<string, unknown> | null = null;
  let imagenes: string[] = [];
  try {
    const { data } = await createServerClient().from('infraccion').select('id, legajo_numero_acta, legajo_fecha, infraccion_tipo_nombre, estado_faltas, firmada_at, firma_inspector_hash, inspector_nombre').eq('uuid', uuid).maybeSingle();
    a = data as Record<string, unknown> | null;
    if (a?.id && a.firmada_at) {
      const { data: imgs } = await createServerClient().from('infraccion_imagen').select('preview_raw').eq('infraccion_id', a.id);
      imagenes = ((imgs ?? []) as { preview_raw: string | null }[]).map((x) => x.preview_raw ?? '').filter(Boolean);
    }
  } catch {
    a = null;
  }
  const valida = Boolean(a?.firmada_at) && a?.estado_faltas !== 'Anulada' && a?.estado_faltas !== 'Borrador';
  return (
    <div className="portal-body">
      <header className="portal-header">
        <div className="portal-header-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/Municipio_malvinas_argentinas_logo.png" alt="Municipalidad de Malvinas Argentinas" />
          <div><strong>Verificación de acta</strong><span>Dirección de Faltas · Malvinas Argentinas</span></div>
        </div>
      </header>
      <main className="portal-main" style={{ maxWidth: 560 }}>
        <div className="portal-card text-center">
          {valida ? (
            <>
              <i className="fa-solid fa-circle-check" style={{ fontSize: 48, color: '#16a34a' }} aria-hidden="true" />
              <h1 className="mt-2">Acta válida</h1>
              <p className="mb-1"><strong>{TIPOS_ACTA[tipoActa(String(a!.infraccion_tipo_nombre))].titulo} {String(a!.legajo_numero_acta)}</strong></p>
              <p className="texto-ayuda">Labrada el {String(a!.legajo_fecha ?? '').replace('T', ' ')} por {String(a!.inspector_nombre ?? 'inspector municipal')}.<br />Código de verificación: {String(a!.firma_inspector_hash ?? '').slice(0, 16).toUpperCase()}</p>
              <Link className="btn btn-primary btn-lg w-100" href={`/portal/causa/${uuid}`}>Ver y gestionar mi acta</Link>
              <p className="texto-ayuda mt-2 mb-0">Necesita una cuenta en el portal. Al abrir el acta queda notificado/a.</p>
              <EvidenciaPublica imagenes={imagenes} />
            </>
          ) : (
            <>
              <i className="fa-solid fa-circle-xmark" style={{ fontSize: 48, color: '#dc2626' }} aria-hidden="true" />
              <h1 className="mt-2">Acta no válida</h1>
              <p className="texto-ayuda mb-0">No existe un acta firmada para este código. Si recibió un ticket, comuníquese con la Dirección de Faltas.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

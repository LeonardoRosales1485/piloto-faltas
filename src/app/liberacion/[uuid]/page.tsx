import { fechaHora, TIPOS_ACTA, tipoActa } from '@/lib/dominio';
import { estadoLiberacion, TEXTO_LIBERACION, type CausaLib } from '@/lib/liberacion-srv';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const ICONO = { ok: ['fa-circle-check', '#16a34a'], alerta: ['fa-triangle-exclamation', '#d97706'], error: ['fa-circle-xmark', '#dc2626'], neutro: ['fa-circle-info', '#64748b'] } as const;

/**
 * Destino del QR de la disposición de levantamiento (minuta 20/10): el corralón lo escanea antes de entregar el vehículo
 * y ve si la liberación está vigente o vencida. Muestra lo mínimo para identificar el vehículo, sin datos personales.
 */
export default async function LiberacionPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  let c: (CausaLib & Record<string, unknown>) | null = null;
  let est: Awaited<ReturnType<typeof estadoLiberacion>> | null = null;
  try {
    const db = createServerClient();
    const { data } = await db.from('infraccion')
      .select('id, legajo_numero_acta, infraccion_tipo_nombre, estado_faltas, vehiculo_numero_dominio, vehiculo_tipo_nombre, retencion_de_vehiculo, vehiculo_liberado_at, vehiculo_liberacion_json, estadia_ingreso_at')
      .eq('uuid', uuid).maybeSingle();
    c = data as (CausaLib & Record<string, unknown>) | null;
    if (c && !['Borrador', 'Anulada'].includes(String(c.estado_faltas))) est = await estadoLiberacion(db, c);
  } catch {
    est = null;
  }
  const t = est ? TEXTO_LIBERACION[est.estado] : null;
  const [icono, color] = ICONO[t?.color ?? 'error'];
  return (
    <div className="portal-body">
      <header className="portal-header">
        <div className="portal-header-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/Municipio_malvinas_argentinas_logo.png" alt="Municipalidad de Malvinas Argentinas" />
          <div><strong>Control de liberación</strong><span>Municipio Malvinas Argentinas · Depósito municipal</span></div>
        </div>
      </header>
      <main className="portal-main" style={{ maxWidth: 560 }}>
        <div className="portal-card text-center">
          <i className={`fa-solid ${icono}`} style={{ fontSize: 56, color }} aria-hidden="true" />
          {c && est && t ? (
            <>
              <h1 className="mt-2" style={{ color }}>{t.titulo}</h1>
              <p className="mb-2">{t.detalle}</p>
              <dl className="text-start mx-auto" style={{ maxWidth: 380 }}>
                <dt>Acta</dt><dd>{TIPOS_ACTA[tipoActa(String(c.infraccion_tipo_nombre))].titulo} {String(c.legajo_numero_acta)}</dd>
                <dt>Dominio</dt><dd style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>{String(c.vehiculo_numero_dominio || 'Sin dominio')}</dd>
                <dt>Vehículo</dt><dd>{String(c.vehiculo_tipo_nombre || '-')}</dd>
                {c.estadia_ingreso_at ? <><dt>Ingreso al depósito</dt><dd>{fechaHora(Number(c.estadia_ingreso_at))}</dd></> : null}
                {est.liberadoAt ? <><dt>Liberación registrada</dt><dd>{fechaHora(est.liberadoAt)}</dd></> : null}
                {est.vigenteHasta && ['vigente', 'vencida', 'autorizar'].includes(est.estado) ? <><dt>{est.estado === 'vencida' ? 'Venció' : 'Vigente hasta'}</dt><dd><strong>{fechaHora(est.vigenteHasta)}</strong></dd></> : null}
                {est.entregadoAt ? <><dt>Entregado</dt><dd>{fechaHora(est.entregadoAt)}</dd></> : null}
              </dl>
              <p className="texto-ayuda mb-0">Consultado el {fechaHora(Date.now())}. La entrega se registra en el sistema desde «Retenciones».</p>
            </>
          ) : (
            <>
              <h1 className="mt-2">Código no válido</h1>
              <p className="texto-ayuda mb-0">No existe un acta con retención para este código. No entregue el vehículo y comuníquese con la Dirección de Faltas.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { firmaHtml, PIE_INSTITUCIONAL } from '@/lib/membrete';
import { portal } from '@/lib/portal-client';

/** El infractor abre un escrito (fallo, resolución, compromiso). Si estaba pendiente, queda notificado. */
export function PortalDocumento() {
  const { uuid } = useParams() as { uuid: string };
  const sp = useSearchParams();
  const [doc, setDoc] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { portal.get<Record<string, any>>(`/api/portal/documento/${uuid}`).then(setDoc).catch((e: Error) => setError(e.message)); }, [uuid]);
  if (error) return <div className="aviso aviso-peligro">{error}</div>;
  if (!doc) return <div className="portal-card">Cargando...</div>;
  return (
    <>
      <div className="d-flex gap-2 mb-3 no-print flex-wrap">
        <Link className="btn btn-outline-secondary" href={sp.get('causa') ? `/portal/causa/${sp.get('causa')}` : '/portal'}>Volver</Link>
        <button type="button" className="btn btn-outline-primary" onClick={() => window.print()}><i className="fa-solid fa-download" aria-hidden="true" /> Descargar / imprimir</button>
      </div>
      <div className="editor-escrito-wrap">
        <div className="hoja-a4">
          <div className="membrete">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/Municipio_malvinas_argentinas_logo.png" alt="" style={{ height: 44, display: 'block', margin: '0 auto 4px' }} />
            <strong>MUNICIPALIDAD DE MALVINAS ARGENTINAS</strong>DIRECCIÓN DE FALTAS
          </div>
          <div dangerouslySetInnerHTML={{ __html: `${doc.contenido_html ?? ''}${firmaHtml(doc)}` }} />
          <div style={{ borderTop: '1px solid #000', marginTop: 18, paddingTop: 4, fontSize: '9pt', textAlign: 'center' }}>{PIE_INSTITUCIONAL}</div>
        </div>
      </div>
    </>
  );
}

import { actaOficialCss, actaOficialHtml } from '@/lib/acta-oficial';
import { loadInfraccionByUuid } from '@/lib/load-infraccion';
import type { Infraccion } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ActaPublicaPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  let infraccion: Infraccion | null = null;
  try {
    infraccion = await loadInfraccionByUuid(uuid);
  } catch {
    infraccion = null;
  }

  if (!infraccion) {
    return (
      <main className="acta-publica">
        <div className="acta-publica-estado">
          <h1>Acta no encontrada</h1>
          <p>No hay un acta digital para este enlace.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="acta-publica">
      <div
        className="acta-preview-scroll"
        dangerouslySetInnerHTML={{
          __html: `<style>${actaOficialCss()}</style>${actaOficialHtml(infraccion)}`,
        }}
      />
    </main>
  );
}

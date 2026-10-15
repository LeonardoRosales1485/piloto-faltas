import { Suspense } from 'react';
import { EditorPlantilla } from '@/components/EditorPlantilla';
import { LoaderLogo } from '@/components/LoaderLogo';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<LoaderLogo texto="Cargando plantilla…" pantalla />}>
      <EditorPlantilla key={id} id={id} />
    </Suspense>
  );
}

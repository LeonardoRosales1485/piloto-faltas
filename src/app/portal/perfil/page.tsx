import { Suspense } from 'react';
import { PortalPerfil } from '@/components/PortalCuenta';

export default function Page() {
  return <Suspense fallback={null}><PortalPerfil /></Suspense>;
}

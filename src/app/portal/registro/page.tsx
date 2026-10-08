import { Suspense } from 'react';
import { PortalRegistro } from '@/components/PortalCuenta';

export default function Page() {
  return <Suspense fallback={null}><PortalRegistro /></Suspense>;
}

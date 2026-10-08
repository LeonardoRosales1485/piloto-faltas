import { Suspense } from 'react';
import { PortalDocumento } from '@/components/PortalDocumento';

export default function Page() {
  return <Suspense fallback={null}><PortalDocumento /></Suspense>;
}

import { Suspense } from 'react';
import { PortalInicio } from '@/components/PortalInicio';

export default function Page() {
  return <Suspense fallback={null}><PortalInicio /></Suspense>;
}

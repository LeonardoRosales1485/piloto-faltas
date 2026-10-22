import { Suspense } from 'react';
import { CausasBandeja } from '@/components/CausasBandeja';

// Suspense: la bandeja lee ?b=… (useSearchParams) y la página se prerenderiza.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <CausasBandeja />
    </Suspense>
  );
}

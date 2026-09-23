'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getToken } from '@/lib/auth-client';
import { Shell } from './Shell';

export function PrivateGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="celda-cargando p-5">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando...
      </div>
    );
  }

  return <Shell>{children}</Shell>;
}

'use client';

import { useRouter } from 'next/navigation';
import { LoaderLogo } from './LoaderLogo';
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
      <LoaderLogo pantalla />
    );
  }

  return <Shell>{children}</Shell>;
}

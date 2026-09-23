'use client';

import { useEffect } from 'react';
import { restoreSession } from '@/lib/auth-client';

export function AuthBootstrap() {
  useEffect(() => {
    restoreSession();
  }, []);
  return null;
}

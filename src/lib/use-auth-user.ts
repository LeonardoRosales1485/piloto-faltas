'use client';

import { useEffect, useState } from 'react';
import { getUser, subscribeAuth } from './auth-client';
import type { Usuario } from './types';

export function useAuthUser(): Usuario | null {
  const [user, setUser] = useState<Usuario | null>(() => getUser());
  useEffect(() => subscribeAuth(setUser), []);
  return user;
}

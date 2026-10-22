'use client';

import { useCallback, useEffect, useState } from 'react';
import { http } from './api-client';
import type { BandejaTrabajoId } from './bandejas';
import { useRefresco } from './use-refresco';

/**
 * Bandeja de trabajo que el usuario tiene abierta (para resaltarla en el menú lateral). La fijan la lista de la
 * bandeja y el detalle de la causa (con «Seguir acta», la bandeja nueva de la causa).
 */
const EVENTO = 'faltas:bandeja-activa';
let actual: BandejaTrabajoId | null = null;

export function fijarBandejaActiva(b: BandejaTrabajoId | null) {
  actual = b;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO));
}

export function useBandejaActiva(): BandejaTrabajoId | null {
  const [b, setB] = useState<BandejaTrabajoId | null>(actual);
  useEffect(() => {
    const f = () => setB(actual);
    window.addEventListener(EVENTO, f);
    f();
    return () => window.removeEventListener(EVENTO, f);
  }, []);
  return b;
}

/** Contadores de las bandejas (menú lateral y resumen). Se actualizan solos (useRefresco). */
export function useContadoresBandejas(activo: boolean) {
  const [conteos, setConteos] = useState<Partial<Record<BandejaTrabajoId, number>>>({});
  const cargar = useCallback(() => {
    if (!activo) return;
    http.get<{ conteos: Record<BandejaTrabajoId, number> }>('/api/bandejas').then((r) => setConteos(r.conteos)).catch(() => undefined);
  }, [activo]);
  useEffect(cargar, [cargar]);
  useRefresco(cargar);
  return conteos;
}

/** Preferencia «Seguir acta» (en este navegador, como pide la especificación): activada por defecto. */
const CLAVE_SEGUIR = 'faltas:seguir-acta';
export function useSeguirActa(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(true);
  useEffect(() => { try { setV(localStorage.getItem(CLAVE_SEGUIR) !== '0'); } catch { /* sin almacenamiento */ } }, []);
  const set = (x: boolean) => { setV(x); try { localStorage.setItem(CLAVE_SEGUIR, x ? '1' : '0'); } catch { /* sin almacenamiento */ } };
  return [v, set];
}

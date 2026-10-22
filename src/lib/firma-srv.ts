/**
 * Firma del Intendente (decisión 22/10/2026): los fallos y las resoluciones los firma el Intendente. La Directora (o el
 * Responsable del área) los revisa y aprueba; quedan «para firma» y el Intendente los firma o pide revisión.
 * Las categorías salen de la configuración `firma_intendente_categorias` (por defecto «Fallo,Resolución»); vacía, la
 * Dirección firma todo como antes.
 */
import { config, type Db } from './srv';

export const CARGO_DIRECCION = 'Directora de Faltas';
export const CARGO_INTENDENTE = 'Intendente Municipal';

export async function categoriasIntendente(db: Db): Promise<string[]> {
  const v = await config(db, 'firma_intendente_categorias', 'Fallo,Resolución');
  return v.split(',').map((x) => x.trim()).filter(Boolean);
}

export async function firmaDelIntendente(db: Db, categoria: unknown): Promise<boolean> {
  return (await categoriasIntendente(db)).includes(String(categoria ?? ''));
}

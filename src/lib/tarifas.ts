import { configNum, type Db } from './srv';

/** Clase de vehículo para acarreo y estadía (como «Valores y tarifas» de stg: autos, motos, camiones). */
export type ClaseVehiculo = 'auto' | 'moto' | 'camion';

export function claseVehiculo(tipo?: string | null): ClaseVehiculo {
  const t = String(tipo ?? '').toLowerCase();
  if (/moto|ciclomotor|cuatri|triciclo/.test(t)) return 'moto';
  if (/cami[oó]n(?!eta)|colectivo|[oó]mnibus|acoplado|semirremolque|tractor/.test(t)) return 'camion';
  return 'auto';
}

export const NOMBRE_CLASE: Record<ClaseVehiculo, string> = { auto: 'Automóviles', moto: 'Motovehículos', camion: 'Camiones' };

export async function tarifaAcarreo(d: Db, clase: ClaseVehiculo) {
  const def = { auto: 42180, moto: 17650, camion: 79365 }[clase];
  return configNum(d, `finanza_acarreo_${clase}`, def);
}

/**
 * Estadía según días en depósito (minuta 20/10, provisorio hasta confirmar): 1 a 7 días y 8 a 30 días = monto del
 * tramo; desde el día 31, el monto del tramo 8–30 más el valor diario por cada día siguiente. Los días sin cargo al
 * comienzo se configuran en «Valores y tarifas» (`estadia_dias_sin_cargo`, 0 por defecto; stg usaba 2).
 * Las claves de configuración del primer tramo siguen llamándose `_3a7` para no migrar datos.
 */
export async function tarifaEstadia(d: Db, clase: ClaseVehiculo, dias: number) {
  const defs = { auto: [28600, 84915, 4220], moto: [12333, 42460, 2110], camion: [42460, 128480, 6345] }[clase];
  const [t1, t2, diario] = await Promise.all([
    configNum(d, `finanza_estadia_${clase}_3a7`, defs[0]),
    configNum(d, `finanza_estadia_${clase}_8a30`, defs[1]),
    configNum(d, `finanza_estadia_${clase}_mas31_por_dia`, defs[2]),
  ]);
  const sinCargo = Math.max(0, Math.min(6, await configNum(d, 'estadia_dias_sin_cargo', 0)));
  if (dias <= sinCargo) return { monto: 0, tramo: `Sin cargo (hasta ${sinCargo} día${sinCargo === 1 ? '' : 's'})` };
  if (dias <= 7) return { monto: t1, tramo: `${sinCargo + 1} a 7 días` };
  if (dias <= 30) return { monto: t2, tramo: '8 a 30 días' };
  return { monto: t2 + (dias - 30) * diario, tramo: `8 a 30 días + ${dias - 30} día(s) desde el 31` };
}

/** Validez de las boletas de liberación (acarreo y estadía), en horas: 48 por defecto (minuta 20/10). */
export async function validezLiberacionMs(d: Db) {
  const horas = Math.max(1, await configNum(d, 'liberacion_validez_horas', 48));
  return horas * 3600000;
}

export function diasEnDeposito(desde: number, hasta = Date.now()) {
  return Math.max(1, Math.ceil((hasta - desde) / 86400000));
}

/** Total para liberar un vehículo: acarreo según clase + estadía según días. */
export async function calculoLiberacion(d: Db, tipoVehiculo: string | null | undefined, ingresoAt: number, hasta = Date.now()) {
  const clase = claseVehiculo(tipoVehiculo);
  const dias = diasEnDeposito(ingresoAt, hasta);
  const [acarreo, estadia] = await Promise.all([tarifaAcarreo(d, clase), tarifaEstadia(d, clase, dias)]);
  return { clase, claseNombre: NOMBRE_CLASE[clase], dias, acarreo, estadia: estadia.monto, tramo: estadia.tramo, total: acarreo + estadia.monto };
}

import { LIMITES_DEFECTO, validarAdjuntos, type LimitesAdjuntos } from './adjuntos';
import { check, configNum, type Db } from './srv';

export async function limitesAdjuntos(db: Db): Promise<LimitesAdjuntos> {
  const [maxMb, maxArchivos, maxFojas] = await Promise.all([
    configNum(db, 'adjuntos_max_mb', LIMITES_DEFECTO.maxMb),
    configNum(db, 'adjuntos_max_archivos', LIMITES_DEFECTO.maxArchivos),
    configNum(db, 'adjuntos_max_fojas', LIMITES_DEFECTO.maxFojas),
  ]);
  return { maxMb, maxArchivos, maxFojas };
}

/** Control en el servidor: rechaza (400) si los adjuntos no cumplen los límites configurados. */
export async function controlarAdjuntos(db: Db, lista: { nombre?: string; raw: string }[]) {
  const error = validarAdjuntos(lista, await limitesAdjuntos(db));
  check(!error, error ?? '');
}

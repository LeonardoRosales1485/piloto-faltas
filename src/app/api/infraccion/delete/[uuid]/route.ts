import { NextRequest } from 'next/server';
import { jsonFail } from '@/lib/http-data';

/**
 * Las actas no se eliminan (RN de inmutabilidad y trazabilidad).
 * Un borrador se descarta con /api/acta/anular; una causa se desestima con /api/causa/accion.
 */
export async function DELETE(_req: NextRequest) {
  return jsonFail(409, 'Las actas no se eliminan. Descarte el borrador o desestime la causa dejando el motivo.');
}

import { handlePublic, HttpError } from '@/lib/srv';

/** «Extender tiempo» del labrado se quitó (no se va a implementar en el producto). Queda la respuesta para APKs viejas. */
export async function POST() {
  return handlePublic(async () => {
    throw new HttpError(410, 'El plazo de labrado ya no se puede extender.');
  });
}

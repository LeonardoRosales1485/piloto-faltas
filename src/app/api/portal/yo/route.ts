import { NextRequest } from 'next/server';
import { handlePortal, perfilPublico } from '@/lib/portal-srv';

export async function GET(req: NextRequest) {
  return handlePortal(req, async ({ ciu }) => perfilPublico(ciu));
}

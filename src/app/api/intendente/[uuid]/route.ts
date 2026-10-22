import { NextRequest } from 'next/server';
import { efectosDefinitivo } from '@/lib/causa-srv';
import { pesos, TIPOS_ACTA, tipoActa } from '@/lib/dominio';
import { causaPorId, check, handle, historial, must, nombreUsuario, type Db } from '@/lib/srv';

type Ctx = { params: Promise<{ uuid: string }> };

async function documento(db: Db, uuid: string) {
  const { data } = await db.from('documento').select('*, plantilla(categoria, titulo)').eq('uuid', uuid).eq('tipo', 'escrito').maybeSingle();
  return must(data as Record<string, unknown> | null, 404, 'Escrito inexistente');
}

/** El escrito a firmar, con un resumen mínimo de la causa (el Intendente no gestiona causas). */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { uuid } = await ctx.params;
  return handle(req, async ({ db }) => {
    const doc = await documento(db, uuid);
    const c = await causaPorId(db, Number(doc.infraccion_id));
    return {
      documento: { uuid: doc.uuid, titulo: doc.titulo, estado: doc.estado, numero: doc.numero, contenido_html: doc.contenido_html, valores_json: doc.valores_json, firmado_por: doc.firmado_por, firmado_at: doc.firmado_at, firmado_cargo: doc.firmado_cargo, hash: doc.hash, hash_por: doc.hash_por, hash_at: doc.hash_at, categoria: (doc.plantilla as { categoria?: string } | null)?.categoria ?? null },
      causa: {
        acta: c.legajo_numero_acta, tipo: TIPOS_ACTA[tipoActa(String(c.infraccion_tipo_nombre))].titulo, estado: c.estado_faltas,
        infractor: c.infractor_razon_social || c.infractor_nombre || 'NN', dominio: c.vehiculo_numero_dominio || null,
        monto: c.monto_estimado != null ? pesos(Number(c.monto_estimado)) : null,
      },
    };
  }, 'firmaIntendente');
}

/** Firmar o pedir revisión (vuelve a la Dirección con la observación). */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { uuid } = await ctx.params;
  const body = (await req.json()) as { accion: 'firmar' | 'revision'; observacion?: string };
  return handle(req, async ({ db, user }) => {
    const doc = await documento(db, uuid);
    check(doc.estado === 'para_firma', 'El escrito ya no está para firma', 409);
    const quien = nombreUsuario(user);
    if (body.accion === 'revision') {
      const obs = (body.observacion ?? '').trim();
      check(obs, 'Escriba qué hay que revisar');
      await db.from('documento').update({ estado: 'en_revision', observacion: `Intendente: ${obs}`, date_updated: Date.now() }).eq('id', doc.id as number);
      await historial(db, Number(doc.infraccion_id), quien, 'El Intendente pidió revisión', `${doc.titulo}: ${obs}`);
      return { ok: true };
    }
    check(body.accion === 'firmar', 'Acción inválida');
    return efectosDefinitivo(db, user, uuid, true);
  }, 'firmaIntendente');
}

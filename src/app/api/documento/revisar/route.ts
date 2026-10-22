import { NextRequest } from 'next/server';
import { aplicarValores, faltantes, quedanMarcadores } from '@/lib/campos';
import { efectosDefinitivo } from '@/lib/causa-srv';
import { firmaDelIntendente } from '@/lib/firma-srv';
import { check, handle, historial, must, nombreUsuario } from '@/lib/srv';

type Body = { uuid: string; accion: 'devolver' | 'firmar'; observacion?: string; valores?: Record<string, string>; html?: string; modo?: 'campos' | 'libre' };

/** Bandeja de la Directora: corrige, devuelve con observación o firma digitalmente (SF-39, SF-40). */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  return handle(req, async ({ user, db }) => {
    const { data } = await db.from('documento').select('*').eq('uuid', body.uuid).maybeSingle();
    const doc = must(data as Record<string, unknown> | null, 404);
    check(['en_revision', 'borrador', 'devuelto'].includes(String(doc.estado)), 'El escrito ya fue firmado', 409);
    const quien = nombreUsuario(user);
    const modoAnterior = String(doc.modo_edicion ?? 'campos');
    const modo = body.modo === 'libre' || modoAnterior === 'libre' ? 'libre' : 'campos';
    const valores = body.valores ?? (() => { try { return JSON.parse(String(doc.valores_json ?? '{}')); } catch { return {}; } })();
    let html = String(doc.contenido_html ?? '');
    if (modo === 'libre') html = body.html != null ? body.html : aplicarValores(html, valores);
    await db.from('documento').update({ contenido_html: html, valores_json: JSON.stringify(valores), modo_edicion: modo, date_updated: Date.now() }).eq('id', doc.id as number);
    if (modo === 'libre' && modoAnterior !== 'libre') await historial(db, Number(doc.infraccion_id), quien, 'Edición libre del escrito', `${doc.titulo}: la Directora habilitó la edición de todo el texto.`);

    if (body.accion === 'devolver') {
      check(body.observacion?.trim(), 'Escriba la observación');
      await db.from('documento').update({ estado: 'devuelto', observacion: body.observacion!.trim() }).eq('id', doc.id as number);
      await historial(db, Number(doc.infraccion_id), quien, 'Escrito devuelto con observación', `${doc.titulo}: ${body.observacion}`);
      return { ok: true };
    }
    const final = modo === 'campos' ? aplicarValores(html, valores) : html;
    const pend = modo === 'campos' ? faltantes(html, valores) : [];
    check(!pend.length && !quedanMarcadores(final), `Faltan completar campos: ${pend.map((c) => c.label).join(', ') || 'revise los [Completar:...] del texto'}`);
    await db.from('documento').update({ contenido_html: final }).eq('id', doc.id as number);
    // Fallos y resoluciones: la Dirección los aprueba y los firma el Intendente (decisión 22/10).
    const { data: pl } = await db.from('plantilla').select('categoria').eq('id', Number(doc.plantilla_id)).maybeSingle();
    if (await firmaDelIntendente(db, (pl as { categoria?: string } | null)?.categoria)) {
      await db.from('documento').update({ estado: 'para_firma', observacion: null, date_updated: Date.now() }).eq('id', doc.id as number);
      await historial(db, Number(doc.infraccion_id), quien, 'Escrito aprobado: pasa a la firma del Intendente', String(doc.titulo));
      return { paraFirma: true };
    }
    return efectosDefinitivo(db, user, body.uuid, true);
  }, 'firmar');
}

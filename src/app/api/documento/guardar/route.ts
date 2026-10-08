import { NextRequest } from 'next/server';
import { aplicarValores, faltantes, quedanMarcadores } from '@/lib/campos';
import { efectosDefinitivo } from '@/lib/causa-srv';
import { puede } from '@/lib/dominio';
import { check, handle, historial, must, nombreUsuario } from '@/lib/srv';

type Body = {
  uuid: string;
  accion: 'guardar' | 'revision' | 'definitivo';
  modo?: 'campos' | 'libre';
  valores?: Record<string, string>;
  html?: string; // solo en modo libre
};

/**
 * Guardado del escrito. Por defecto (modo «campos») el texto de la plantilla queda bloqueado
 * y solo se cargan los campos [Completar:...]. Quien redacta puede pasar a «libre» para editar
 * todo el texto de ese escrito; queda constancia en el historial. Nunca modifica la plantilla.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  return handle(req, async ({ user, db }) => {
    const { data } = await db.from('documento').select('*, plantilla(requiere_revision)').eq('uuid', body.uuid).maybeSingle();
    const doc = must(data as (Record<string, unknown> & { plantilla: { requiere_revision: number } | null }) | null, 404);
    check(['borrador', 'devuelto', 'en_revision'].includes(String(doc.estado)), 'El escrito ya es definitivo: no se puede modificar', 409);
    check(doc.estado !== 'en_revision' || puede(user.rol, 'firmar'), 'El escrito está en revisión de la Directora', 409);
    const quien = nombreUsuario(user);
    const modoAnterior = String(doc.modo_edicion ?? 'campos');
    const modo = body.modo === 'libre' || modoAnterior === 'libre' ? 'libre' : 'campos';
    const valores = body.valores ?? (() => { try { return JSON.parse(String(doc.valores_json ?? '{}')); } catch { return {}; } })();
    let html = String(doc.contenido_html ?? '');
    if (modo === 'libre') {
      // Al pasar a libre se vuelcan los valores cargados al texto; desde ahí se edita todo.
      html = body.html != null ? body.html : aplicarValores(html, valores);
    }
    await db.from('documento').update({ contenido_html: html, valores_json: JSON.stringify(valores), modo_edicion: modo, date_updated: Date.now() }).eq('id', doc.id as number);
    if (modo === 'libre' && modoAnterior !== 'libre') {
      await historial(db, Number(doc.infraccion_id), quien, 'Edición libre del escrito', `${doc.titulo}: se habilitó la edición de todo el texto para este escrito (la plantilla no cambia).`);
    }

    if (body.accion === 'guardar') return { ok: true, modo };

    const final = modo === 'campos' ? aplicarValores(html, valores) : html;
    const pendientes = modo === 'campos' ? faltantes(html, valores) : [];
    check(!pendientes.length && !quedanMarcadores(final), `Faltan completar campos: ${pendientes.map((c) => c.label).join(', ') || 'revise los [Completar:...] del texto'}`);

    if (body.accion === 'revision') {
      await db.from('documento').update({ estado: 'en_revision', observacion: null }).eq('id', doc.id as number);
      await historial(db, Number(doc.infraccion_id), quien, 'Escrito enviado a revisión', String(doc.titulo));
      return { ok: true, modo };
    }
    check(Number(doc.plantilla?.requiere_revision ?? 0) !== 1 || puede(user.rol, 'firmar'), 'Este escrito requiere revisión y firma de la Directora');
    await db.from('documento').update({ contenido_html: final }).eq('id', doc.id as number);
    return efectosDefinitivo(db, user, body.uuid, false);
  }, 'redactarEscritos');
}

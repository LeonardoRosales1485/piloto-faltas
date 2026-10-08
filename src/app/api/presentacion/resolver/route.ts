import { NextRequest } from 'next/server';
import { camposCompletar, faltantes } from '@/lib/campos';
import { emitirBoletas, generarEscrito, efectosDefinitivo } from '@/lib/causa-srv';
import { esContravencional } from '@/lib/dominio';
import { cambiarEstado, causaPorId, check, enviarCorreo, handle, historial, nombreUsuario } from '@/lib/srv';

type Body = { uuid: string; accion: 'aceptar' | 'rechazar' | 'observar'; respuesta?: string; cuotas?: number };

const NOMBRE: Record<string, string> = { pago_voluntario: 'pago voluntario', boleta: 'boleta de pago', cuotas: 'plan de cuotas', descargo: 'descargo', apelacion: 'apelación' };

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  return handle(req, async ({ user, db }) => {
    const { data } = await db.from('presentacion').select('*, ciudadano(email, nombre, apellido, razon_social)').eq('uuid', body.uuid).maybeSingle();
    check(data, 'Presentación inexistente', 404);
    const p = data as Record<string, unknown> & { ciudadano: { email: string; nombre: string; apellido: string; razon_social: string } | null };
    check(p.estado === 'pendiente', 'La presentación ya fue resuelta', 409);
    const c = await causaPorId(db, Number(p.infraccion_id));
    const quien = nombreUsuario(user);
    const tipo = String(p.tipo);
    const respuesta = (body.respuesta ?? '').trim();
    check(body.accion === 'aceptar' || respuesta, 'Escriba la respuesta para el infractor');
    if (body.accion === 'observar') check(tipo === 'descargo' && !p.reenvio_de, 'Solo se observa un descargo, y por única vez');

    const aNombre = p.ciudadano ? (p.ciudadano.razon_social || `${p.ciudadano.nombre} ${p.ciudadano.apellido}`) : String(c.infractor_razon_social || c.infractor_nombre || '');
    if (body.accion === 'aceptar') {
      if (tipo === 'pago_voluntario' || tipo === 'boleta' || tipo === 'cuotas') {
        const modo = tipo === 'pago_voluntario' ? 'voluntario' : tipo === 'cuotas' ? 'cuotas' : 'total';
        const cuotas = tipo === 'cuotas' ? Number(body.cuotas ?? p.cuotas_solicitadas ?? 1) : 1;
        const emision = await emitirBoletas(db, c, modo, cuotas, aNombre, quien);
        // Compromiso de pago desde plantilla, a nombre de quien firma (SF-52, SF-53)
        const codigo = esContravencional(c.infraccion_tipo_nombre)
          ? (c.estado_faltas === 'Fallo notificado' ? 'COMPROMISO_FALLO_CONTRAVENCION' : 'COMPROMISO_CONTRAVENCION_PV')
          : (tipo === 'pago_voluntario' ? 'COMPROMISO_TRANSITO_INFRACTOR_PV' : 'COMPROMISO_FALLO_TRANSITO');
        const { data: pl } = await db.from('plantilla').select('id').eq('codigo', codigo).maybeSingle();
        if (pl) {
          const g = await generarEscrito(db, user, c, (pl as { id: number }).id);
          // Prellena los campos conocidos del compromiso; si queda alguno sin dato, queda en borrador para el agente.
          const { data: dd } = await db.from('documento').select('id, contenido_html').eq('uuid', g.uuid).single();
          const html = String((dd as { contenido_html: string }).contenido_html);
          const { data: fallo } = await db.from('documento').select('numero, fecha_numero, plantilla!inner(codigo)').eq('infraccion_id', c.id).eq('plantilla.codigo', 'FALLO_CONDENATORIO').not('numero', 'is', null).maybeSingle();
          const f = fallo as { numero: string; fecha_numero: number } | null;
          const valores: Record<string, string> = {};
          for (const campo of camposCompletar(html)) {
            const l = campo.label.toLowerCase();
            if (campo.tipo === 'moneda' && /estad/.test(l)) valores[campo.k] = '0';
            else if (campo.tipo === 'moneda' && /acarreo/.test(l)) valores[campo.k] = String(emision.detalle.acarreo);
            else if (campo.tipo === 'moneda') valores[campo.k] = String(emision.detalle.multa);
            else if (/cuotas/.test(l)) valores[campo.k] = String(emision.cuotas);
            else if (/d[ií]as h[aá]biles/.test(l)) valores[campo.k] = '10';
            else if (/n° de fallo/.test(l) && f) valores[campo.k] = f.numero;
            else if (campo.tipo === 'fecha' && f) valores[campo.k] = new Date(f.fecha_numero).toISOString().slice(0, 10);
          }
          await db.from('documento').update({ valores_json: JSON.stringify(valores) }).eq('id', (dd as { id: number }).id);
          if (!faltantes(html, valores).length) {
            const { aplicarValores } = await import('@/lib/campos');
            await db.from('documento').update({ contenido_html: aplicarValores(html, valores) }).eq('id', (dd as { id: number }).id);
            await efectosDefinitivo(db, user, g.uuid, false);
          } else {
            await historial(db, c.id, quien, 'Compromiso de pago en borrador', 'Complete los campos que faltan en el escrito y déjelo definitivo.');
          }
        }
        await db.from('presentacion').update({ cuotas_otorgadas: tipo === 'cuotas' ? cuotas : null }).eq('id', p.id as number);
      } else if (tipo === 'descargo') {
        await cambiarEstado(db, c, 'Descargo', quien, 'Descargo aceptado', 'Pasa a la bandeja para fallo.');
      } else if (tipo === 'apelacion') {
        await cambiarEstado(db, c, 'En Juzgado', quien, 'Apelación concedida', 'Se remite el legajo completo en PDF al Juzgado de Paz.');
      }
    } else if (body.accion === 'observar') {
      await cambiarEstado(db, c, 'Causa observada', quien, 'Descargo observado', respuesta);
    } else {
      await historial(db, c.id, quien, `Solicitud de ${NOMBRE[tipo] ?? tipo} rechazada`, respuesta);
    }
    await db.from('presentacion').update({ estado: body.accion === 'aceptar' ? 'aceptada' : body.accion === 'observar' ? 'observada' : 'rechazada', respuesta: respuesta || 'Aceptada', resuelta_por: quien, resuelta_at: Date.now() }).eq('id', p.id as number);
    if (p.ciudadano?.email) {
      await enviarCorreo(db, p.ciudadano.email, `Respuesta a su ${NOMBRE[tipo] ?? 'presentación'} · Acta ${c.legajo_numero_acta}`, `${body.accion === 'aceptar' ? 'Su solicitud fue aceptada.' : body.accion === 'observar' ? 'Su descargo fue observado. Puede reenviarlo una única vez desde el portal.' : 'Su solicitud fue rechazada.'} ${respuesta}${body.accion === 'aceptar' && tipo !== 'descargo' && tipo !== 'apelacion' ? ' La boleta está disponible en el portal.' : ''}`, c.id);
    }
    return { ok: true };
  }, 'gestionarCausas');
}

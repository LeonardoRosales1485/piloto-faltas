import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { check, enviarCorreo, handlePublic, uuid } from '@/lib/srv';
import { normalizarDocumento } from '@/lib/dominio';

/** Registro de persona física (Anexo III) o jurídica, con validación de correo por código (PI-03, PI-04). */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as Record<string, string>;
  return handlePublic(async ({ db }) => {
    const email = String(b.email ?? '').trim().toLowerCase();
    check(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), 'Correo inválido');
    check(String(b.password ?? '').length >= 8, 'La contraseña debe tener al menos 8 caracteres');
    const juridica = b.tipoPersona === 'juridica';
    if (juridica) {
      check(b.razonSocial?.trim() && b.cuit?.trim() && b.tipoSocietario?.trim(), 'Complete tipo societario, CUIT y razón social');
    } else {
      check(b.nombre?.trim() && b.apellido?.trim() && b.documentoNumero?.trim(), 'Complete nombre, apellido y documento');
    }
    const { data: ya } = await db.from('ciudadano').select('id').eq('email', email).maybeSingle();
    check(!ya, 'Ya existe una cuenta con ese correo', 409);
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    await db.from('ciudadano').insert({
      uuid: uuid(), tipo_persona: juridica ? 'juridica' : 'fisica', nombre: b.nombre?.trim() || null, apellido: b.apellido?.trim() || null,
      documento_tipo: juridica ? 'CUIT' : (b.documentoTipo || 'DNI'), documento_numero: juridica ? null : normalizarDocumento(b.documentoNumero),
      razon_social: juridica ? b.razonSocial.trim() : null, tipo_societario: juridica ? b.tipoSocietario : null, cuit: juridica ? normalizarDocumento(b.cuit) : null,
      email, telefono: b.telefono?.trim() || null, domicilio: b.domicilio?.trim() || null, localidad: b.localidad?.trim() || null,
      password_hash: await bcrypt.hash(b.password, 10), email_verificado: 0, codigo_verificacion: codigo, date_created: Date.now(),
    });
    await enviarCorreo(db, email, 'Código de verificación · Portal de Faltas', `Su código de verificación es ${codigo}.`);
    // Piloto: el código se muestra en pantalla porque el correo es simulado.
    return { email, codigoPiloto: codigo };
  });
}

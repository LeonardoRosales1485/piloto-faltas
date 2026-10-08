# Sistema de Faltas · Piloto (Next.js + Supabase)

Una sola app Next.js 15 (App Router) que concentra la UI del piloto Angular y el contrato del backend Spring. Un `next build` publica pantallas y rutas `/api`; Postgres vive en Supabase. El login sigue siendo JWT local (`admin` / `operador` / `inspector`), **no** Supabase Auth.

## Requisitos

- Node.js 20+
- Proyecto Supabase (Postgres) ya creado
- Cuenta Vercel (para publicar)

## Variables de entorno

Copiá `.env.example` a `.env.local` y completá:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave **service_role** (bypasea RLS; solo servidor) |
| `JWT_SECRET` | Secreto HS256 para firmar tokens (mín. ~32 caracteres) |

En Vercel, cargá las mismas tres variables en Project Settings → Environment Variables.

## Base de datos

En el **SQL Editor** de Supabase, ejecutá en este orden (los tres son idempotentes):

1. [`sql/init.sql`](./sql/init.sql): tablas base y datos de ejemplo.
2. [`sql/002_piloto_v2.sql`](./sql/002_piloto_v2.sql): numeración T/C/S, estados del Anexo I, historial, escritos, portal de infractores, presentaciones, boletas, notificaciones, feriados, correo simulado y usuarios por rol.
3. [`sql/003_plantillas.sql`](./sql/003_plantillas.sql) y [`sql/004_plantillas_modelos.sql`](./sql/004_plantillas_modelos.sql): 44 plantillas de escritos (40 tomadas de los DOCX de la Dirección de Faltas y 4 modelos provisorios: resolución de medida, disposición de levantamiento y fallos).

Las tablas no usan RLS de cara al cliente: solo las API routes, con service role, las tocan.

### Usuarios de prueba

| Usuario | Contraseña | Rol |
|---|---|---|
| `inspector` | `inspector123` | Inspector: labra actas y ve solo las suyas |
| `operador` | `operador123` | Agente de Faltas |
| `directora` | `directora123` | Directora: revisa y firma escritos |
| `tributario` | `tributario123` | Usuario tributario: valores y tarifas |
| `becario` | `becario123` | Becario: consulta y redacta borradores |
| `admin` | `admin123` | Administrador funcional |

Portal de infractores: `/portal` · `valeria@example.com` / `ciudadano123` (DNI 30111222).

## Qué incluye el piloto (fase 1)

- **Labrado:** actas T, C y S con número y legajo automáticos, fecha y hora del sistema, GPS y ejido, situación del infractor (presente, ausente, se niega, NN), persona física o jurídica, medidas, alcoholemia, fotos, firma del infractor en pantalla y firma del inspector (simulada). Firmada, el acta es inmutable; un borrador se descarta dejando el número anulado.
- **Causa digital:** bandejas, historial, cambio de estado automático por escrito y manual con motivo, subsanación, desestimación, archivo, reingreso, derivación a Juzgado de Paz o Apremios.
- **Escritos:** plantillas con campos `[Acta:...]`, edición en hoja A4 dentro del sistema, revisión y firma de la Directora, numeración de resoluciones y fallos, PDF y DOCX.
- **Portal de infractores:** QR → verificación pública, registro con código, DD.JJ. de domicilio electrónico, consulta, notificación al abrir, pago voluntario / boleta / cuotas / descargo (con un reenvío) / apelación con las reglas de tránsito y contravención.
- **Pagos:** boletas (Malvinas 2000 simulado), «a verificar» → «definitivo», archivo por pago solo sin medida vigente.
- **Plazos:** 30 días corridos (tránsito), 15 corridos (contravención), 5 hábiles post fallo con feriados.

Simulado en el piloto: SSO, firma digital, correo (ver «Correos enviados»), Malvinas 2000. Fuera de la fase 1: notificación en persona (cédulas, Blue Mail, SUGIT), Depósito Vehicular, migración, funcionamiento sin señal.

## Desarrollo local

```bash
cd monorepo
npm install
# completar .env.local
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

## Publicar en Vercel

1. En Vercel → **Add New Project**, importá el repo.
2. **Root Directory**: `monorepo` (Importante: no apuntes a la raíz del repo padre si contiene también `frontend/` y `backend/`).
3. Framework: Next.js (detectado).
4. Cargá `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `JWT_SECRET`.
5. Deploy.

No hace falta crear un segundo servicio: las rutas `src/app/api` se despliegan con el mismo build.

## Arquitectura (resumen)

- UI: React 19 + Bootstrap (tokens del piloto) en rutas `/login` y `/private/...`
- API: `src/app/api/*` responde `{ data, status, message }`
- Auth: BCrypt en `usuario.password_hash` + JWT (`jose`) con subject = username
- Imágenes: data URLs en tabla `infraccion_imagen`, una por request

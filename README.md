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

## Base de datos (una vez)

1. Abrí el **SQL Editor** de Supabase.
2. Pegá y ejecutá el contenido de [`sql/init.sql`](./sql/init.sql).
3. Eso crea tablas (`usuario`, `catalogo`, `ley`, `infraccion`, …) y el seed (usuarios, leyes, catálogos, finanzas, infracciones de ejemplo).

Las tablas no usan RLS de cara al cliente: solo las API routes, con service role, las tocan.

### Usuarios de prueba

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | Administrador |
| `operador` | `operador123` | Usuario |
| `inspector` | `inspector123` | Inspector |

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

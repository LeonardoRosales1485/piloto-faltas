// Publica el APK del POS como actualización en Supabase Storage (bucket público «pos-app»).
// Deja solo la versión actual y la anterior, y escribe version.json, que la app consulta al iniciar.
//
// Uso: node pos-app/publicar.mjs <ruta-al-apk> <build> [forzar]
// «forzar»: la actualización es obligatoria (la app no muestra «Ahora no»). Funciona con las apps ya instaladas:
// marcan obligatoria toda versión cuyo build sea menor al de «anterior», así que se publica anterior = esta misma.
// Credenciales: NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY,
// del entorno o del .env.local de la raíz del repo.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUCKET = 'pos-app';
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

function env() {
  const e = { ...process.env };
  const f = join(raiz, '.env.local');
  if (existsSync(f)) {
    for (const l of readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !e[m[1]]) e[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return e;
}

const [, , apk, buildTxt, modo] = process.argv;
const forzar = modo === 'forzar';
const build = Number(buildTxt);
if (!apk || !existsSync(apk) || !Number.isInteger(build) || build <= 0) {
  console.error('Uso: node pos-app/publicar.mjs <ruta-al-apk> <build>');
  process.exit(1);
}
const e = env();
const url = (e.SUPABASE_URL || e.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const key = e.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const h = { apikey: key, Authorization: `Bearer ${key}` };
const api = (p) => `${url}/storage/v1/${p}`;
const publico = (n) => `${url}/storage/v1/object/public/${BUCKET}/${n}`;

async function pedir(metodo, p, body, extra = {}) {
  const r = await fetch(api(p), { method: metodo, headers: { ...h, ...extra }, body });
  const t = await r.text();
  if (!r.ok) throw new Error(`${metodo} ${p}: ${r.status} ${t}`);
  try { return JSON.parse(t); } catch { return t; }
}

// 1) Bucket público (se crea la primera vez)
try {
  await pedir('POST', 'bucket', JSON.stringify({ id: BUCKET, name: BUCKET, public: true }), { 'Content-Type': 'application/json' });
  console.log(`Bucket «${BUCKET}» creado.`);
} catch (err) {
  if (!/already exists|Duplicate|409/i.test(String(err))) throw err;
}

// 2) Versión anterior (la que estaba publicada como actual)
let previa = null;
try {
  const r = await fetch(`${publico('version.json')}?t=${Date.now()}`, { cache: 'no-store' });
  if (r.ok) { const v = await r.json(); if (v?.build && v.build !== build) previa = { build: v.build, url: v.url }; }
  else console.log(`version.json no se pudo leer (${r.status}): se publica como primera versión.`);
} catch { /* primera publicación */ }
if (previa && previa.build > build) {
  console.error(`Ya está publicada la versión ${previa.build}, más nueva que ${build}. No se publica.`);
  process.exit(1);
}

// 3) Subir el APK nuevo
const nombre = `faltas-pos-${build}.apk`;
// Subida por partes (protocolo TUS de Supabase, trozos de 6 MB) con reintentos por trozo: la subida en un solo
// pedido de ~20 MB se cortaba («fetch failed · other side closed») y no quedaba nada publicado.
const TROZO = 6 * 1024 * 1024;
const b64 = (t) => Buffer.from(t).toString('base64');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function conReintentos(que, fn, intentos = 4) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (err) {
      if (i >= intentos) throw new Error(`${que}: ${err?.cause?.message ?? err?.message ?? err}`);
      console.log(`  ${que} falló (${err?.cause?.message ?? err?.message ?? err}); reintento ${i}/${intentos - 1} ...`);
      await espera(2000 * i);
    }
  }
}

async function subirPorPartes(objeto, datos, tipo) {
  const tus = { ...h, 'Tus-Resumable': '1.0.0' };
  const crear = await conReintentos('Inicio de la subida', async () => {
    const r = await fetch(`${url}/storage/v1/upload/resumable`, {
      method: 'POST',
      headers: {
        ...tus, 'x-upsert': 'true', 'Upload-Length': String(datos.length),
        'Upload-Metadata': `bucketName ${b64(BUCKET)},objectName ${b64(objeto)},contentType ${b64(tipo)},cacheControl ${b64('31536000')}`,
      },
    });
    if (r.status !== 201) throw new Error(`HTTP ${r.status} ${await r.text()}`);
    return r;
  });
  const loc = crear.headers.get('location');
  if (!loc) throw new Error('Supabase no devolvió la dirección de la subida');
  const destino = loc.startsWith('http') ? loc : `${url}${loc}`;
  for (let off = 0; off < datos.length; ) {
    const parte = datos.subarray(off, Math.min(off + TROZO, datos.length));
    off = await conReintentos(`Parte ${Math.floor(off / TROZO) + 1}`, async () => {
      // Antes de reintentar se pregunta dónde quedó (la parte pudo haber llegado aunque se cortó la respuesta).
      const head = await fetch(destino, { method: 'HEAD', headers: tus });
      const actual = Number(head.headers.get('upload-offset') ?? off);
      if (actual > off) return actual;
      const r = await fetch(destino, { method: 'PATCH', headers: { ...tus, 'Upload-Offset': String(off), 'Content-Type': 'application/offset+octet-stream' }, body: parte });
      if (r.status !== 204) throw new Error(`HTTP ${r.status} ${await r.text()}`);
      return Number(r.headers.get('upload-offset') ?? off + parte.length);
    });
    process.stdout.write(`  ${Math.round((off / datos.length) * 100)} %\r`);
  }
  console.log('  100 %');
}

console.log(`Subiendo ${nombre} (${(statSync(apk).size / 1048576).toFixed(1)} MB) ...`);
await subirPorPartes(nombre, readFileSync(apk), 'application/vnd.android.package-archive');

// 4) version.json (sin caché, para que la app vea el cambio enseguida)
const version = { build, url: publico(nombre), anterior: forzar ? { build, url: publico(nombre) } : previa, previa, obligatoria: forzar, publicada: new Date().toISOString() };
await conReintentos('version.json', () => pedir('POST', `object/${BUCKET}/version.json`, JSON.stringify(version, null, 2), { 'Content-Type': 'application/json', 'x-upsert': 'true', 'cache-control': 'no-cache' }));

// 5) Borrar los APK que no sean la versión actual ni la anterior
const lista = await pedir('POST', `object/list/${BUCKET}`, JSON.stringify({ prefix: '', limit: 1000 }), { 'Content-Type': 'application/json' });
const conservar = new Set([nombre, previa ? `faltas-pos-${previa.build}.apk` : '']);
const borrar = (lista ?? []).map((o) => o.name).filter((n) => /^faltas-pos-\d+\.apk$/.test(n) && !conservar.has(n));
if (borrar.length) {
  await pedir('DELETE', `object/${BUCKET}`, JSON.stringify({ prefixes: borrar }), { 'Content-Type': 'application/json' });
  console.log(`Borradas versiones viejas: ${borrar.join(', ')}`);
}

console.log(`Publicada la versión ${build}${previa ? ` (anterior: ${previa.build})` : ''}${forzar ? ' · OBLIGATORIA para todos los POS' : ''}.`);
console.log(publico('version.json'));

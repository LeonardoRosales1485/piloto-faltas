import { NextRequest } from 'next/server';
import { handle } from '@/lib/srv';

/**
 * Seguimiento GPS (DUMMY del piloto): la posición y el recorrido de cada inspector se simulan alrededor de
 * Los Polvorines. Las actas labradas en la fecha sí son reales (lat/lng tomados en el labrado).
 */
const CENTRO = { lat: -34.502, lng: -58.697 };

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Math.abs(h);
}

function recorrido(semilla: string, desde: number, hasta: number) {
  const h = hash(semilla);
  const radio = 0.008 + (h % 7) * 0.0015;
  const fase = (h % 360) * (Math.PI / 180);
  const cx = CENTRO.lat + ((h % 13) - 6) * 0.002;
  const cy = CENTRO.lng + ((h % 17) - 8) * 0.002;
  const pts: { lat: number; lng: number; t: number }[] = [];
  for (let t = desde; t <= hasta; t += 5 * 60000) {
    const a = fase + ((t - desde) / 3600000) * 1.1;
    pts.push({ lat: cx + Math.sin(a) * radio + Math.sin(a * 3.1) * 0.0012, lng: cy + Math.cos(a) * radio * 1.2 + Math.cos(a * 2.3) * 0.0012, t });
  }
  return pts;
}

export async function GET(req: NextRequest) {
  const fecha = req.nextUrl.searchParams.get('fecha') || new Date().toISOString().slice(0, 10);
  return handle(req, async ({ db }) => {
    const inicio = new Date(`${fecha}T08:00:00`).getTime();
    const fin = Math.min(new Date(`${fecha}T18:00:00`).getTime(), Date.now());
    const { data: insp } = await db.from('usuario').select('username, nombre, apellido, legajo, sector, terminal, activo').eq('rol', 'Inspector').eq('activo', true).order('apellido');
    const { data: actas } = await db.from('infraccion').select('uuid, legajo_numero_acta, inspector_username, gps_lat, gps_lng, firmada_at, domicilio_infraccion_calle, domicilio_infraccion_numero, infraccion_tipo_nombre')
      .gte('firmada_at', new Date(`${fecha}T00:00:00`).getTime()).lte('firmada_at', new Date(`${fecha}T23:59:59`).getTime()).not('gps_lat', 'is', null);
    return {
      fecha,
      simulado: true,
      inspectores: ((insp ?? []) as Record<string, string>[]).map((i) => {
        const pts = fin > inicio ? recorrido(`${i.username}-${fecha}`, inicio, fin) : [];
        return { ...i, enLinea: Boolean(i.terminal) && fin > inicio && Date.now() - fin < 3600000, recorrido: pts, ultima: pts[pts.length - 1] ?? null };
      }),
      actas: actas ?? [],
    };
  }, 'seguimientoGps');
}

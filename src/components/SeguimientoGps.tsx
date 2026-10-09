'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { http } from '@/lib/api-client';
import { useCarga } from '@/lib/use-carga';
import { LoaderLogo } from './LoaderLogo';

type Punto = { lat: number; lng: number; t: number };
type Insp = { username: string; nombre: string; apellido: string; legajo: string; sector: string; terminal: string | null; enLinea: boolean; recorrido: Punto[]; ultima: Punto | null };
type Resp = { fecha: string; simulado: boolean; inspectores: Insp[]; actas: any[] };

const COLORES = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#ca8a04'];
const hora = (t: number) => new Date(t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

/** Carga Leaflet desde el CDN una sola vez. */
function cargarLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  return new Promise((ok, mal) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => ok(w.L);
    s.onerror = mal;
    document.head.appendChild(s);
  });
}

/** Seguimiento GPS de inspectores (módulo DUMMY del piloto: posiciones simuladas). */
export function SeguimientoGps() {
  const sp = useSearchParams();
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [vista, setVista] = useState<'actual' | 'recorrido'>('actual');
  const [sel, setSel] = useState<string>(sp.get('inspector') ?? '');
  const [d, setD] = useState<Resp | null>(null);
  const [cargando, seguir] = useCarga();
  const [sinMapa, setSinMapa] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<any>(null);
  const capa = useRef<any>(null);

  const cargar = useCallback(() => { void seguir(http.get<Resp>(`/api/gps?fecha=${fecha}`).then(setD)); }, [fecha, seguir]);
  useEffect(cargar, [cargar]);
  useEffect(() => { const t = setInterval(cargar, 60000); return () => clearInterval(t); }, [cargar]);

  useEffect(() => {
    if (!caja.current || mapa.current) return;
    cargarLeaflet().then((L) => {
      if (!caja.current || mapa.current) return;
      mapa.current = L.map(caja.current, { zoomControl: true }).setView([-34.502, -58.697], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa.current);
      capa.current = L.layerGroup().addTo(mapa.current);
      setD((x) => (x ? { ...x } : x));
    }).catch(() => setSinMapa(true));
    return () => { mapa.current?.remove(); mapa.current = null; };
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !capa.current || !d) return;
    capa.current.clearLayers();
    const visibles = d.inspectores.filter((i) => !sel || i.username === sel);
    const limites: [number, number][] = [];
    visibles.forEach((i) => {
      const c = COLORES[d.inspectores.indexOf(i) % COLORES.length];
      if (vista === 'recorrido' && i.recorrido.length) {
        L.polyline(i.recorrido.map((p) => [p.lat, p.lng]), { color: c, weight: 4, opacity: 0.75 }).addTo(capa.current);
        const p0 = i.recorrido[0];
        L.circleMarker([p0.lat, p0.lng], { radius: 5, color: c, fillColor: '#fff', fillOpacity: 1 }).bindTooltip(`Inicio ${hora(p0.t)}`).addTo(capa.current);
        i.recorrido.forEach((p) => limites.push([p.lat, p.lng]));
      }
      if (i.ultima) {
        const icono = L.divIcon({ className: '', html: `<div class="gps-pin" style="--c:${c}">${(i.nombre[0] ?? '') + (i.apellido[0] ?? '')}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
        L.marker([i.ultima.lat, i.ultima.lng], { icon: icono })
          .bindPopup(`<strong>${i.nombre} ${i.apellido}</strong><br/>Legajo ${i.legajo ?? '-'} · ${i.terminal ?? 'sin terminal'}<br/>Última posición: ${hora(i.ultima.t)}`)
          .addTo(capa.current);
        limites.push([i.ultima.lat, i.ultima.lng]);
      }
    });
    d.actas.filter((a) => !sel || a.inspector_username === sel).forEach((a) => {
      L.circleMarker([Number(a.gps_lat), Number(a.gps_lng)], { radius: 7, color: '#111827', weight: 2, fillColor: '#facc15', fillOpacity: 0.95 })
        .bindPopup(`<strong>Acta ${a.legajo_numero_acta}</strong><br/>${a.domicilio_infraccion_calle ?? ''} ${a.domicilio_infraccion_numero ?? ''}<br/>Firmada ${hora(Number(a.firmada_at))}<br/><a href="/private/causa/${a.uuid}">Ver causa</a>`)
        .addTo(capa.current);
      limites.push([Number(a.gps_lat), Number(a.gps_lng)]);
    });
    if (limites.length) mapa.current.fitBounds(limites, { padding: [40, 40], maxZoom: 15 });
  }, [d, sel, vista]);

  return (
    <div className="pagina">
      <div className="aviso aviso-info"><i className="fa-solid fa-satellite-dish" aria-hidden="true" /> Módulo de demostración: las posiciones y recorridos de los inspectores son <strong>simulados</strong>. Las actas labradas en la fecha (en amarillo) sí son reales.</div>
      <div className="card-step mb-3"><div className="card-step-body">
        <div className="row g-2 align-items-end">
          <div className="col-6 col-md-3"><label className="form-label-v2" htmlFor="g-v">Tipo de vista</label>
            <select id="g-v" className="form-select" value={vista} onChange={(e) => setVista(e.target.value as 'actual' | 'recorrido')}><option value="actual">Ubicación actual</option><option value="recorrido">Recorrido del día</option></select></div>
          <div className="col-6 col-md-3"><label className="form-label-v2" htmlFor="g-f">Fecha</label><input id="g-f" type="date" className="form-control" value={fecha} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setFecha(e.target.value)} /></div>
          <div className="col-8 col-md-4"><label className="form-label-v2" htmlFor="g-i">Inspector</label>
            <select id="g-i" className="form-select" value={sel} onChange={(e) => setSel(e.target.value)}><option value="">Todos</option>{d?.inspectores.map((i) => <option key={i.username} value={i.username}>{i.nombre} {i.apellido}</option>)}</select></div>
          <div className="col-4 col-md-2"><button type="button" className="btn btn-outline-primary w-100" onClick={cargar}><i className="fa-solid fa-rotate" aria-hidden="true" /> Refrescar</button></div>
        </div>
      </div></div>

      <div className="gps-layout">
        <div className="card-step gps-mapa-card">
          {sinMapa && d ? <MapaEsquema d={d} sel={sel} vista={vista} /> : null}
          <div ref={caja} className="gps-mapa" aria-label="Mapa de seguimiento" style={sinMapa ? { display: 'none' } : undefined} />
          {cargando && !d ? <div className="gps-cargando"><LoaderLogo tam={56} /></div> : null}
        </div>
        <aside className="card-step gps-lista">
          <div className="card-step-header"><h2>Inspectores</h2><p>{d ? `${d.inspectores.filter((i) => i.enLinea).length} en línea · ${d.actas.length} actas en la fecha` : '…'}</p></div>
          <ul>
            {d?.inspectores.map((i, n) => (
              <li key={i.username}>
                <button type="button" className={sel === i.username ? 'activo' : ''} onClick={() => setSel(sel === i.username ? '' : i.username)}>
                  <span className="gps-dot" style={{ background: COLORES[n % COLORES.length] }} />
                  <span className="gps-nom"><strong>{i.nombre} {i.apellido}</strong><small>{i.terminal ?? 'Sin terminal'} · {i.ultima ? `visto ${hora(i.ultima.t)}` : 'sin datos en la fecha'}</small></span>
                  <span className={`gps-estado ${i.enLinea ? 'on' : 'off'}`}>{i.enLinea ? 'En línea' : 'Sin señal'}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

/** Mapa esquemático (SVG) para cuando no hay acceso al servidor de mapas. */
function MapaEsquema({ d, sel, vista }: { d: Resp; sel: string; vista: 'actual' | 'recorrido' }) {
  const W = 900, H = 560;
  const vis = d.inspectores.filter((i) => !sel || i.username === sel);
  const pts = [...vis.flatMap((i) => (vista === 'recorrido' ? i.recorrido : i.ultima ? [i.ultima] : [])), ...d.actas.map((a) => ({ lat: Number(a.gps_lat), lng: Number(a.gps_lng), t: 0 }))];
  const lat = pts.length ? [Math.min(...pts.map((p) => p.lat)), Math.max(...pts.map((p) => p.lat))] : [-34.52, -34.48];
  const lng = pts.length ? [Math.min(...pts.map((p) => p.lng)), Math.max(...pts.map((p) => p.lng))] : [-58.72, -58.67];
  const m = 0.006;
  const x = (v: number) => ((v - (lng[0] - m)) / (lng[1] - lng[0] + 2 * m)) * W;
  const y = (v: number) => H - ((v - (lat[0] - m)) / (lat[1] - lat[0] + 2 * m)) * H;
  return (
    <svg className="gps-mapa gps-esquema" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mapa esquemático">
      <rect width={W} height={H} fill="#eef2e6" />
      {Array.from({ length: 16 }, (_, i) => <line key={`v${i}`} x1={i * 60 + 20} y1={0} x2={i * 60 - 30} y2={H} stroke="#fff" strokeWidth={i % 4 === 0 ? 9 : 4} />)}
      {Array.from({ length: 10 }, (_, i) => <line key={`h${i}`} x1={0} y1={i * 60 + 25} x2={W} y2={i * 60 + 5} stroke="#fff" strokeWidth={i % 3 === 0 ? 9 : 4} />)}
      <path d={`M0 ${H * 0.75} C ${W * 0.3} ${H * 0.6}, ${W * 0.6} ${H * 0.85}, ${W} ${H * 0.55}`} stroke="#fcd34d" strokeWidth={12} fill="none" />
      <rect x={W * 0.62} y={H * 0.12} width={120} height={80} rx={10} fill="#c7e3b5" />
      {vis.map((i) => {
        const c = COLORES[d.inspectores.indexOf(i) % COLORES.length];
        return (
          <g key={i.username}>
            {vista === 'recorrido' && i.recorrido.length ? <polyline points={i.recorrido.map((p) => `${x(p.lng)},${y(p.lat)}`).join(' ')} fill="none" stroke={c} strokeWidth={4} opacity={0.8} /> : null}
            {i.ultima ? <g transform={`translate(${x(i.ultima.lng)},${y(i.ultima.lat)})`}><circle r={17} fill={c} stroke="#fff" strokeWidth={3} /><text textAnchor="middle" dy={4} fontSize={12} fontWeight={700} fill="#fff">{(i.nombre[0] ?? '') + (i.apellido[0] ?? '')}</text><title>{`${i.nombre} ${i.apellido} · ${hora(i.ultima.t)}`}</title></g> : null}
          </g>
        );
      })}
      {d.actas.filter((a) => !sel || a.inspector_username === sel).map((a) => <circle key={a.uuid} cx={x(Number(a.gps_lng))} cy={y(Number(a.gps_lat))} r={7} fill="#facc15" stroke="#111827" strokeWidth={2}><title>{`Acta ${a.legajo_numero_acta}`}</title></circle>)}
      <text x={12} y={H - 12} fontSize={12} fill="#6b7280">Mapa esquemático · sin conexión al servidor de mapas</text>
    </svg>
  );
}

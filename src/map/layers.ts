import type { ExpressionSpecification, GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import type { FeatureCollection, Point, Polygon } from 'geojson';
import type { Grid, PeatBoundary, PixelProps, ProvinceCode, Status, ViirsDetection } from '../types';

// Empat layer MapLibre (ui.html bagian 04): pixel-status, peat-boundary, clusters, viirs.

const HALF = 0.01; // setengah sel 0,02°

export interface MapData {
  grid: Grid;
  peat: PeatBoundary;
  viirs: ViirsDetection[];
}

export const EMPTY: MapData = {
  grid: { type: 'FeatureCollection', features: [] },
  peat: { type: 'FeatureCollection', features: [] },
  viirs: [],
};

// Aman sengaja nyaris transparan: peta harus tenang supaya AWAS langsung terlihat.
interface Palette { safe: string; safeOp: number; watch: string; awas: string; ink: string; halo: string; sat: string; hatch: string }
const PALETTE: Record<'light' | 'dark', Palette> = {
  light: { safe: '#3c6a4c', safeOp: 0.16, watch: '#f0c46a', awas: '#c2410c', ink: '#1b2520', halo: '#ffffff', sat: '#2c628c', hatch: '#7d887f' },
  dark: { safe: '#7fbf93', safeOp: 0.13, watch: '#e0a93e', awas: '#f26b2f', ink: '#e4ebe5', halo: '#121815', sat: '#7fb3dc', hatch: '#7d8b83' },
};

// ---------- konversi data ----------

function squares(grid: Grid): FeatureCollection<Polygon, PixelProps> {
  return {
    type: 'FeatureCollection',
    features: grid.features.map((f) => {
      const [x, y] = f.geometry.coordinates;
      return {
        type: 'Feature',
        properties: f.properties,
        geometry: { type: 'Polygon', coordinates: [[[x - HALF, y - HALF], [x + HALF, y - HALF], [x + HALF, y + HALF], [x - HALF, y + HALF], [x - HALF, y - HALF]]] },
      };
    }),
  };
}

function clusterBoxes(grid: Grid) {
  const boxes = new Map<string, { w: number; s: number; e: number; n: number; province: ProvinceCode }>();
  for (const f of grid.features) {
    const id = f.properties.cluster_id;
    if (!id) continue;
    const [x, y] = f.geometry.coordinates;
    const b = boxes.get(id) ?? { w: x, s: y, e: x, n: y, province: f.properties.province };
    boxes.set(id, { ...b, w: Math.min(b.w, x), s: Math.min(b.s, y), e: Math.max(b.e, x), n: Math.max(b.n, y) });
  }
  const pad = HALF + 0.006;
  const outlines: FeatureCollection<Polygon, { id: string; province: ProvinceCode }> = { type: 'FeatureCollection', features: [] };
  const labels: FeatureCollection<Point, { id: string; province: ProvinceCode }> = { type: 'FeatureCollection', features: [] };
  for (const [id, b] of boxes) {
    const w = b.w - pad, s = b.s - pad, e = b.e + pad, n = b.n + pad;
    outlines.features.push({ type: 'Feature', properties: { id, province: b.province }, geometry: { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] } });
    labels.features.push({ type: 'Feature', properties: { id, province: b.province }, geometry: { type: 'Point', coordinates: [(w + e) / 2, n] } });
  }
  return { outlines, labels };
}

function viirsPoints(dets: ViirsDetection[]): FeatureCollection<Point, { label: string }> {
  return {
    type: 'FeatureCollection',
    features: dets.map((d) => ({
      type: 'Feature',
      properties: { label: `${d.distance_km.toFixed(1)} km` },
      geometry: { type: 'Point', coordinates: [d.lon, d.lat] },
    })),
  };
}

// ---------- gambar (arsir + ikon status) ----------

function canvasImage(size: number, draw: (c: CanvasRenderingContext2D) => void): ImageData {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  draw(ctx);
  return ctx.getImageData(0, 0, size, size);
}

function addImages(map: MlMap, p: Palette) {
  const put = (name: string, img: ImageData, pixelRatio = 1) => {
    if (map.hasImage(name)) map.removeImage(name);
    map.addImage(name, img, { pixelRatio });
  };
  put('hatch', canvasImage(8, (c) => {
    c.strokeStyle = p.hatch; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-2, 10); c.lineTo(10, -2); c.moveTo(-2, 2); c.lineTo(2, -2); c.moveTo(6, 10); c.lineTo(10, 6); c.stroke();
  }));
  // AWAS: segitiga + tanda seru; WATCH: mata. Digambar 2× untuk layar tajam.
  put('ico-awas', canvasImage(40, (c) => {
    c.fillStyle = '#ffffff'; c.strokeStyle = p.awas; c.lineWidth = 3; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(20, 4); c.lineTo(37, 34); c.lineTo(3, 34); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = p.awas; c.fillRect(18.5, 14, 3, 11); c.fillRect(18.5, 27.5, 3, 3);
  }), 2);
  put('ico-watch', canvasImage(40, (c) => {
    c.fillStyle = '#ffffff'; c.strokeStyle = '#7a5200'; c.lineWidth = 2.6;
    c.beginPath(); c.arc(20, 20, 15, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(20, 20, 10, 6, 0, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#7a5200'; c.beginPath(); c.arc(20, 20, 3, 0, Math.PI * 2); c.fill();
  }), 2);
}

// ---------- pemasangan ----------

export const CLICKABLE = ['pixel-status', 'pixel-noobs'];

/** Pasang ulang semua sumber + layer (dipanggil tiap style.load, termasuk ganti tema). */
export function installLayers(map: MlMap, dark: boolean, data: MapData) {
  const p = PALETTE[dark ? 'dark' : 'light'];
  addImages(map, p);
  const { outlines, labels } = clusterBoxes(data.grid);

  map.addSource('pixels', { type: 'geojson', data: squares(data.grid) });
  map.addSource('pixel-pts', { type: 'geojson', data: data.grid });
  map.addSource('peat', { type: 'geojson', data: data.peat });
  map.addSource('clusters', { type: 'geojson', data: outlines });
  map.addSource('cluster-labels', { type: 'geojson', data: labels });
  map.addSource('viirs', { type: 'geojson', data: viirsPoints(data.viirs) });

  const color: ExpressionSpecification = ['match', ['get', 'status'], 'AWAS', p.awas, 'WATCH', p.watch, p.safe];
  const opacity: ExpressionSpecification = ['match', ['get', 'status'], 'AWAS', 0.95, 'WATCH', 0.8, p.safeOp];

  // Layer data di atas seluruh basemap: label kota tetap terbaca lewat Aman yang transparan,
  // tetapi tertutup oleh piksel AWAS.
  map.addLayer({
    id: 'pixel-status', type: 'fill', source: 'pixels',
    filter: ['!=', ['get', 'status'], 'NO_OBSERVATION'],
    paint: { 'fill-color': color, 'fill-opacity': opacity },
  });
  map.addLayer({
    id: 'pixel-noobs', type: 'fill', source: 'pixels',
    filter: ['==', ['get', 'status'], 'NO_OBSERVATION'],
    paint: { 'fill-pattern': 'hatch', 'fill-opacity': 0.7 },
  });
  map.addLayer({
    id: 'pixel-grid', type: 'line', source: 'pixels', minzoom: 9,
    paint: { 'line-color': p.ink, 'line-width': 0.4, 'line-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0, 11, 0.18] },
  });
  map.addLayer({
    id: 'pixel-glow', type: 'line', source: 'pixels',
    filter: ['==', ['get', 'status'], 'AWAS'],
    paint: { 'line-color': p.awas, 'line-width': 7, 'line-blur': 6, 'line-opacity': 0.55 },
  });
  map.addLayer({
    id: 'peat-boundary', type: 'line', source: 'peat',
    paint: { 'line-color': p.ink, 'line-width': 1, 'line-dasharray': [3, 2], 'line-opacity': 0.5 },
  });
  map.addLayer({
    id: 'clusters', type: 'line', source: 'clusters',
    paint: { 'line-color': p.ink, 'line-width': 1.8, 'line-dasharray': [2.5, 1.5] },
  });
  map.addLayer({
    id: 'clusters-selected', type: 'line', source: 'clusters',
    filter: ['==', ['get', 'id'], ''],
    paint: { 'line-color': p.sat, 'line-width': 4 },
  });
  map.addLayer({
    id: 'pixel-icons', type: 'symbol', source: 'pixel-pts', minzoom: 10,
    filter: ['in', ['get', 'status'], ['literal', ['AWAS', 'WATCH']]],
    layout: {
      'icon-image': ['match', ['get', 'status'], 'AWAS', 'ico-awas', 'ico-watch'],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.55, 13, 1],
      'icon-allow-overlap': true,
    },
  });
  map.addLayer({
    id: 'clusters-label', type: 'symbol', source: 'cluster-labels',
    layout: {
      'text-field': ['get', 'id'], 'text-font': ['Noto Sans Bold'], 'text-size': 12,
      'text-anchor': 'bottom', 'text-offset': [0, -0.4], 'text-allow-overlap': true, 'text-letter-spacing': 0.04,
    },
    paint: { 'text-color': p.ink, 'text-halo-color': p.halo, 'text-halo-width': 2 },
  });
  map.addLayer({
    id: 'viirs', type: 'circle', source: 'viirs', minzoom: 9,
    paint: { 'circle-radius': 5, 'circle-color': p.sat, 'circle-stroke-color': p.halo, 'circle-stroke-width': 1.5 },
  });
  map.addLayer({
    id: 'viirs-label', type: 'symbol', source: 'viirs', minzoom: 10,
    layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'left', 'text-offset': [0.8, 0] },
    paint: { 'text-color': p.sat, 'text-halo-color': p.halo, 'text-halo-width': 1.4 },
  });
}

export function updateSources(map: MlMap, data: MapData) {
  const src = (id: string) => map.getSource(id) as GeoJSONSource | undefined;
  const { outlines, labels } = clusterBoxes(data.grid);
  src('pixels')?.setData(squares(data.grid));
  src('pixel-pts')?.setData(data.grid);
  src('peat')?.setData(data.peat);
  src('clusters')?.setData(outlines);
  src('cluster-labels')?.setData(labels);
  src('viirs')?.setData(viirsPoints(data.viirs));
}

export function applyFilter(map: MlMap, statuses: Status[], province: ProvinceCode | '', selected: string | null) {
  const prov: ExpressionSpecification = province ? ['==', ['get', 'province'], province] : ['boolean', true];
  const st: ExpressionSpecification = ['in', ['get', 'status'], ['literal', statuses]];
  map.setFilter('pixel-status', ['all', ['!=', ['get', 'status'], 'NO_OBSERVATION'], st, prov]);
  map.setFilter('pixel-noobs', ['all', ['==', ['get', 'status'], 'NO_OBSERVATION'], st, prov]);
  map.setFilter('pixel-icons', ['all', ['in', ['get', 'status'], ['literal', ['AWAS', 'WATCH']]], st, prov]);
  map.setFilter('pixel-glow', ['all', ['==', ['get', 'status'], 'AWAS'], st, prov]);
  map.setFilter('pixel-grid', ['all', st, prov]);
  map.setFilter('clusters', prov);
  map.setFilter('clusters-label', prov);
  map.setFilter('clusters-selected', ['==', ['get', 'id'], selected ?? '']);
}

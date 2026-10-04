import type { ExpressionSpecification, GeoJSONSource, Map as MlMap, StyleSpecification } from 'maplibre-gl';
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import type { Basemap, PeatBoundary, PixelIndex, ProvinceBoundary, ProvinceCode, Status, ViirsDetection } from '../types';
import { STATUS_CODE, cellCenter, cellsBounds } from '../lib/grid';
import { PROVINCES } from '../lib/provinces';

// Layer peta. Geometri sel dibangun SEKALI dari indeks piksel; status per slot, filter status,
// dan sorotan memakai feature-state + ekspresi paint, jadi memutar slot tidak memicu re-tiling.

export type BasemapId = string; // 'peta' | 'polos' | id basemap raster dari API
export type LayerKey = 'status' | 'peat' | 'provinces' | 'clusters' | 'viirs';
export const LAYER_KEYS: LayerKey[] = ['status', 'clusters', 'peat', 'provinces', 'viirs'];

export interface MapData {
  index: PixelIndex | null;
  clusters: Record<string, number[]>;
  peat: PeatBoundary;
  provinces: ProvinceBoundary;
  viirs: ViirsDetection[];
}

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };
export const EMPTY: MapData = { index: null, clusters: {}, peat: EMPTY_FC, provinces: EMPTY_FC, viirs: [] };

const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const VECTOR = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

/** Gaya dasar: vektor OpenFreeMap, raster dari API, atau polos (tanpa tile sama sekali). */
export function styleFor(basemap: BasemapId, dark: boolean, list: Basemap[]): string | StyleSpecification {
  if (basemap === 'peta') return VECTOR[dark ? 'dark' : 'light'];
  const raster = list.find((b) => b.id === basemap);
  const style: StyleSpecification = {
    version: 8,
    glyphs: GLYPHS,
    sources: {},
    layers: [{ id: 'bg', type: 'background', paint: { 'background-color': dark ? '#121815' : '#eef1ec' } }],
  };
  if (raster) {
    style.sources.sat = { type: 'raster', tiles: raster.tiles, tileSize: raster.tile_size, maxzoom: raster.maxzoom, attribution: raster.attribution };
    style.layers.push({ id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-fade-duration': 0 } });
  }
  return style;
}

interface Palette { safe: string; safeOp: number; watch: string; awas: string; ink: string; halo: string; sat: string; hatch: string }
const PALETTE: Record<'light' | 'dark', Palette> = {
  light: { safe: '#3c6a4c', safeOp: 0.16, watch: '#f0c46a', awas: '#c2410c', ink: '#1b2520', halo: '#ffffff', sat: '#2c628c', hatch: '#7d887f' },
  dark: { safe: '#7fbf93', safeOp: 0.13, watch: '#e0a93e', awas: '#f26b2f', ink: '#e4ebe5', halo: '#121815', sat: '#7fb3dc', hatch: '#7d8b83' },
};
// Di atas citra satelit, Aman perlu sedikit lebih tegas.
const satSafeOp = 0.28;

// ---------- konversi data ----------

function cellPolygons(ix: PixelIndex | null): FeatureCollection<Polygon, { p: string }> {
  if (!ix) return EMPTY_FC as FeatureCollection<Polygon, { p: string }>;
  const h = ix.step / 2;
  const features: Feature<Polygon, { p: string }>[] = new Array(ix.rows.length);
  for (let i = 0; i < ix.rows.length; i++) {
    const [x, y] = cellCenter(ix, i);
    features[i] = {
      type: 'Feature', id: i, properties: { p: String(ix.province[i]) },
      geometry: { type: 'Polygon', coordinates: [[[x - h, y - h], [x + h, y - h], [x + h, y + h], [x - h, y + h], [x - h, y - h]]] },
    };
  }
  return { type: 'FeatureCollection', features };
}

function clusterShapes(ix: PixelIndex | null, clusters: Record<string, number[]>) {
  const outlines: FeatureCollection<Polygon, { id: string; p: string }> = { type: 'FeatureCollection', features: [] };
  const labels: FeatureCollection<Point, { id: string; p: string }> = { type: 'FeatureCollection', features: [] };
  if (!ix) return { outlines, labels };
  const pad = 0.006;
  for (const [id, cells] of Object.entries(clusters)) {
    if (!cells.length) continue;
    const [[w0, s0], [e0, n0]] = cellsBounds(ix, cells);
    const w = w0 - pad, s = s0 - pad, e = e0 + pad, n = n0 + pad;
    const p = String(ix.province[cells[0]]);
    outlines.features.push({ type: 'Feature', properties: { id, p }, geometry: { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] } });
    labels.features.push({ type: 'Feature', properties: { id, p }, geometry: { type: 'Point', coordinates: [(w + e) / 2, n] } });
  }
  return { outlines, labels };
}

/** Satu titik label per provinsi: pusat kotak poligon terbesarnya. Nama resmi dari kode BPS. */
function provinceLabels(fc: ProvinceBoundary): FeatureCollection<Point, { name: string }> {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f) => {
      let best = f.geometry.coordinates[0]?.[0] ?? [];
      for (const poly of f.geometry.coordinates) if (poly[0].length > best.length) best = poly[0];
      const xs = best.map((c) => c[0]), ys = best.map((c) => c[1]);
      const c: [number, number] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
      const name = PROVINCES[f.properties.code]?.id ?? f.properties.name;
      return { type: 'Feature' as const, properties: { name }, geometry: { type: 'Point' as const, coordinates: c } };
    }),
  };
}

function viirsPoints(dets: ViirsDetection[]): FeatureCollection<Point, { label: string }> {
  return {
    type: 'FeatureCollection',
    features: dets.map((d) => ({ type: 'Feature', properties: { label: `${d.distance_km.toFixed(1)} km` }, geometry: { type: 'Point', coordinates: [d.lon, d.lat] } })),
  };
}

export function selectionShape(ix: PixelIndex | null, cell: number): FeatureCollection<Polygon> {
  if (!ix || cell < 0) return EMPTY_FC as FeatureCollection<Polygon>;
  const [[w, s], [e, n]] = cellsBounds(ix, [cell]);
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] } }] };
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

// ---------- ekspresi ----------

const S: ExpressionSpecification = ['coalesce', ['feature-state', 's'], 'S'];
const shown = (statuses: Status[]): ExpressionSpecification => ['in', S, ['literal', statuses.map((s) => STATUS_CODE[s])]];

export interface PaintOpts { dark: boolean; satellite: boolean; statuses: Status[] }

function pixelPaint(o: PaintOpts) {
  const p = PALETTE[o.dark ? 'dark' : 'light'];
  const safeOp = o.satellite ? satSafeOp : p.safeOp;
  return {
    fillColor: ['match', S, 'A', p.awas, 'W', p.watch, p.safe] as ExpressionSpecification,
    fillOpacity: ['case', shown(o.statuses), ['match', S, 'A', 0.95, 'W', 0.82, 'N', 0, safeOp], 0] as ExpressionSpecification,
    hatchOpacity: ['case', ['all', ['==', S, 'N'], shown(o.statuses)], 0.75, 0] as ExpressionSpecification,
    awasIcon: ['case', ['all', ['==', S, 'A'], shown(o.statuses)], 1, 0] as ExpressionSpecification,
    watchIcon: ['case', ['all', ['==', S, 'W'], shown(o.statuses)], 1, 0] as ExpressionSpecification,
  };
}

/** Pasang semua sumber + layer (setiap style.load, termasuk ganti basemap/tema). */
export function installLayers(map: MlMap, o: PaintOpts, data: MapData, selectedCell: number) {
  const p = PALETTE[o.dark ? 'dark' : 'light'];
  addImages(map, p);
  const { outlines, labels } = clusterShapes(data.index, data.clusters);
  const pp = pixelPaint(o);

  map.addSource('provinces', { type: 'geojson', data: data.provinces });
  map.addSource('province-labels', { type: 'geojson', data: provinceLabels(data.provinces) });
  map.addSource('pixels', { type: 'geojson', data: cellPolygons(data.index), buffer: 0, tolerance: 0 });
  map.addSource('peat', { type: 'geojson', data: data.peat });
  map.addSource('clusters', { type: 'geojson', data: outlines });
  map.addSource('cluster-labels', { type: 'geojson', data: labels });
  map.addSource('selection', { type: 'geojson', data: selectionShape(data.index, selectedCell) });
  map.addSource('viirs', { type: 'geojson', data: viirsPoints(data.viirs) });

  map.addLayer({ id: 'provinces-line', type: 'line', source: 'provinces', paint: { 'line-color': p.ink, 'line-width': 1.1, 'line-opacity': 0.45 } });
  map.addLayer({ id: 'pixel-fill', type: 'fill', source: 'pixels', paint: { 'fill-color': pp.fillColor, 'fill-opacity': pp.fillOpacity } });
  map.addLayer({ id: 'pixel-hatch', type: 'fill', source: 'pixels', paint: { 'fill-pattern': 'hatch', 'fill-opacity': pp.hatchOpacity } });
  map.addLayer({
    id: 'pixel-grid', type: 'line', source: 'pixels', minzoom: 9,
    paint: { 'line-color': p.ink, 'line-width': 0.4, 'line-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0, 11, 0.16] },
  });
  map.addLayer({ id: 'peat-boundary', type: 'line', source: 'peat', paint: { 'line-color': p.ink, 'line-width': 1, 'line-dasharray': [3, 2], 'line-opacity': 0.5 } });
  map.addLayer({ id: 'cluster-glow', type: 'line', source: 'clusters', paint: { 'line-color': p.awas, 'line-width': 10, 'line-blur': 8, 'line-opacity': 0.6 } });
  map.addLayer({ id: 'clusters', type: 'line', source: 'clusters', paint: { 'line-color': p.ink, 'line-width': 1.8, 'line-dasharray': [2.5, 1.5] } });
  map.addLayer({ id: 'clusters-selected', type: 'line', source: 'clusters', filter: ['==', ['get', 'id'], ''], paint: { 'line-color': p.sat, 'line-width': 3.5 } });
  const icon = (id: string, image: string, opacity: ExpressionSpecification) => map.addLayer({
    id, type: 'symbol', source: 'pixels', minzoom: 10,
    layout: {
      'icon-image': image, 'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.55, 13, 1],
      'icon-allow-overlap': true, 'icon-ignore-placement': true,
    },
    paint: { 'icon-opacity': opacity },
  });
  icon('icon-watch', 'ico-watch', pp.watchIcon);
  icon('icon-awas', 'ico-awas', pp.awasIcon);
  map.addLayer({ id: 'selection', type: 'line', source: 'selection', paint: { 'line-color': p.sat, 'line-width': 3 } });
  map.addLayer({
    id: 'province-label', type: 'symbol', source: 'province-labels', maxzoom: 8,
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-transform': 'uppercase', 'text-letter-spacing': 0.12 },
    paint: { 'text-color': p.ink, 'text-opacity': 0.6, 'text-halo-color': p.halo, 'text-halo-width': 1.5 },
  });
  map.addLayer({
    id: 'clusters-label', type: 'symbol', source: 'cluster-labels',
    layout: {
      'text-field': ['get', 'id'], 'text-font': ['Noto Sans Bold'], 'text-size': 12,
      'text-anchor': 'bottom', 'text-offset': [0, -0.4], 'text-allow-overlap': true, 'text-letter-spacing': 0.04,
    },
    paint: { 'text-color': p.ink, 'text-halo-color': p.halo, 'text-halo-width': 2 },
  });
  map.addLayer({ id: 'viirs', type: 'circle', source: 'viirs', minzoom: 9, paint: { 'circle-radius': 5, 'circle-color': p.sat, 'circle-stroke-color': p.halo, 'circle-stroke-width': 1.5 } });
  map.addLayer({
    id: 'viirs-label', type: 'symbol', source: 'viirs', minzoom: 10,
    layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'left', 'text-offset': [0.8, 0] },
    paint: { 'text-color': p.sat, 'text-halo-color': p.halo, 'text-halo-width': 1.4 },
  });
}

export function setStatusPaint(map: MlMap, o: PaintOpts) {
  const pp = pixelPaint(o);
  map.setPaintProperty('pixel-fill', 'fill-opacity', pp.fillOpacity);
  map.setPaintProperty('pixel-hatch', 'fill-opacity', pp.hatchOpacity);
  map.setPaintProperty('icon-awas', 'icon-opacity', pp.awasIcon);
  map.setPaintProperty('icon-watch', 'icon-opacity', pp.watchIcon);
}

const LAYERS_OF: Record<LayerKey, string[]> = {
  status: ['pixel-fill', 'pixel-hatch', 'pixel-grid', 'icon-watch', 'icon-awas'],
  peat: ['peat-boundary'],
  provinces: ['provinces-line', 'province-label'],
  clusters: ['cluster-glow', 'clusters', 'clusters-selected', 'clusters-label'],
  viirs: ['viirs', 'viirs-label'],
};
const LITE_OFF = new Set(['pixel-grid', 'cluster-glow']);

export function applyVisibility(map: MlMap, vis: Record<LayerKey, boolean>, lite: boolean) {
  for (const k of LAYER_KEYS) {
    for (const id of LAYERS_OF[k]) {
      map.setLayoutProperty(id, 'visibility', vis[k] && !(lite && LITE_OFF.has(id)) ? 'visible' : 'none');
    }
  }
}

export function applyFilters(map: MlMap, province: ProvinceCode | '', selectedCluster: string | null) {
  const prov: ExpressionSpecification = province ? ['==', ['get', 'p'], province] : ['boolean', true];
  for (const id of ['pixel-fill', 'pixel-hatch', 'pixel-grid', 'icon-watch', 'icon-awas', 'cluster-glow', 'clusters', 'clusters-label']) {
    map.setFilter(id, prov);
  }
  map.setFilter('clusters-selected', ['==', ['get', 'id'], selectedCluster ?? '']);
}

export function updateSource(map: MlMap, id: string, data: GeoJSON.GeoJSON) {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
}

export const shapes = { cellPolygons, clusterShapes, provinceLabels, viirsPoints };

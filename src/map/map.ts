import { AttributionControl, Map as MlMap, NavigationControl, setWorkerUrl, type LngLatBoundsLike, type LngLatLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre 6 mencari worker di sebelah file modulnya; setelah dibundel Vite file itu tidak ada.
// Salinan mentahnya disajikan plugin maplibreWorker di vite.config.ts.
setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.mjs`);
import type { PixelProps, ProvinceCode, Status } from '../types';
import { KALIMANTAN } from '../lib/provinces';
import { CLICKABLE, EMPTY, applyFilter, installLayers, updateSources, type MapData } from './layers';

const STYLE = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

interface Handlers {
  onPixel(props: PixelProps, at: LngLatLike): void;
}

/** Pembungkus MapLibre: menyimpan data + filter agar bisa dipasang ulang setelah ganti tema. */
export class MapController {
  readonly map: MlMap;
  private dark: boolean;
  private data: MapData = EMPTY;
  private statuses: Status[] = ['SAFE', 'NO_OBSERVATION', 'WATCH', 'AWAS'];
  private province: ProvinceCode | '' = '';
  private selected: string | null = null;
  private ready = false;

  constructor(container: HTMLElement, dark: boolean, handlers: Handlers) {
    this.dark = dark;
    this.map = new MlMap({
      container,
      style: STYLE[dark ? 'dark' : 'light'],
      bounds: KALIMANTAN as LngLatBoundsLike,
      fitBoundsOptions: { padding: 24 },
      attributionControl: false,
    });
    this.map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    this.map.addControl(new AttributionControl({ compact: true }), 'bottom-right');

    this.map.on('style.load', () => {
      installLayers(this.map, this.dark, this.data);
      applyFilter(this.map, this.statuses, this.province, this.selected);
      this.ready = true;
    });

    for (const id of CLICKABLE) {
      this.map.on('click', id, (e) => {
        const f = e.features?.[0];
        if (f) handlers.onPixel(f.properties as PixelProps, e.lngLat);
      });
      this.map.on('mouseenter', id, () => { this.map.getCanvas().style.cursor = 'pointer'; });
      this.map.on('mouseleave', id, () => { this.map.getCanvas().style.cursor = ''; });
    }
  }

  setData(patch: Partial<MapData>) {
    this.data = { ...this.data, ...patch };
    if (this.ready) updateSources(this.map, this.data);
  }

  setFilter(statuses: Status[], province: ProvinceCode | '', selected: string | null) {
    this.statuses = statuses;
    this.province = province;
    this.selected = selected;
    if (this.ready) applyFilter(this.map, statuses, province, selected);
  }

  setDark(dark: boolean) {
    if (dark === this.dark) return;
    this.dark = dark;
    this.ready = false;
    this.map.setStyle(STYLE[dark ? 'dark' : 'light'], { diff: false });
  }

  fitBounds(b: LngLatBoundsLike) { this.map.fitBounds(b, { padding: 32, duration: 800 }); }
  flyTo(center: LngLatLike, zoom = 11.5) { this.map.flyTo({ center, zoom, duration: 1200, essential: true }); }
  resize() { this.map.resize(); }
  destroy() { this.map.remove(); }
}

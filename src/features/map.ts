import L from 'leaflet';
import type { SimResult } from '../physics/simulate';
import type { MonteCarloResult } from './montecarlo';

let map: L.Map;
let launchMarker: L.Marker | null   = null;
let landingMarker: L.Marker | null  = null;
let targetMarker: L.Marker | null   = null;
let pathLine: L.Polyline | null     = null;
let dangerCircle: L.Circle | null   = null;
let mcLayer: L.LayerGroup | null    = null;

const launchSvg  = `<div class="map-marker-pin launch"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`;
const landingSvg = `<div class="map-marker-pin landing"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>`;
const targetSvg  = `<div class="map-marker-pin target"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="6"/><line x1="12" x2="12" y1="18" y2="22"/></svg></div>`;

export function initMap(containerId: string, onMapClick?: (lat: number, lon: number) => void): L.Map {
  map = L.map(containerId, { zoomControl: true });

  // OSM base
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  });
  // Satellite (ESRI — no key)
  const sat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: '© Esri', maxZoom: 19 }
  );

  osm.addTo(map);
  L.control.layers({ 'Street Map': osm, 'Satellite': sat }).addTo(map);
  map.setView([32, 35], 5);

  if (onMapClick) {
    map.on('click', (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng));
  }

  return map;
}

export function updateMapFromResult(
  result: SimResult,
  launchLat: number, launchLon: number
): void {
  if (!map) return;

  // Launch marker
  if (launchMarker) launchMarker.remove();
  launchMarker = L.marker([launchLat, launchLon], {
    icon: L.divIcon({ className: 'map-launch-icon', html: launchSvg, iconSize: [32, 32], iconAnchor: [16, 32] }),
  }).addTo(map).bindPopup(`<b>Launch Point</b><br>${launchLat.toFixed(5)}°, ${launchLon.toFixed(5)}°`);

  // Landing marker
  if (landingMarker) landingMarker.remove();
  landingMarker = L.marker([result.nLat, result.nLon], {
    icon: L.divIcon({ className: 'map-landing-icon', html: landingSvg, iconSize: [32, 32], iconAnchor: [16, 16] }),
  }).addTo(map).bindPopup(
    `<b>Landing Point</b><br>${result.nLat.toFixed(5)}°, ${result.nLon.toFixed(5)}°<br>Distance: ${result.d.toFixed(1)} m`
  );

  // Trajectory polyline on the surface
  if (pathLine) pathLine.remove();
  pathLine = L.polyline([[launchLat, launchLon], [result.nLat, result.nLon]], {
    color: '#38bdf8', weight: 2, dashArray: '8 6', opacity: 0.85,
  }).addTo(map);

  // Danger zone
  if (dangerCircle) dangerCircle.remove();
  dangerCircle = L.circle([launchLat, launchLon], {
    radius: result.d, color: '#f43f5e', fill: true, fillOpacity: 0.06, weight: 1, dashArray: '4 4',
  }).addTo(map);

  map.fitBounds([[launchLat, launchLon], [result.nLat, result.nLon]], { padding: [50, 50] });
}

export function setLaunchPin(lat: number, lon: number): void {
  if (!map) return;
  if (launchMarker) launchMarker.remove();
  launchMarker = L.marker([lat, lon], {
    icon: L.divIcon({ className: 'map-launch-icon', html: launchSvg, iconSize: [32, 32], iconAnchor: [16, 32] }),
  }).addTo(map);
}

export function setTargetPin(lat: number, lon: number): void {
  if (!map) return;
  if (targetMarker) targetMarker.remove();
  targetMarker = L.marker([lat, lon], {
    draggable: true,
    icon: L.divIcon({ className: 'map-target-icon', html: targetSvg, iconSize: [32, 32], iconAnchor: [16, 16] }),
  }).addTo(map);
}

export function getTargetLatLon(): [number, number] | null {
  if (!targetMarker) return null;
  const ll = targetMarker.getLatLng();
  return [ll.lat, ll.lng];
}

export function renderMonteCarlo(mcResult: MonteCarloResult): void {
  if (!map) return;
  if (mcLayer) mcLayer.remove();
  mcLayer = L.layerGroup();

  // CEP circle
  L.circle([mcResult.meanLat, mcResult.meanLon], {
    radius: mcResult.cepRadius, color: '#eab308', fillOpacity: 0.08, weight: 1.5, dashArray: '5 3',
  }).addTo(mcLayer!);

  // Scatter dots (max 500 for performance)
  mcResult.landingPoints.slice(0, 500).forEach(p => {
    L.circleMarker([p.lat, p.lon], { radius: 2, color: '#eab308', fillOpacity: 0.5, weight: 0 }).addTo(mcLayer!);
  });

  mcLayer!.addTo(map);
}

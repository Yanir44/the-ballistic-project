import type { SimResult, TrajectoryPoint } from '../physics/simulate';
import { getTheme } from './theme';

/** Export full trajectory as CSV */
export function exportCsv(result: SimResult, filename = 'trajectory.csv'): void {
  const header = 't,x,y,z,vx,vy,vz,speed,drag,kineticJ,mach,dynPressure,gForce';
  const rows = result.trajectory.map((p: TrajectoryPoint) =>
    [p.t, p.x, p.y, p.z, p.vx, p.vy, p.vz, p.speed, p.drag, p.kineticJ, p.mach, p.dynPressure, p.gForce]
      .map(v => v.toFixed(4)).join(',')
  );
  const csv = [header, ...rows].join('\n');
  downloadText(csv, filename, 'text/csv');
}

/** Download a chart canvas as PNG */
export function exportPng(canvas: HTMLCanvasElement, filename = 'trajectory.png'): void {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  a.click();
}

/** Encode all current form params into the URL for sharing */
export function buildShareUrl(params: Record<string, string | number | boolean>): string {
  const base = new URL(window.location.href);
  base.search = '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) sp.set(k, String(v));
  base.search = sp.toString();
  return base.toString();
}

export async function copyShareUrl(params: Record<string, string | number | boolean>): Promise<void> {
  const url = buildShareUrl(params);
  await navigator.clipboard.writeText(url);
}

/** Generate QR code into a canvas element using the qrcode library */
export async function generateQr(text: string, canvas: HTMLCanvasElement): Promise<void> {
  const QRCode = (await import('qrcode')).default;
  const isDark = getTheme() === 'dark';
  await QRCode.toCanvas(canvas, text, {
    width: 180,
    color: {
      dark: isDark ? '#38bdf8' : '#0284c7',
      light: isDark ? '#0b0f19' : '#ffffff'
    }
  });
}

/** Print a nicely styled summary card */
export function printCard(result: SimResult): void {
  const win = window.open('', '_blank')!;
  const isDark = getTheme() === 'dark';
  const bg = isDark ? '#0b0f19' : '#ffffff';
  const fg = isDark ? '#f8fafc' : '#0f172a';
  const accent = isDark ? '#38bdf8' : '#0284c7';
  const headerBg = isDark ? '#111827' : '#f1f5f9';

  win.document.write(`
    <html><head><title>UBT-Calc Flight Report</title>
    <style>
      body { font-family: 'Outfit', sans-serif; background: ${bg}; color: ${fg}; padding: 2rem; }
      h1 { color: ${accent}; font-size: 1.5rem; margin-bottom: 1rem; } table { border-collapse: collapse; width: 100%; }
      td, th { padding: 10px 14px; border: 1px solid rgba(128,128,128,0.2); }
      th { background: ${headerBg}; color: ${accent}; text-align: left; }
    </style></head><body>
    <h1>UBT-Calc Flight Report</h1>
    <table>
      <tr><th>Parameter</th><th>Value</th></tr>
      <tr><td>Horizontal Distance</td><td>${result.d.toFixed(2)} m</td></tr>
      <tr><td>Flight Time</td><td>${result.t.toFixed(2)} s</td></tr>
      <tr><td>Terminal Speed</td><td>${result.vFinal.toFixed(2)} m/s</td></tr>
      <tr><td>Max Altitude</td><td>${result.maxAltitude.toFixed(2)} m</td></tr>
      <tr><td>Landing Lat / Lon</td><td>${result.nLat.toFixed(5)}°, ${result.nLon.toFixed(5)}°</td></tr>
    </table>
    </body></html>`);
  win.document.close();
  win.print();
}

function downloadText(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

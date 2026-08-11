import type { TrajectoryPoint } from '../physics/simulate';
import { getTheme } from './theme';

interface Vec3 { x: number; y: number; z: number; }

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let trajectory: TrajectoryPoint[] = [];

// Camera state
let rotX = 0.35, rotY = 0.5;
let isDragging = false;
let lastMX = 0, lastMY = 0;
let zoom = 1;

export function init3DViewer(c: HTMLCanvasElement): void {
  canvas = c;
  ctx = c.getContext('2d')!;

  canvas.addEventListener('mousedown', e => { isDragging = true; lastMX = e.clientX; lastMY = e.clientY; });
  canvas.addEventListener('mouseup',   () => { isDragging = false; });
  canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    rotY += (e.clientX - lastMX) * 0.008;
    rotX += (e.clientY - lastMY) * 0.008;
    lastMX = e.clientX; lastMY = e.clientY;
    draw3D();
  });
  canvas.addEventListener('wheel', e => { zoom *= e.deltaY > 0 ? 0.92 : 1.08; draw3D(); }, { passive: true });

  // Touch support
  let lastTouchDist = 0;
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) { isDragging = true; lastMX = e.touches[0].clientX; lastMY = e.touches[0].clientY; }
    if (e.touches.length === 2) lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  });
  canvas.addEventListener('touchend', () => { isDragging = false; });
  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 1 && isDragging) {
      rotY += (e.touches[0].clientX - lastMX) * 0.008;
      rotX += (e.touches[0].clientY - lastMY) * 0.008;
      lastMX = e.touches[0].clientX; lastMY = e.touches[0].clientY;
      draw3D();
    }
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      zoom *= d / lastTouchDist; lastTouchDist = d; draw3D();
    }
  }, { passive: true });
}

export function set3DTrajectory(pts: TrajectoryPoint[]): void {
  trajectory = pts;
  draw3D();
}

function project(v: Vec3): { px: number; py: number } {
  const W = canvas.width, H = canvas.height;
  // Rotate around Y axis
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const x1 = v.x * cosY - v.z * sinY;
  const z1 = v.x * sinY + v.z * cosY;
  // Rotate around X axis
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const y2 = v.y * cosX - z1 * sinX;
  const z2 = v.y * sinX + z1 * cosX;
  // Simple perspective
  const fov = 600 * zoom;
  const depth = fov / (fov + z2 + 1000);
  return { px: W / 2 + x1 * depth, py: H / 2 - y2 * depth };
}

function draw3D(): void {
  if (!canvas || trajectory.length < 2) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const isDark = getTheme() === 'dark';

  // Background
  ctx.fillStyle = isDark ? '#060b18' : '#f8fafc';
  ctx.fillRect(0, 0, W, H);

  if (trajectory.length === 0) return;

  // Normalise coords to fit canvas
  const maxD = Math.max(...trajectory.map(p => Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z))), 1);
  const scale = (H / 2.5) / maxD;
  const norm = (p: TrajectoryPoint): Vec3 => ({ x: p.z * scale, y: p.y * scale, z: p.x * scale });

  // Ground grid
  const gridR = 1.2;
  ctx.strokeStyle = isDark ? 'rgba(0, 212, 255, 0.08)' : 'rgba(2, 132, 199, 0.15)';
  ctx.lineWidth = 0.5;
  for (let i = -5; i <= 5; i++) {
    const a = norm({ x: i * maxD / 5, y: 0, z: -maxD * gridR } as TrajectoryPoint);
    const b = norm({ x: i * maxD / 5, y: 0, z:  maxD * gridR } as TrajectoryPoint);
    const c = norm({ x: -maxD * gridR, y: 0, z: i * maxD / 5 } as TrajectoryPoint);
    const d = norm({ x:  maxD * gridR, y: 0, z: i * maxD / 5 } as TrajectoryPoint);
    const pa = project(a), pb = project(b), pc = project(c), pd = project(d);
    ctx.beginPath(); ctx.moveTo(pa.px, pa.py); ctx.lineTo(pb.px, pb.py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pc.px, pc.py); ctx.lineTo(pd.px, pd.py); ctx.stroke();
  }

  // Trajectory arc — gradient cyan→gold→red
  for (let i = 1; i < trajectory.length; i++) {
    const t0 = i / trajectory.length;
    const hue = t0 < 0.5
      ? `hsl(${190 - t0 * 100},100%,${isDark ? 60 : 45}%)`
      : `hsl(${140 - (t0 - 0.5) * 240},100%,${isDark ? 55 : 45}%)`;
    const a = project(norm(trajectory[i - 1]));
    const b = project(norm(trajectory[i]));
    ctx.beginPath();
    ctx.moveTo(a.px, a.py);
    ctx.lineTo(b.px, b.py);
    ctx.strokeStyle = hue;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Velocity arrow at midpoint
  const arrowColor = isDark ? '#f5c518' : '#d97706';
  const mid = trajectory[Math.floor(trajectory.length / 2)];
  if (mid) {
    const s = 6 * scale;
    const start = project(norm(mid));
    const end   = project(norm({ ...mid, x: mid.x + mid.vx * s, y: mid.y + mid.vy * s, z: mid.z + mid.vz * s }));
    ctx.beginPath();
    ctx.moveTo(start.px, start.py);
    ctx.lineTo(end.px,   end.py);
    ctx.strokeStyle = arrowColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    // arrowhead
    const angle = Math.atan2(end.py - start.py, end.px - start.px);
    ctx.beginPath();
    ctx.moveTo(end.px, end.py);
    ctx.lineTo(end.px - 10 * Math.cos(angle - 0.4), end.py - 10 * Math.sin(angle - 0.4));
    ctx.lineTo(end.px - 10 * Math.cos(angle + 0.4), end.py - 10 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = arrowColor;
    ctx.fill();
  }

  // Launch dot
  const launch = project(norm(trajectory[0]));
  ctx.beginPath(); ctx.arc(launch.px, launch.py, 5, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? '#00ff80' : '#059669'; ctx.fill();

  // Landing dot
  const land = project(norm(trajectory.at(-1)!));
  ctx.beginPath(); ctx.arc(land.px, land.py, 6, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? '#ff4545' : '#e11d48'; ctx.fill();

  // Hint
  ctx.fillStyle = isDark ? 'rgba(160,176,208,0.5)' : 'rgba(71,85,105,0.7)';
  ctx.font = '11px Outfit, monospace';
  ctx.fillText('Drag to rotate • Scroll to zoom', 10, H - 10);
}

export { draw3D };

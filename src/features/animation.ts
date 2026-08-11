import type { TrajectoryPoint } from '../physics/simulate';


let trajectory: TrajectoryPoint[] = [];
let frameIndex  = 0;
let animFrame   = 0;
let playing     = false;
let stepsPerFrame = 5;


// DOM refs
let hudEl: HTMLElement | null            = null;
let progressEl: HTMLInputElement | null  = null;


export function initAnimation(
  _canvas2D: HTMLCanvasElement,
  hud: HTMLElement,
  progress: HTMLInputElement
): void {
  hudEl         = hud;
  progressEl    = progress;
}


export function setAnimTrajectory(pts: TrajectoryPoint[]): void {
  trajectory  = pts;
  frameIndex  = 0;
  if (progressEl) { progressEl.max = String(pts.length - 1); progressEl.value = '0'; }
  renderHUD(pts[0]);
}

export function play(): void  { playing = true;  tick(); }
export function pause(): void { playing = false; cancelAnimationFrame(animFrame); }
export function stop(): void  { pause(); frameIndex = 0; renderHUD(trajectory[0]); }
export function setSpeed(mult: number): void { stepsPerFrame = Math.max(1, Math.round(mult * 5)); }

export function scrubTo(i: number): void {
  frameIndex = Math.min(i, trajectory.length - 1);
  renderHUD(trajectory[frameIndex]);
}

function tick(): void {
  if (!playing || trajectory.length === 0) return;
  frameIndex = Math.min(frameIndex + stepsPerFrame, trajectory.length - 1);
  renderHUD(trajectory[frameIndex]);
  if (progressEl) progressEl.value = String(frameIndex);

  if (frameIndex >= trajectory.length - 1) { playing = false; return; }
  animFrame = requestAnimationFrame(tick);
}

function renderHUD(p: TrajectoryPoint | undefined): void {
  if (!hudEl || !p) return;
  hudEl.innerHTML = `
    <div class="hud-row"><span class="hud-label">Altitude</span><span class="hud-val">${p.y.toFixed(1)} <em>m</em></span></div>
    <div class="hud-row"><span class="hud-label">Speed</span><span class="hud-val">${p.speed.toFixed(1)} <em>m/s</em> · ${(p.speed * 3.6).toFixed(0)} <em>km/h</em></span></div>
    <div class="hud-row"><span class="hud-label">Mach</span><span class="hud-val ${p.mach >= 1 ? 'hud-supersonic' : ''}">${p.mach.toFixed(3)}</span></div>
    <div class="hud-row"><span class="hud-label">Drag</span><span class="hud-val">${p.drag.toFixed(1)} <em>N</em></span></div>
    <div class="hud-row"><span class="hud-label">Kinetic E.</span><span class="hud-val">${(p.kineticJ / 1000).toFixed(2)} <em>kJ</em></span></div>
    <div class="hud-row"><span class="hud-label">Dyn. Press.</span><span class="hud-val">${p.dynPressure.toFixed(0)} <em>Pa</em></span></div>
    <div class="hud-row"><span class="hud-label">G-Force</span><span class="hud-val">${p.gForce.toFixed(2)} <em>g</em></span></div>
    <div class="hud-row"><span class="hud-label">Time</span><span class="hud-val">${p.t.toFixed(2)} <em>s</em></span></div>
    <div class="hud-row"><span class="hud-label">Dist</span><span class="hud-val">${Math.sqrt(p.x**2+p.z**2).toFixed(1)} <em>m</em></span></div>`;
}

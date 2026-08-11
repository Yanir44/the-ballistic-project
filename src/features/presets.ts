export interface Preset {
  id: string;
  label: string;
  icon: string;  // Lucide icon identifier
  V: number;     // m/s
  M: number;     // kg
  diamFront: number;
  diamSide: number;
  diamBottom: number;
  cd: number;
  degY: number;
}

export const PRESETS: Preset[] = [
  {
    id: 'howitzer',
    label: '155mm M107 Artillery Shell',
    icon: 'zap',
    V: 827, M: 43.2,
    diamFront: 0.155, diamSide: 0.60, diamBottom: 0.155,
    cd: 0.295, degY: 45,
  },
  {
    id: 'cannonball',
    label: '18th-Century Iron Cannonball',
    icon: 'disc',
    V: 400, M: 5.0,
    diamFront: 0.12, diamSide: 0.12, diamBottom: 0.12,
    cd: 0.47, degY: 45,
  },
  {
    id: 'bmg',
    label: '.50 BMG Sniper Bullet',
    icon: 'target',
    V: 900, M: 0.042,
    diamFront: 0.013, diamSide: 0.06, diamBottom: 0.013,
    cd: 0.32, degY: 0.5,
  },
  {
    id: 'baseball',
    label: 'Baseball',
    icon: 'activity',
    V: 44, M: 0.145,
    diamFront: 0.074, diamSide: 0.074, diamBottom: 0.074,
    cd: 0.35, degY: 35,
  },
  {
    id: 'golfball',
    label: 'Golf Ball',
    icon: 'flag',
    V: 75, M: 0.046,
    diamFront: 0.043, diamSide: 0.043, diamBottom: 0.043,
    cd: 0.24, degY: 12,
  },
  {
    id: 'pingpong',
    label: 'Ping-Pong Ball',
    icon: 'circle-dot',
    V: 15, M: 0.0027,
    diamFront: 0.04, diamSide: 0.04, diamBottom: 0.04,
    cd: 0.40, degY: 30,
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: 'sliders',
    V: 100, M: 1.0,
    diamFront: 0.1, diamSide: 0.2, diamBottom: 0.1,
    cd: 0.47, degY: 45,
  },
];

export function applyPreset(preset: Preset): void {
  const set = (id: string, val: number) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) { el.value = String(val); el.dispatchEvent(new Event('input')); }
  };
  set('input-V',           preset.V);
  set('input-M',           preset.M);
  set('input-diamFront',   preset.diamFront);
  set('input-diamSide',    preset.diamSide);
  set('input-diamBottom',  preset.diamBottom);
  set('input-cd',          preset.cd);
  set('input-degY',        preset.degY);
}

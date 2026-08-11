export type UnitSystem = 'metric' | 'imperial' | 'nautical';

let currentSystem: UnitSystem = 'metric';

export function getUnitSystem(): UnitSystem { return currentSystem; }
export function setUnitSystem(s: UnitSystem): void { currentSystem = s; }

// ── Distance ────────────────────────────────────────────────────────────────
export function metersToDisplay(m: number): { value: number; unit: string } {
  if (currentSystem === 'imperial') return { value: m * 3.28084,     unit: 'ft' };
  if (currentSystem === 'nautical') return { value: m / 1852,        unit: 'nm' };
  return { value: m,                                                  unit: 'm'  };
}

// ── Speed ────────────────────────────────────────────────────────────────────
export function msToDisplay(ms: number): { value: number; unit: string } {
  if (currentSystem === 'imperial') return { value: ms * 2.23694,    unit: 'mph'  };
  if (currentSystem === 'nautical') return { value: ms * 1.94384,    unit: 'kts'  };
  return { value: ms * 3.6,                                           unit: 'km/h' };
}

// ── Mass ─────────────────────────────────────────────────────────────────────
export function kgToDisplay(kg: number): { value: number; unit: string } {
  if (currentSystem === 'imperial') return { value: kg * 2.20462,    unit: 'lb' };
  return { value: kg,                                                  unit: 'kg' };
}

// ── Pressure ─────────────────────────────────────────────────────────────────
export function mbToDisplay(mb: number): { value: number; unit: string } {
  if (currentSystem === 'imperial') return { value: mb * 0.02953,    unit: 'inHg' };
  return { value: mb,                                                  unit: 'mb'   };
}

// ── Temperature ───────────────────────────────────────────────────────────────
export function celsiusToDisplay(c: number): { value: number; unit: string } {
  if (currentSystem === 'imperial') return { value: c * 9 / 5 + 32, unit: '°F' };
  return { value: c,                                                   unit: '°C' };
}

export function fmt(val: number, decimals = 2): string {
  return val.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

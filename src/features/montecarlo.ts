import { simulate } from '../physics/simulate';
import type { SimParams } from '../physics/simulate';

export interface MonteCarloResult {
  landingPoints: Array<{ lat: number; lon: number }>;
  cepRadius: number;  // metres
  meanLat:   number;
  meanLon:   number;
}

/**
 * Run N simulations with small random perturbations on key parameters.
 * Returns landing point scatter + CEP radius.
 */
export function runMonteCarlo(
  base: SimParams,
  n: number,
  uncertainties: {
    V:       number;  // ± m/s
    degY:    number;  // ± degrees
    degZ:    number;  // ± degrees
    windSpd: number;  // ± m/s
    pressureMb: number; // ± mb
    mass:    number;  // ± kg
  }
): MonteCarloResult {
  const points: Array<{ lat: number; lon: number }> = [];

  for (let i = 0; i < n; i++) {
    const perturbed: SimParams = {
      ...base,
      V:          base.V          + randn() * uncertainties.V,
      degY:       base.degY       + randn() * uncertainties.degY,
      degZ:       base.degZ       + randn() * uncertainties.degZ,
      vWind:      Math.max(0, base.vWind + randn() * uncertainties.windSpd),
      pressureMb: base.pressureMb + randn() * uncertainties.pressureMb,
      M:          Math.max(0.001, base.M + randn() * uncertainties.mass),
      snapshotEvery: 999999, // don't capture trajectory for speed
    };
    const res = simulate(perturbed);
    points.push({ lat: res.nLat, lon: res.nLon });
  }

  const meanLat = points.reduce((s, p) => s + p.lat, 0) / n;
  const meanLon = points.reduce((s, p) => s + p.lon, 0) / n;

  // Distances from mean in metres (approximate flat-earth)
  const dists = points.map(p => {
    const dy = (p.lat - meanLat) * 111_132;
    const dx = (p.lon - meanLon) * 111_320 * Math.cos(meanLat * Math.PI / 180);
    return Math.sqrt(dx * dx + dy * dy);
  }).sort((a, b) => a - b);

  // CEP = median distance
  const cepRadius = dists[Math.floor(n * 0.5)];

  return { landingPoints: points, cepRadius, meanLat, meanLon };
}

/** Box-Muller normal distribution sample */
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

import type { SimParams } from '../physics/simulate';
import { simulate } from '../physics/simulate';

/**
 * Auto-aim: given a target lat/lon, iteratively solve for the elevation angle
 * (degY) that minimises landing distance error. Uses a bisection + gradient descent.
 */
export interface AimSolution {
  elevationDeg: number;
  azimuthDeg:   number;
  predictedRangeM: number;
  predictedLat:    number;
  predictedLon:    number;
  flightTimeS:     number;
  termSpeedMs:     number;
  kineticEnergyJ:  number;
  impactAngleDeg:  number;
  missMarginM:     number;
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function solveAutoAim(
  base: SimParams,
  targetLat: number,
  targetLon: number,
  maxIter = 60
): AimSolution | null {
  const targetBearing = bearingDeg(base.latitudeDeg, base.longitudeDeg, targetLat, targetLon);
  const targetDistM   = haversineM(base.latitudeDeg, base.longitudeDeg, targetLat, targetLon);

  if (targetDistM < 1) return null;

  let lo = 0, hi = 90, bestElev = 45;

  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const res = simulate({ ...base, degY: mid, degZ: targetBearing, snapshotEvery: 999999 });
    if (res.d < targetDistM) lo = mid; else hi = mid;
    bestElev = mid;
    if (Math.abs(res.d - targetDistM) < 1) break;
  }

  const finalRes = simulate({ ...base, degY: bestElev, degZ: targetBearing, snapshotEvery: 200 });
  const missMargin = haversineM(finalRes.nLat, finalRes.nLon, targetLat, targetLon);

  const last = finalRes.trajectory.at(-1);
  const impactAngle = last ? Math.atan2(Math.abs(last.vy), Math.sqrt(last.vx ** 2 + last.vz ** 2)) * 180 / Math.PI : 0;
  const kineticJ = last ? 0.5 * base.M * last.speed ** 2 : 0;

  return {
    elevationDeg:    bestElev,
    azimuthDeg:      targetBearing,
    predictedRangeM: finalRes.d,
    predictedLat:    finalRes.nLat,
    predictedLon:    finalRes.nLon,
    flightTimeS:     finalRes.t,
    termSpeedMs:     finalRes.vFinal,
    kineticEnergyJ:  kineticJ,
    impactAngleDeg:  impactAngle,
    missMarginM:     missMargin,
  };
}

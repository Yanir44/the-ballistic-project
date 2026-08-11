import { calcGravity } from './gravity';
import { isaAirDensity, customAirDensity } from './atmosphere';
import { calcSolar } from './solar';
import { calcDragForce, calcBuoyancy } from './drag';
import { earthRotationSpeed, metersToLatDeg, metersToLonDeg } from './earth';

export interface SimParams {
  latitudeDeg:  number;
  longitudeDeg: number;
  day:          number;
  hour:         number;

  // Projectile
  V:    number;  // muzzle speed (m/s)
  degY: number;  // elevation angle (°)
  degZ: number;  // azimuth angle (°)
  M:    number;  // mass (kg)
  y0:   number;  // initial height (m)
  cd:   number;  // drag coefficient

  // Shape
  diamFront:  number;  // frontal diameter (m)
  diamSide:   number;  // side diameter (m)
  diamBottom: number;  // bottom diameter (m, for volume)

  // Atmosphere
  vWind:      number;  // wind speed (m/s)
  pressureMb: number;  // air pressure (mb)
  tempC:      number;  // temperature (°C)
  windDeg:    number;  // absolute wind direction (°), 0 = north

  // Options
  useISA:   boolean;  // use altitude-variable ISA density instead of sea-level custom
  dt?:      number;   // time step (default 0.01 s)
  maxSteps?: number;  // safety cap (default 500 000)
  snapshotEvery?: number; // capture 1 frame per N steps (default 50)
}

export interface TrajectoryPoint {
  t:  number;
  x:  number;  // north displacement (m)
  y:  number;  // altitude (m)
  z:  number;  // east displacement (m)
  vx: number;
  vy: number;
  vz: number;
  speed:     number;
  drag:      number;
  kineticJ:  number;
  mach:      number;
  dynPressure: number;
  gForce:    number;
}

export interface SimResult {
  trajectory:    TrajectoryPoint[];
  dx:            number;  // north displacement (m)
  dz:            number;  // east displacement (m)
  d:             number;  // total horizontal distance (m)
  t:             number;  // flight time (s)
  vFinal:        number;  // terminal speed (m/s)
  nLat:          number;  // landing latitude
  nLon:          number;  // landing longitude
  dInvariant:    number;  // solar-system-reference distance (m)
  maxAltitude:   number;
  apogeeTime:    number;
  // Solar data
  declinationDeg: number;
  elevationDeg:   number;
  azimuthDeg:     number;
}

const SPEED_OF_SOUND = 343; // m/s (sea-level approx)
const DEG2RAD = Math.PI / 180;

export function simulate(p: SimParams): SimResult {
  const dt            = p.dt           ?? 0.01;
  const maxSteps      = p.maxSteps     ?? 500_000;
  const snapshotEvery = p.snapshotEvery ?? 50;

  // --- Pre-compute constants ---
  const radY   = p.degY * DEG2RAD;
  const radZ   = p.degZ * DEG2RAD;

  const g      = calcGravity(p.latitudeDeg);
  const solar  = calcSolar(p.latitudeDeg, p.day, p.hour, p.y0, g);
  const newgY  = solar.gCorrected;

  const vRotation     = earthRotationSpeed(p.latitudeDeg);
  const vRotWith      = vRotation * Math.sin(p.degZ * DEG2RAD);
  const vRotAgainst   = vRotation * Math.cos(p.degZ * DEG2RAD);

  // Wind projected along the projectile's horizontal direction
  const windRelDeg  = p.windDeg - p.degZ;
  const vWindVec    = p.vWind * Math.cos(windRelDeg * DEG2RAD);

  // Object geometry
  const frontAreaM2 = (Math.PI * p.diamFront  * p.diamFront)  / 4;
  const volume      = (Math.PI * p.diamBottom  * p.diamBottom  * p.diamBottom) / 6;

  // Initial velocity components
  let vx = p.V * Math.cos(radY) * Math.cos(radZ);  // north
  let vy = p.V * Math.sin(radY);                    // up
  let vz = p.V * Math.cos(radY) * Math.sin(radZ);  // east

  let x = 0, y = p.y0, z = 0, t = 0;
  let maxAlt = p.y0, apogeeTime = 0;

  const trajectory: TrajectoryPoint[] = [];
  let step = 0;

  while (y > 0 && step < maxSteps) {
    // Air density — ISA or user-supplied
    const dens = p.useISA
      ? isaAirDensity(Math.max(0, y))
      : customAirDensity(p.pressureMb * 100, p.tempC);

    const vTotal  = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (vTotal === 0) break;

    const drag    = calcDragForce(dens, frontAreaM2, vTotal, vWindVec, p.cd);
    const buoy    = calcBuoyancy(volume, dens, g);

    const aDrag   = drag / p.M;
    const axDrag  = aDrag * (vx / vTotal);
    const ayDrag  = aDrag * (vy / vTotal);
    const azDrag  = aDrag * (vz / vTotal);

    const buoyDy  = (buoy * dt) / (p.M * g);

    // Snapshot
    if (step % snapshotEvery === 0) {
      const kineticJ  = 0.5 * p.M * vTotal * vTotal;
      const mach      = vTotal / SPEED_OF_SOUND;
      const dynP      = 0.5 * dens * vTotal * vTotal;
      const gForce    = aDrag / 9.80665;
      trajectory.push({ t, x, y, z, vx, vy, vz, speed: vTotal, drag, kineticJ, mach, dynPressure: dynP, gForce });
    }

    // Update velocities
    vx = vx - axDrag * dt;
    vy = vy - newgY * dt - ayDrag * dt;
    vz = vz - azDrag * dt;

    // Update position
    x  = x + vx * dt;
    y  = y + vy * dt + buoyDy;
    z  = z + vz * dt;
    t  = t + dt;
    step++;

    if (y > maxAlt) { maxAlt = y; apogeeTime = t; }
  }

  const d          = Math.sqrt(x * x + z * z);
  const vFinal     = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const dInvariant = Math.sqrt((x + vRotWith / Math.max(t, 1e-9)) ** 2 + (z + vRotAgainst / Math.max(t, 1e-9)) ** 2);

  const nLat = p.latitudeDeg  + metersToLatDeg(x, p.latitudeDeg);
  const nLon = p.longitudeDeg + metersToLonDeg(z, p.latitudeDeg);

  return {
    trajectory,
    dx: x, dz: z, d, t, vFinal, nLat, nLon, dInvariant,
    maxAltitude: maxAlt, apogeeTime,
    declinationDeg: solar.declinationDeg,
    elevationDeg:   solar.elevationDeg,
    azimuthDeg:     solar.azimuthDeg,
  };
}

/**
 * WGS84 geodetic helpers and Earth rotation correction.
 */

const DEG2RAD = Math.PI / 180;

/** Earth's surface rotation speed at the equator (m/s) */
const V_ROTATION_EQUATOR = 465.2;

/**
 * Tangential speed of Earth's surface at a given latitude (m/s).
 * Projected onto the east–west axis.
 */
export function earthRotationSpeed(latDeg: number): number {
  return V_ROTATION_EQUATOR * Math.cos(latDeg * DEG2RAD);
}

/**
 * Convert a north-displacement (m) to degrees of latitude.
 * Uses the WGS84 arc-length approximation from the Python script.
 */
export function metersToLatDeg(dx: number, latDeg: number): number {
  const lat2 = 2 * latDeg * DEG2RAD;
  const lat4 = 4 * latDeg * DEG2RAD;
  const mPerDeg = 111132.92 - 559.82 * Math.cos(lat2) - 1.175 * Math.cos(lat4);
  return dx / mPerDeg;
}

/**
 * Convert an east-displacement (m) to degrees of longitude.
 * Uses the WGS84 arc-length approximation from the Python script.
 */
export function metersToLonDeg(dz: number, latDeg: number): number {
  const lat1 = latDeg * DEG2RAD;
  const lat3 = 3 * latDeg * DEG2RAD;
  const lat5 = 5 * latDeg * DEG2RAD;
  const mPerDeg =
    111412.84 * Math.cos(lat1) -
    93.5      * Math.cos(lat3) +
    0.118     * Math.cos(lat5);
  return dz / mPerDeg;
}

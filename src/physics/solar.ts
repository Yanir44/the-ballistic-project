/**
 * Solar position and gravitational correction.
 * Mirrors the Python script's declination / elevation / azimuth math.
 */

const G_CONST    = 6.6743e-11;  // gravitational constant
const M_SUN      = 1.989e30;    // solar mass (kg)
const AU         = 1.49597870e11; // 1 AU in metres
const R_EARTH    = 6_371_000;   // mean Earth radius (m)
const ECCENTRICITY = 0.0167;

export interface SolarResult {
  declinationDeg: number;
  elevationDeg: number;
  azimuthDeg: number;
  gravitySun: number; // m/s² — downward (toward Sun centre)
  gCorrected: number; // effective vertical gravity after solar subtraction
}

/**
 * Compute solar geometry and corrected vertical gravity.
 * @param latDeg   Geodetic latitude (°)
 * @param day      Day of year (1–365)
 * @param hour     Hour of day in 24h format
 * @param y0       Launch altitude above MSL (m)
 * @param gLocal   Local Somigliana gravity (m/s²)
 */
export function calcSolar(
  latDeg: number,
  day: number,
  hour: number,
  y0: number,
  gLocal: number
): SolarResult {
  const latRad        = (latDeg * Math.PI) / 180;
  const declinationDeg = 23.45 * Math.sin((Math.PI / 180) * (360 / 365) * (day - 81));
  const declinationRad = (declinationDeg * Math.PI) / 180;
  const hourDeg       = 15 * (hour - 12);
  const hourRad       = (hourDeg * Math.PI) / 180;

  // Solar elevation above the horizon (radians → then degrees)
  const sinElev =
    Math.sin(latRad) * Math.sin(declinationRad) +
    Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourRad);
  const elevationRad  = Math.asin(sinElev);
  const elevationDeg  = (elevationRad * 180) / Math.PI;

  // Azimuth (degrees)
  const cosAz =
    (Math.sin(declinationRad) - Math.sin(elevationRad) * Math.sin(latRad)) /
    (Math.cos(elevationRad) * Math.cos(latRad));
  const azimuthDeg = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI;

  // Earth–Sun distance (m) accounting for orbital eccentricity, minus Earth radius, minus y0
  const sunDistRaw = AU * (1 - ECCENTRICITY * Math.cos((2 * Math.PI) / 365.25 * (day - 4)));
  const sunDist    = sunDistRaw - R_EARTH - y0;

  const gravitySun = (G_CONST * M_SUN) / (sunDist * sunDist);

  // Effective vertical gravity: subtract Sun's upward pull component
  const gCorrected = gLocal - Math.sin(elevationRad) * gravitySun;

  return { declinationDeg, elevationDeg, azimuthDeg, gravitySun, gCorrected };
}

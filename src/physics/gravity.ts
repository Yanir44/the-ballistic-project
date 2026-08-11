/**
 * Somigliana Normal Gravity Formula
 * Computes gravitational acceleration (m/s²) at a given geodetic latitude.
 */

const G_EQUATOR = 9.7803253359;   // gravity at equator (m/s²)
const K         = 0.001931852652458;
const E2        = 0.00669437990141;

export function calcGravity(latitudeDeg: number): number {
  const latRad = (latitudeDeg * Math.PI) / 180;
  const sin2   = Math.sin(latRad) ** 2;
  return G_EQUATOR * (1 + K * sin2) / Math.sqrt(1 - E2 * sin2);
}

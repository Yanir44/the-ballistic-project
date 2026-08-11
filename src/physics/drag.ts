/** Drag and buoyancy force helpers. */

/**
 * Aerodynamic drag force (N).
 * F_drag = 0.5 · ρ · A · (v + v_wind)² · Cd
 */
export function calcDragForce(
  dens: number,       // air density (kg/m³)
  frontAreaM2: number, // frontal cross-sectional area (m²) = π·d²/4
  vTotal: number,     // projectile speed (m/s)
  vWind: number,      // wind speed component along travel (m/s)
  cd: number          // drag coefficient
): number {
  const relV = vTotal + vWind;
  return 0.5 * dens * frontAreaM2 * relV * relV * cd;
}

/**
 * Buoyancy force (N) — upward.
 * F_buoy = V_object · ρ · g
 */
export function calcBuoyancy(
  volumeM3: number,
  dens: number,
  g: number
): number {
  return volumeM3 * dens * g;
}

/**
 * Effective frontal area (m²) based on wind angle relative to projectile heading.
 * If wind is within ±45° of front/rear, use front diameter; otherwise side.
 */
export function effectiveFrontalArea(
  windAngleDeg: number,
  frontDiam: number,
  sideDiam: number
): number {
  const a = ((windAngleDeg % 360) + 360) % 360;
  const usesFront = a < 45 || (a > 105 && a < 225) || a > 315;
  const d = usesFront ? frontDiam : sideDiam;
  return (Math.PI * d * d) / 4;
}

/** Reynolds number (dimensionless) — for Cd estimation display. */
export function reynoldsNumber(v: number, diam: number, dens: number, viscosity = 1.81e-5): number {
  return (dens * v * diam) / viscosity;
}

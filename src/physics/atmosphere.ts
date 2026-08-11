/**
 * International Standard Atmosphere (ISA) model.
 * Returns air density (kg/m³) as a function of altitude (m).
 * Uses the troposphere lapse rate below 11,000m, isothermal above.
 */

const T0   = 288.15;   // sea-level temperature (K)
const P0   = 101325;   // sea-level pressure (Pa)
const L    = 0.0065;   // temperature lapse rate (K/m)
const R    = 8.31446;  // universal gas constant
const M    = 0.028952; // molar mass of dry air (kg/mol)
const g0   = 9.80665;  // standard gravity
const R_sp = R / M;    // specific gas constant ≈ 287.05 J/(kg·K)

/** Temperature at altitude (K) — troposphere only (clips at 11 km) */
export function isaTemperature(altM: number): number {
  if (altM <= 11000) {
    return T0 - L * altM;
  }
  // Stratosphere (simplified isothermal)
  return 216.65;
}

/** Pressure at altitude (Pa) */
export function isaPressure(altM: number): number {
  if (altM <= 11000) {
    return P0 * Math.pow(T0 / (T0 - L * altM), (-g0) / (L * R_sp));
  }
  const p11 = isaPressure(11000);
  return p11 * Math.exp((-g0 * (altM - 11000)) / (R_sp * 216.65));
}

/** Air density at altitude (kg/m³) — ISA */
export function isaAirDensity(altM: number): number {
  return isaPressure(altM) / (R_sp * isaTemperature(altM));
}

/** Air density from user-supplied pressure (Pa) and temperature (°C) at a specific altitude — custom atmosphere */
export function customAirDensity(pressurePa: number, tempC: number): number {
  return pressurePa / (R_sp * (tempC + 273.15));
}

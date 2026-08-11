import { simulate } from '../physics/simulate';
import type { SimParams, SimResult } from '../physics/simulate';

export interface FiringTableRow {
  elevationDeg: number;
  rangeM:       number;
  maxAltM:      number;
  flightTimeS:  number;
  termSpeedMs:  number;
  driftM:       number;  // east displacement
}

/**
 * Generate a full firing table by sweeping elevation angles.
 * @param base Base SimParams — degY will be overridden.
 * @param step Elevation step in degrees (default 5°).
 */
export function generateFiringTable(base: SimParams, step = 5): FiringTableRow[] {
  const rows: FiringTableRow[] = [];
  for (let elev = 0; elev <= 90; elev += step) {
    const p: SimParams = { ...base, degY: elev, snapshotEvery: 999999 };
    const res: SimResult = simulate(p);
    rows.push({
      elevationDeg: elev,
      rangeM:       res.d,
      maxAltM:      res.maxAltitude,
      flightTimeS:  res.t,
      termSpeedMs:  res.vFinal,
      driftM:       Math.abs(res.dz),
    });
  }
  return rows;
}

/** Render the firing table into a container element */
export function renderFiringTable(rows: FiringTableRow[], container: HTMLElement): void {
  const table = document.createElement('table');
  table.className = 'firing-table';
  const maxRange = Math.max(...rows.map(r => r.rangeM));

  table.innerHTML = `
    <thead>
      <tr>
        <th>Elev (°)</th>
        <th>Range (m)</th>
        <th>Max Alt (m)</th>
        <th>ToF (s)</th>
        <th>Term Spd (m/s)</th>
        <th>Drift (m)</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => `
        <tr class="${r.rangeM === maxRange ? 'max-range-row' : ''}">
          <td>${r.elevationDeg}°</td>
          <td>${r.rangeM.toFixed(1)}</td>
          <td>${r.maxAltM.toFixed(1)}</td>
          <td>${r.flightTimeS.toFixed(2)}</td>
          <td>${r.termSpeedMs.toFixed(2)}</td>
          <td>${r.driftM.toFixed(2)}</td>
        </tr>`).join('')}
    </tbody>`;
  container.innerHTML = '';
  container.appendChild(table);
}

/** Export firing table as CSV */
export function firingTableCsv(rows: FiringTableRow[]): void {
  const header = 'elevation_deg,range_m,max_alt_m,flight_time_s,terminal_speed_ms,drift_m';
  const body = rows.map(r =>
    [r.elevationDeg, r.rangeM, r.maxAltM, r.flightTimeS, r.termSpeedMs, r.driftM]
      .map(v => (typeof v === 'number' ? v.toFixed(3) : v)).join(',')
  );
  const csv = [header, ...body].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'firing_table.csv';
  a.click();
}

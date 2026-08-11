import type { SimResult } from '../physics/simulate';

export interface SavedRun {
  id: string;
  label: string;
  timestamp: number;
  params: Record<string, number | boolean | string>;
  result: SimResult;
  color: string;
}

const STORAGE_KEY = 'ubt_saved_runs';
const COLORS = ['#00d4ff', '#f5c518', '#ff4fcf', '#4fff8f', '#ff7b4f'];

function load(): SavedRun[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
}

function save(runs: SavedRun[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

export function getRuns(): SavedRun[] { return load(); }

export function saveRun(
  label: string,
  params: Record<string, number | boolean | string>,
  result: SimResult
): SavedRun {
  const runs = load();
  const run: SavedRun = {
    id:        crypto.randomUUID(),
    label,
    timestamp: Date.now(),
    params,
    result,
    color:     COLORS[runs.length % COLORS.length],
  };
  runs.unshift(run);
  save(runs.slice(0, 20)); // keep max 20
  return run;
}

export function deleteRun(id: string): void {
  save(load().filter(r => r.id !== id));
}

export function exportRunsJson(): void {
  const blob = new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ubt_runs.json';
  a.click();
}

import { simulate } from '../physics/simulate';
import type { SimParams, SimResult } from '../physics/simulate';

self.onmessage = (e: MessageEvent<SimParams>) => {
  try {
    const result: SimResult = simulate(e.data);
    self.postMessage({ ok: true, result });
  } catch (err: any) {
    self.postMessage({ ok: false, error: err.message ?? String(err) });
  }
};

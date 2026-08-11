import './style.css';
import { createIcons, icons } from 'lucide';

import type { SimParams, SimResult } from './physics/simulate';
import { PRESETS, applyPreset }  from './features/presets';
import { setUnitSystem, metersToDisplay, msToDisplay, fmt } from './features/units';
import { getLang, setLang, applyTranslations, t } from './features/i18n';
import { initTheme, toggleTheme, onThemeChange } from './features/theme';
import { fetchWeather }     from './features/weather';
import { fetchTerrainProfile } from './features/terrain';
import { initMap, updateMapFromResult, setLaunchPin, setTargetPin, getTargetLatLon, renderMonteCarlo } from './features/map';
import { renderChart, getActiveChart } from './features/chart';
import type { ChartTab } from './features/chart';
import { init3DViewer, set3DTrajectory } from './features/viewer3d';
import { initAnimation, setAnimTrajectory, play, pause, stop, setSpeed, scrubTo } from './features/animation';
import { solveAutoAim }   from './features/autoaim';
import { runMonteCarlo }  from './features/montecarlo';
import { generateFiringTable, renderFiringTable, firingTableCsv } from './features/firingtable';
import { getRuns, saveRun, deleteRun, exportRunsJson } from './features/history';
import type { SavedRun } from './features/history';
import { exportCsv, exportPng, generateQr, copyShareUrl, printCard } from './features/export';
import { LESSONS, renderLessonPanel } from './features/education';
import { flip, flipChildren, initCardObserver } from './features/flip';
import { initInteractivePicker } from './features/picker';
import { showToast } from './features/toast';
import { showConfirm, showPrompt } from './features/dialog';

// ═════════════════════════════════════════════════════════════════════════════
// State
// ═════════════════════════════════════════════════════════════════════════════
let lastResult:  SimResult | null = null;
let lastParams:  SimParams | null = null;
let compareRuns: SavedRun[]       = [];
let simWorker:   Worker | null    = null;
let currentChartTab: ChartTab     = 'side';

// ── Simulation runner (via Web Worker) ──────────────────────────────────────
function runSimulation(params: SimParams): Promise<SimResult> {
  return new Promise((resolve, reject) => {
    if (!simWorker) {
      simWorker = new Worker(new URL('./workers/simulate.worker.ts', import.meta.url), { type: 'module' });
    }
    simWorker.onmessage = (e) => {
      if (e.data.ok) resolve(e.data.result);
      else           reject(new Error(e.data.error));
    };
    simWorker.onerror = (e) => reject(e);
    simWorker.postMessage(params);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Helpers — collect form values
// ═════════════════════════════════════════════════════════════════════════════
function num(id: string, fallback = 0): number {
  const el = document.getElementById(id) as HTMLInputElement;
  const v  = parseFloat(el?.value ?? '');
  return isNaN(v) ? fallback : v;
}

function getParams(): SimParams {
  return {
    latitudeDeg:  num('input-lat'),
    longitudeDeg: num('input-lon'),
    day:          dayOfYear((document.getElementById('input-date') as HTMLInputElement)?.value),
    hour:         num('input-hour', 12),
    V:            num('input-V', 100),
    degY:         num('input-degY', 45),
    degZ:         num('input-degZ', 0),
    M:            num('input-M', 1),
    y0:           num('input-y0', 1),
    cd:           num('input-cd', 0.47),
    diamFront:    num('input-diamFront', 0.1),
    diamSide:     num('input-diamSide', 0.2),
    diamBottom:   num('input-diamBottom', 0.1),
    vWind:        num('input-vWind', 0),
    pressureMb:   num('input-pressureMb', 1013.25),
    tempC:        num('input-tempC', 20),
    windDeg:      num('input-windDeg', 0),
    useISA:       (document.getElementById('input-useISA') as HTMLInputElement)?.checked ?? false,
    dt:           0.01,
    snapshotEvery: 50,
  };
}

function dayOfYear(dateStr?: string): number {
  if (!dateStr) return 172; // ~summer solstice default
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

// ═════════════════════════════════════════════════════════════════════════════
// Simulation → render
// ═════════════════════════════════════════════════════════════════════════════
async function simulate(scrollToResults = false): Promise<void> {
  document.body.classList.add('has-simulation');
  const params  = getParams();
  lastParams    = params;

  const simBtn      = document.getElementById('btn-simulate')!;
  const spinner     = document.getElementById('chart-loading')!;
  const cardResults = document.getElementById('card-results')!;
  const gridResults = document.getElementById('results-grid')!;

  simBtn.setAttribute('disabled', '');
  simBtn.innerHTML = '<span class="spinner"></span> Running…';
  spinner.style.display = 'inline-block';

  // Display results section & show loading spinner while calculating/loading results
  cardResults.style.display = 'block';
  gridResults.innerHTML = `
    <div class="results-loading-overlay">
      <div class="results-loading-spinner"></div>
      <div class="results-loading-text">
        <span data-i18n="results.loading">${t('results.loading')}</span>
      </div>
    </div>
  `;

  if (scrollToResults) {
    cardResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  try {
    const result = await runSimulation(params);
    lastResult   = result;
    renderResults(result);
    renderChartView(result, currentChartTab);
    set3DTrajectory(result.trajectory);
    setAnimTrajectory(result.trajectory);
    updateMapFromResult(result, params.latitudeDeg, params.longitudeDeg);
    refreshHistoryList();

    // Terrain profile fetch (async, non-blocking)
    fetchTerrainAndOverlay(result, params);
  } catch (err: any) {
    showToast(`Simulation error: ${err.message}`, 'error');
  } finally {
    simBtn.removeAttribute('disabled');
    simBtn.innerHTML = `<i data-lucide="play" class="lucide-icon"></i> <span data-i18n="btn.simulate">${t('btn.simulate')}</span>`;
    createIcons({ icons });
    spinner.style.display = 'none';
  }
}

async function fetchTerrainAndOverlay(result: SimResult, params: SimParams): Promise<void> {
  const steps = 10;
  const path = Array.from({ length: steps + 1 }, (_, i) => ({
    lat: params.latitudeDeg + (result.nLat - params.latitudeDeg) * i / steps,
    lon: params.longitudeDeg + (result.nLon - params.longitudeDeg) * i / steps,
  }));
  await fetchTerrainProfile(path).catch(() => {});
}

// ═════════════════════════════════════════════════════════════════════════════
// Results panel
// ═════════════════════════════════════════════════════════════════════════════
function renderResults(r: SimResult): void {
  const grid    = document.getElementById('results-grid')!;
  const card    = document.getElementById('card-results')!;

  const distFmt = metersToDisplay(r.d);
  const spdFmt  = msToDisplay(r.vFinal);
  const altFmt  = metersToDisplay(r.maxAltitude);

  const items = [
    { label: t('result.distance'),   val: fmt(distFmt.value, 1),   unit: distFmt.unit,   highlight: true },
    { label: t('result.flightTime'), val: fmt(r.t, 2),             unit: 's'              },
    { label: t('result.vFinal'),     val: fmt(spdFmt.value, 1),    unit: spdFmt.unit      },
    { label: t('result.maxAlt'),     val: fmt(altFmt.value, 1),    unit: altFmt.unit      },
    { label: t('result.landingLat'), val: r.nLat.toFixed(6) + '°', unit: ''               },
    { label: t('result.landingLon'), val: r.nLon.toFixed(6) + '°', unit: ''               },
    { label: t('result.dInvariant'), val: fmt(r.dInvariant, 1),    unit: 'm'              },
    { label: 'Sun Elevation',        val: fmt(r.elevationDeg, 2),  unit: '°'              },
    { label: 'Sun Azimuth',          val: fmt(r.azimuthDeg, 2),    unit: '°'              },
  ];

  card.style.display = 'block';

  // FLIP for results grid animation
  flip(grid, () => {
    grid.innerHTML = items.map((item, i) => `
      <div class="result-item ${item.highlight ? 'highlight' : ''}" style="animation-delay:${i * 30}ms">
        <div class="result-label">${item.label}</div>
        <div class="result-value">${item.val} <span class="result-unit">${item.unit}</span></div>
      </div>`).join('');
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Charts
// ═════════════════════════════════════════════════════════════════════════════
function renderChartView(result: SimResult, tab: ChartTab): void {
  const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
  const compareTrajectory = compareRuns[0]?.result?.trajectory;
  const compareColor      = compareRuns[0]?.color;
  renderChart(canvas, result.trajectory, tab, compareTrajectory, compareColor);
}

// ═════════════════════════════════════════════════════════════════════════════
// History list
// ═════════════════════════════════════════════════════════════════════════════
function refreshHistoryList(): void {
  const list = document.getElementById('history-list')!;
  const runs = getRuns();

  flipChildren(list, () => {
    list.innerHTML = runs.length === 0
      ? '<span style="color:var(--muted);font-size:0.82rem">No saved runs yet.</span>'
      : runs.map(r => `
        <div class="history-item" data-run-id="${r.id}">
          <div class="history-dot" style="background:${r.color}"></div>
          <span class="history-label">${r.label}</span>
          <span class="history-meta">${new Date(r.timestamp).toLocaleTimeString()}</span>
          <div style="display:flex;gap:0.25rem">
            <button class="btn btn-sm" data-restore="${r.id}" title="Restore"><i data-lucide="rotate-ccw" class="lucide-icon"></i></button>
            <button class="btn btn-sm btn-danger" data-delete="${r.id}" title="Delete"><i data-lucide="trash-2" class="lucide-icon"></i></button>
          </div>
        </div>`).join('');
  });

  createIcons({ icons });

  // Restore / delete click handlers
  list.querySelectorAll('[data-restore]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const run = getRuns().find(r => r.id === (btn as HTMLElement).dataset.restore);
      if (!run) return;
      Object.entries(run.params).forEach(([k, v]) => {
        const el = document.getElementById(`input-${k}`) as HTMLInputElement | null;
        if (el) el.value = String(v);
      });
      renderResults(run.result);
      renderChartView(run.result, currentChartTab);
      set3DTrajectory(run.result.trajectory);
    });
  });

  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteRun((btn as HTMLElement).dataset.delete!);
      refreshHistoryList();
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Collapsible cards
// ═════════════════════════════════════════════════════════════════════════════
function initCollapsibles(): void {
  document.querySelectorAll('[data-toggle]').forEach(header => {
    header.addEventListener('click', () => {
      const bodyId  = (header as HTMLElement).dataset.toggle!;
      const body    = document.getElementById(bodyId)!;
      const chevron = header.querySelector('.card-chevron')!;
      const card    = header.closest('.card') as HTMLElement || body;

      flip(card, () => {
        body.classList.toggle('collapsed');
      });
      chevron.classList.toggle('open', !body.classList.contains('collapsed'));
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Sliders — bidirectional sync + debounced auto-simulate
// ═════════════════════════════════════════════════════════════════════════════
let debounceTimer = 0;

function linkSlider(sliderId: string, inputId: string): void {
  const slider = document.getElementById(sliderId) as HTMLInputElement;
  const input  = document.getElementById(inputId)  as HTMLInputElement;
  if (!slider || !input) return;

  slider.addEventListener('input', () => {
    input.value = slider.value;
    scheduleAutoSimulate();
  });
  input.addEventListener('input', () => {
    slider.value = input.value;
    scheduleAutoSimulate();
  });
}

function scheduleAutoSimulate(): void {
  clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    if (lastResult) simulate();
  }, 200);
}

// ═════════════════════════════════════════════════════════════════════════════
// Presets
// ═════════════════════════════════════════════════════════════════════════════
function initPresets(): void {
  const bar = document.getElementById('preset-bar')!;
  PRESETS.forEach(preset => {
    const chip = document.createElement('button');
    chip.className  = 'preset-chip';
    chip.dataset.id = preset.id;
    chip.innerHTML  = `<i data-lucide="${preset.icon}" class="lucide-icon"></i> ${preset.label}`;
    chip.addEventListener('click', () => {
      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyPreset(preset);
    });
    bar.appendChild(chip);
  });
  createIcons({ icons });
}

// ═════════════════════════════════════════════════════════════════════════════
// Education mode
// ═════════════════════════════════════════════════════════════════════════════
async function showEducation(): Promise<void> {
  const card = document.getElementById('card-education')!;
  const container = document.getElementById('education-lessons')!;
  container.innerHTML = '';

  flip(card, () => { card.style.display = 'block'; });

  for (const lesson of LESSONS) {
    const div = document.createElement('div');
    container.appendChild(div);
    await renderLessonPanel(lesson, div);
  }
  createIcons({ icons });
}

// ═════════════════════════════════════════════════════════════════════════════
// QR Modal
// ═════════════════════════════════════════════════════════════════════════════
async function showQrModal(url: string): Promise<void> {
  const root = document.getElementById('qr-modal-root')!;
  root.innerHTML = `
    <div class="qr-modal-backdrop" id="qr-backdrop">
      <div class="qr-modal">
        <h3><i data-lucide="share-2" class="lucide-icon"></i> Share Simulation</h3>
        <canvas id="qr-canvas"></canvas>
        <p>Scan or copy the link to share this simulation.</p>
        <button class="btn btn-primary" id="btn-qr-close" style="margin-top:1rem">Close</button>
      </div>
    </div>`;
  createIcons({ icons });
  await generateQr(url, document.getElementById('qr-canvas') as HTMLCanvasElement);
  document.getElementById('btn-qr-close')!.addEventListener('click', () => { root.innerHTML = ''; });
  document.getElementById('qr-backdrop')!.addEventListener('click', e => {
    if (e.target === e.currentTarget) root.innerHTML = '';
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Keyboard shortcuts
// ═════════════════════════════════════════════════════════════════════════════
function showShortcuts(): void {
  const root = document.getElementById('shortcuts-modal-root')!;
  root.innerHTML = `
    <div class="qr-modal-backdrop" id="sc-backdrop">
      <div class="qr-modal" style="min-width:340px;text-align:left">
        <h3 style="display:flex;align-items:center;gap:0.4rem"><i data-lucide="help-circle" class="lucide-icon"></i> Keyboard Shortcuts</h3>
        <table style="width:100%;border-collapse:collapse;margin-top:0.75rem;font-size:0.85rem">
          <tr><td style="padding:0.35rem 0;color:var(--accent);font-family:var(--mono)">Enter / S</td><td style="padding-left:1rem">Run simulation</td></tr>
          <tr><td style="padding:0.35rem 0;color:var(--accent);font-family:var(--mono)">Space</td><td style="padding-left:1rem">Play / Pause animation</td></tr>
          <tr><td style="padding:0.35rem 0;color:var(--accent);font-family:var(--mono)">Escape</td><td style="padding-left:1rem">Stop animation</td></tr>
          <tr><td style="padding:0.35rem 0;color:var(--accent);font-family:var(--mono)">T</td><td style="padding-left:1rem">Toggle Light/Dark Theme</td></tr>
          <tr><td style="padding:0.35rem 0;color:var(--accent);font-family:var(--mono)">L</td><td style="padding-left:1rem">Toggle Learn Mode</td></tr>
          <tr><td style="padding:0.35rem 0;color:var(--accent);font-family:var(--mono)">H</td><td style="padding-left:1rem">Toggle Hebrew/English</td></tr>
          <tr><td style="padding:0.35rem 0;color:var(--accent);font-family:var(--mono)">?</td><td style="padding-left:1rem">Show this panel</td></tr>
        </table>
        <button class="btn btn-primary" id="btn-sc-close" style="margin-top:1rem;width:100%">Close</button>
      </div>
    </div>`;
  createIcons({ icons });
  document.getElementById('btn-sc-close')!.addEventListener('click', () => { root.innerHTML = ''; });
  document.getElementById('sc-backdrop')!.addEventListener('click', e => {
    if (e.target === e.currentTarget) root.innerHTML = '';
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Bootstrap
// ═════════════════════════════════════════════════════════════════════════════
async function init(): Promise<void> {
  const dateEl = document.getElementById('input-date') as HTMLInputElement;
  dateEl.value = new Date().toISOString().split('T')[0];

  (document.getElementById('input-hour') as HTMLInputElement).value =
    String(new Date().getHours() + Math.round(new Date().getMinutes() / 15) * 0.25);

  initCollapsibles();
  initPresets();

  linkSlider('slider-V',     'input-V');
  linkSlider('slider-degY',  'input-degY');
  linkSlider('slider-degZ',  'input-degZ');
  linkSlider('slider-vWind', 'input-vWind');

  const updateSliderProgress = (slider: HTMLInputElement) => {
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value) || 0;
    const percent = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    slider.style.setProperty('--progress', `${percent}%`);
  };

  document.querySelectorAll('input[type="range"]').forEach(el => {
    const slider = el as HTMLInputElement;
    updateSliderProgress(slider);
    slider.addEventListener('input', () => updateSliderProgress(slider));
  });

  const mcN    = document.getElementById('mc-n') as HTMLInputElement;
  const mcNVal = document.getElementById('mc-n-val') as HTMLInputElement;
  mcN.addEventListener('input', () => { mcNVal.value = mcN.value; });
  mcNVal.addEventListener('input', () => { mcN.value = mcNVal.value; });

  initMap('map-container', (lat, lon) => {
    (document.getElementById('input-lat') as HTMLInputElement).value = lat.toFixed(5);
    (document.getElementById('input-lon') as HTMLInputElement).value = lon.toFixed(5);
    setLaunchPin(lat, lon);
  });

  init3DViewer(document.getElementById('canvas-3d') as HTMLCanvasElement);

  initAnimation(
    document.getElementById('canvas-3d') as HTMLCanvasElement,
    document.getElementById('hud-panel')!,
    document.getElementById('anim-scrub') as HTMLInputElement
  );

  refreshHistoryList();

  document.getElementById('btn-simulate')!.addEventListener('click', () => simulate(true));

  document.getElementById('chart-tabs')!.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest('[data-tab]') as HTMLElement | null;
    if (!btn) return;
    document.querySelectorAll('#chart-tabs .tab-btn').forEach(b => { b.classList.remove('active'); (b as HTMLButtonElement).setAttribute('aria-selected', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    currentChartTab = btn.dataset.tab as ChartTab;
    if (lastResult) renderChartView(lastResult, currentChartTab);
  });

  document.getElementById('btn-play')!.addEventListener('click', play);
  document.getElementById('btn-pause')!.addEventListener('click', pause);
  document.getElementById('btn-stop')!.addEventListener('click', stop);
  document.getElementById('anim-scrub')!.addEventListener('input', e => scrubTo(parseInt((e.target as HTMLInputElement).value)));
  // Custom dropdown logic for anim-speed
  const speedTrigger = document.getElementById('anim-speed-trigger')!;
  const speedDisplay = document.getElementById('anim-speed-display')!;
  const speedOptions = document.getElementById('anim-speed-options')!;
  
  // Move to body to escape overflow:hidden
  document.body.appendChild(speedOptions);
  
  const positionDropdown = () => {
    const rect = speedTrigger.getBoundingClientRect();
    speedOptions.style.position = 'fixed';
    speedOptions.style.left = `${rect.left}px`;
    speedOptions.style.minWidth = `${rect.width}px`;
    speedOptions.style.width = 'auto';
    speedOptions.style.margin = '0'; // override CSS margins
    
    // Check if there's enough space below, else open upwards
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    if (spaceBelow < 200 && spaceAbove > spaceBelow) {
      // Open upwards
      speedOptions.style.top = 'auto';
      speedOptions.style.bottom = `${window.innerHeight - rect.top + 4}px`;
      speedOptions.style.transformOrigin = 'bottom center';
    } else {
      // Open downwards
      speedOptions.style.bottom = 'auto';
      speedOptions.style.top = `${rect.bottom + 4}px`;
      speedOptions.style.transformOrigin = 'top center';
    }
  };
  
  speedTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!speedOptions.classList.contains('open')) {
      positionDropdown();
      speedOptions.classList.add('open');
    } else {
      speedOptions.classList.remove('open');
    }
  });

  window.addEventListener('resize', () => {
    if (speedOptions.classList.contains('open')) positionDropdown();
  });

  window.addEventListener('scroll', () => {
    if (speedOptions.classList.contains('open')) positionDropdown();
  }, true);

  document.addEventListener('click', (e) => {
    if (!speedTrigger.contains(e.target as Node) && !speedOptions.contains(e.target as Node)) {
      speedOptions.classList.remove('open');
    }
  });

  speedOptions.querySelectorAll('.custom-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const value = target.getAttribute('data-value') || '1';
      
      speedOptions.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
      target.classList.add('selected');
      
      speedDisplay.textContent = target.textContent;
      speedOptions.classList.remove('open');
      setSpeed(parseFloat(value));
    });
  });
  document.getElementById('btn-export-csv')!.addEventListener('click', () => {
    if (lastResult) exportCsv(lastResult);
  });
  document.getElementById('btn-export-png')!.addEventListener('click', () => {
    const chart = getActiveChart();
    if (chart) exportPng(chart.canvas);
  });
  document.getElementById('btn-print')!.addEventListener('click', () => {
    if (lastResult) printCard(lastResult);
  });
  document.getElementById('btn-share')!.addEventListener('click', async () => {
    if (!lastParams) return;
    const url = window.location.href;
    await copyShareUrl(lastParams as any);
    await showQrModal(url);
  });

  document.getElementById('btn-save-run')!.addEventListener('click', async () => {
    if (!lastResult || !lastParams) return;
    const res = await showPrompt('Label this run:', `${lastResult.d.toFixed(0)}m at ${new Date().toLocaleTimeString()}`);
    if (res === null) return;
    const label = res.trim() || 'Saved Run';
    saveRun(label, lastParams as any, lastResult);
    refreshHistoryList();
  });

  document.getElementById('btn-export-runs')!.addEventListener('click', exportRunsJson);
  document.getElementById('btn-clear-runs')!.addEventListener('click', async () => {
    if (await showConfirm('Clear all saved runs?')) {
      localStorage.removeItem('ubt_saved_runs');
      refreshHistoryList();
    }
  });

  document.getElementById('btn-weather')!.addEventListener('click', async () => {
    const btn = document.getElementById('btn-weather')!;
    btn.innerHTML = '<span class="spinner"></span>';
    btn.setAttribute('disabled', '');
    try {
      const lat = num('input-lat'); const lon = num('input-lon');
      const w = await fetchWeather(lat, lon);
      (document.getElementById('input-tempC') as HTMLInputElement).value = String(w.tempC);
      (document.getElementById('input-pressureMb') as HTMLInputElement).value = String(w.pressureMb);
      (document.getElementById('input-vWind') as HTMLInputElement).value = String(w.windSpeedMs);
      (document.getElementById('input-windDeg') as HTMLInputElement).value = String(w.windDeg);
      document.getElementById('weather-badge')!.innerHTML =
        `<span class="badge badge-green">✓ Weather fetched at ${w.fetchedAt}</span>`;
    } catch { document.getElementById('weather-badge')!.innerHTML = '<span class="badge badge-cyan">⚠ Offline – using manual values</span>'; }
    finally {
      btn.removeAttribute('disabled');
      btn.innerHTML = `<i data-lucide="cloud-rain" class="lucide-icon"></i> <span data-i18n="btn.weather">${t('btn.weather')}</span>`;
      createIcons({ icons });
    }
  });

  document.getElementById('btn-set-target')!.addEventListener('click', () => {
    const lat = num('input-lat');
    const lon = num('input-lon') + 0.05;
    setTargetPin(lat, lon);
  });

  document.getElementById('btn-autoaim')!.addEventListener('click', async () => {
    const tgt = getTargetLatLon();
    if (!tgt) { showToast('Place a target pin on the map first.', 'error'); return; }
    if (!lastParams) { showToast('Run a simulation first.'); return; }
    const btn = document.getElementById('btn-autoaim')!;
    btn.setAttribute('disabled', '');
    btn.innerHTML = '<span class="spinner"></span>';
    const sol = await new Promise<ReturnType<typeof solveAutoAim>>(resolve =>
      setTimeout(() => resolve(solveAutoAim(lastParams!, tgt[0], tgt[1])), 0)
    );
    btn.removeAttribute('disabled');
    btn.innerHTML = `<i data-lucide="crosshair" class="lucide-icon"></i> <span data-i18n="btn.autoaim">${t('btn.autoaim')}</span>`;
    createIcons({ icons });
    if (!sol) { showToast('No solution found — target may be out of range.', 'error'); return; }
    const container = document.getElementById('aim-results-container')!;
    const grid = document.getElementById('aim-solution-grid')!;
    flip(container, () => { container.style.display = 'block'; });
    grid.innerHTML = [
      { label: 'Elevation', val: `${sol.elevationDeg.toFixed(2)}°` },
      { label: 'Azimuth',   val: `${sol.azimuthDeg.toFixed(2)}°` },
      { label: 'ToF',       val: `${sol.flightTimeS.toFixed(2)} s` },
      { label: 'Term. Spd', val: `${sol.termSpeedMs.toFixed(1)} m/s` },
      { label: 'KE Impact', val: `${(sol.kineticEnergyJ/1000).toFixed(1)} kJ` },
      { label: 'Miss',      val: `${sol.missMarginM.toFixed(1)} m` },
    ].map(i => `<div class="aim-item"><div class="aim-label">${i.label}</div><div class="aim-val">${i.val}</div></div>`).join('');
    (document.getElementById('input-degY') as HTMLInputElement).value = String(sol.elevationDeg.toFixed(2));
    (document.getElementById('input-degZ') as HTMLInputElement).value = String(sol.azimuthDeg.toFixed(2));
  });

  document.getElementById('btn-monte-run')!.addEventListener('click', () => {
    if (!lastParams) { showToast('Run a simulation first.'); return; }
    const n = parseInt((document.getElementById('mc-n') as HTMLInputElement).value);
    const mc = runMonteCarlo(lastParams, n, {
      V:          num('mc-dV', 2),
      degY:       num('mc-dY', 0.5),
      degZ:       num('mc-dZ', 0.5),
      windSpd:    num('mc-dW', 1),
      pressureMb: 2,
      mass:       0,
    });
    renderMonteCarlo(mc);
    const stats = document.getElementById('mc-stats')!;
    stats.style.display = 'block';
    stats.innerHTML = `CEP radius: <span>${mc.cepRadius.toFixed(1)} m</span> &nbsp;·&nbsp; N = <span>${n}</span>`;
  });

  document.getElementById('btn-ft-generate')!.addEventListener('click', () => {
    if (!lastParams) { showToast('Run a simulation first.'); return; }
    const step = parseInt((document.getElementById('ft-step') as HTMLInputElement).value) || 5;
    const rows = generateFiringTable({ ...lastParams, snapshotEvery: 999999 }, step);
    renderFiringTable(rows, document.getElementById('ft-container')!);
  });
  document.getElementById('btn-ft-csv')!.addEventListener('click', () => {
    if (!lastParams) return;
    const step = parseInt((document.getElementById('ft-step') as HTMLInputElement).value) || 5;
    firingTableCsv(generateFiringTable({ ...lastParams, snapshotEvery: 999999 }, step));
  });

  document.getElementById('btn-lang-en')!.addEventListener('click', () => {
    setLang('en');
    document.getElementById('btn-lang-en')!.classList.add('active');
    document.getElementById('btn-lang-he')!.classList.remove('active');
  });
  document.getElementById('btn-lang-he')!.addEventListener('click', () => {
    setLang('he');
    document.getElementById('btn-lang-he')!.classList.add('active');
    document.getElementById('btn-lang-en')!.classList.remove('active');
  });

  ['metric','imperial','nautical'].forEach(sys => {
    document.getElementById(`btn-unit-${sys}`)!.addEventListener('click', () => {
      setUnitSystem(sys as any);
      document.querySelectorAll('.units-toggle button').forEach(b => b.classList.remove('active'));
      document.getElementById(`btn-unit-${sys}`)!.classList.add('active');
      if (lastResult) renderResults(lastResult);
    });
  });

  const themeBtn = document.getElementById('btn-theme') || document.getElementById('btn-contrast');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }

  onThemeChange(() => {
    if (lastResult) {
      renderChartView(lastResult, currentChartTab);
      set3DTrajectory(lastResult.trajectory);
    }
  });

  document.getElementById('btn-learn')!.addEventListener('click', showEducation);
  document.getElementById('btn-close-learn')?.addEventListener('click', () => {
    const card = document.getElementById('card-education')!;
    flip(card, () => { card.style.display = 'none'; });
  });

  document.getElementById('btn-shortcuts')!.addEventListener('click', showShortcuts);

  document.addEventListener('keydown', e => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    switch (e.key) {
      case 'Enter': case 's': simulate(true); break;
      case ' ': e.preventDefault(); lastResult ? play() : undefined; break;
      case 'Escape': stop(); break;
      case 't': case 'T': toggleTheme(); break;
      case 'l': case 'L': document.getElementById('btn-learn')!.click(); break;
      case 'h': case 'H': {
        const l = getLang() === 'en' ? 'he' : 'en';
        document.getElementById(`btn-lang-${l}`)!.click();
        break;
      }
      case '?': showShortcuts(); break;
    }
  });

  const sp = new URLSearchParams(window.location.search);
  sp.forEach((v, k) => {
    const el = document.getElementById(`input-${k}`) as HTMLInputElement | null;
    if (el) el.value = v;
  });
  if (sp.size > 0) simulate();

  initTheme();
  initCardObserver();
  initInteractivePicker({
    onSimulate: () => simulate(true),
  });
  applyTranslations();
  createIcons({ icons });
}

init();

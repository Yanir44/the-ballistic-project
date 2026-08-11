import L from 'leaflet';
import { createIcons, icons } from 'lucide';
import { t } from './i18n';
import { setLaunchPin, setTargetPin } from './map';
import { solveAutoAim } from './autoaim';
import { fetchWeather } from './weather';

interface PickerOptions {
  onSimulate: () => void;
  autoOpen?: boolean;
}

const PICKER_STEPS = [
  {
    id: 'card-presets',
    titleKey: 'preset.label',
    fallbackTitle: 'Preset',
    subtitleEn: 'Choose a quick starting template or custom setup',
    subtitleHe: 'בחר תצורה מוגדרת מראש או הגדרה מותאמת אישית',
  },
  {
    id: 'card-location',
    titleKey: 'card.location',
    fallbackTitle: 'Location & Time',
    subtitleEn: 'Set launch coordinates, date, and hour of day',
    subtitleHe: 'הגדר קואורדינטות שיגור, תאריך ושעה',
  },
  {
    id: 'card-target',
    titleKey: 'card.target',
    fallbackTitle: 'Target & Auto-Aim',
    subtitleEn: 'Click target map to solve optimal elevation & azimuth',
    subtitleHe: 'לחץ על מפת היעד לחישוב זווית גובה ואזימוט',
  },
  {
    id: 'card-projectile',
    titleKey: 'card.projectile',
    fallbackTitle: 'Projectile',
    subtitleEn: 'Set speed, angles, mass, height, and drag coefficient',
    subtitleHe: 'הגדר מהירות, זוויות, מסה, גובה ומקדם גרר',
  },
  {
    id: 'card-shape',
    titleKey: 'card.shape',
    fallbackTitle: 'Object Shape',
    subtitleEn: 'Define cross-sectional diameters for drag calculation',
    subtitleHe: 'הגדר קוטרי חתך לחישוב גרר פיזיקלי',
  },
  {
    id: 'card-atmo',
    titleKey: 'card.atmosphere',
    fallbackTitle: 'Atmosphere',
    subtitleEn: 'Configure wind, pressure, temperature, and altitude model',
    subtitleHe: 'הגדר רוח, לחץ, טמפרטורה ומודל אטמוספרה',
  },
];

let activeStep = 0;
let isOpen = false;
let simulateCallback: (() => void) | null = null;
let navDirection: 'next' | 'prev' = 'next';
let currentCardIdInStage: string | null = null;

const originalParents = new Map<string, { parent: HTMLElement; nextSibling: Node | null }>();

// Maps state
let miniLaunchMap: L.Map | null = null;
let miniLaunchMarker: L.Marker | null = null;

let miniTargetMap: L.Map | null = null;
let miniTargetMarker: L.Marker | null = null;

// Arc Animation Interpolation state
let currentArcPoints: { x: number; y: number }[] = [];
let targetArcPoints: { x: number; y: number }[] = [];
let animFrameId: number | null = null;
let animProgress = 1;

const launchSvg = `<div class="map-marker-pin launch"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`;
const targetSvg = `<div class="map-marker-pin target"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="6"/><line x1="12" x2="12" y1="18" y2="22"/></svg></div>`;

export function initInteractivePicker(options: PickerOptions): void {
  simulateCallback = options.onSimulate;

  // Track original parent locations for cards
  PICKER_STEPS.forEach((step) => {
    const cardEl = document.getElementById(step.id);
    if (cardEl && cardEl.parentElement) {
      originalParents.set(step.id, {
        parent: cardEl.parentElement as HTMLElement,
        nextSibling: cardEl.nextSibling,
      });
    }
  });

  // Attach event listener to launch button
  const launchBtn = document.getElementById('btn-interactive-picker');
  if (launchBtn) {
    launchBtn.addEventListener('click', openPicker);
  }

  // Bind close buttons and overlay click
  const closeBtn = document.getElementById('picker-btn-close');
  if (closeBtn) closeBtn.addEventListener('click', closePicker);

  const backdrop = document.getElementById('picker-backdrop');
  if (backdrop) backdrop.addEventListener('click', closePicker);

  const backBtn = document.getElementById('picker-btn-back');
  if (backBtn) backBtn.addEventListener('click', prevStep);

  const nextBtn = document.getElementById('picker-btn-next');
  if (nextBtn) nextBtn.addEventListener('click', handleNext);

  // Bind Target Auto-Aim Solver inside Card Target
  const solveAimBtn = document.getElementById('btn-picker-solve-aim');
  if (solveAimBtn) {
    solveAimBtn.addEventListener('click', runPickerAutoAim);
  }

  // Bind Weather Fetch Button
  const weatherBtn = document.getElementById('btn-weather');
  if (weatherBtn) {
    weatherBtn.addEventListener('click', handlePickerWeather);
  }

  // Bind Wind Compass quick-select buttons
  document.querySelectorAll('.btn-compass').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const deg = (e.currentTarget as HTMLElement).dataset.windDeg;
      const windDegInput = document.getElementById('input-windDeg') as HTMLInputElement;
      if (windDegInput && deg !== undefined) {
        windDegInput.value = deg;
        updateArcPreview();
      }
    });
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      closePicker();
    } else if (e.key === 'ArrowRight') {
      const isRtl = document.documentElement.dir === 'rtl';
      if (isRtl) prevStep(); else handleNext();
    } else if (e.key === 'ArrowLeft') {
      const isRtl = document.documentElement.dir === 'rtl';
      if (isRtl) handleNext(); else prevStep();
    } else if (e.key === 'Enter') {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag !== 'input' && activeTag !== 'select' && activeTag !== 'textarea') {
        handleNext();
      }
    }
  });

  // Attach live preview recalculation listeners to input elements
  const inputIds = ['input-V', 'slider-V', 'input-degY', 'slider-degY', 'input-M', 'input-cd', 'input-y0', 'input-vWind', 'input-windDeg'];
  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateArcPreview);
      el.addEventListener('change', updateArcPreview);
    }
  });

  // Always auto-open wizard on startup
  setTimeout(() => {
    openPicker();
  }, 150);
}

export function openPicker(): void {
  const modal = document.getElementById('interactive-picker-modal');
  if (!modal) return;

  isOpen = true;
  activeStep = 0;
  navDirection = 'next';
  modal.style.display = 'flex';
  document.body.classList.add('picker-open');

  renderStep();
}

export function closePicker(): void {
  const modal = document.getElementById('interactive-picker-modal');
  if (!modal) return;

  isOpen = false;
  modal.style.display = 'none';
  document.body.classList.remove('picker-open');

  // Restore all cards to original parent positions, expanding them so the user can see their selections
  PICKER_STEPS.forEach((step) => {
    restoreCard(step.id, true);
  });
}

function restoreCard(cardId: string, expand: boolean = false): void {
  const cardEl = document.getElementById(cardId);
  const info = originalParents.get(cardId);
  if (cardEl && info && info.parent) {
    // Remove placeholder if it exists
    const placeholder = (cardEl as any)._placeholder as HTMLElement;
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.removeChild(placeholder);
    }
    delete (cardEl as any)._placeholder;

    // Expand or collapse the card body when returning to the sidebar
    const bodyId = `${cardId}-body`;
    const cardBody = document.getElementById(bodyId) || cardEl.querySelector('.card-body');
    if (cardBody) {
      if (expand) {
        cardBody.classList.remove('collapsed');
      } else {
        cardBody.classList.add('collapsed');
      }
    }

    const currentParent = cardEl.parentNode;
    const currentNextSibling = cardEl.nextSibling;
    
    // Only move the node if it's not already in its target position
    // This prevents layout thrashing and "flashing" of background cards
    const needsMove = currentParent !== info.parent || 
      (info.nextSibling && currentNextSibling !== info.nextSibling && info.parent.contains(info.nextSibling));

    if (needsMove) {
      if (info.nextSibling && info.parent.contains(info.nextSibling)) {
        info.parent.insertBefore(cardEl, info.nextSibling);
      } else {
        info.parent.appendChild(cardEl);
      }
    }
    
    if (cardEl.className !== 'card') {
      cardEl.className = 'card';
    }
    
    cardEl.style.position = '';
    cardEl.style.top = '';
    cardEl.style.left = '';
    cardEl.style.width = '';
    cardEl.style.pointerEvents = '';
    
    // Cancel any ongoing Web Animations
    const anims = cardEl.getAnimations();
    if (anims.length > 0) {
      anims.forEach(a => a.cancel());
    }
  }
}

function insertPlaceholderFor(cardId: string): void {
  const cardEl = document.getElementById(cardId);
  const info = originalParents.get(cardId);
  if (!cardEl || !info || !info.parent) return;

  if ((cardEl as any)._placeholder) return;

  const placeholder = cardEl.cloneNode(true) as HTMLElement;
  placeholder.removeAttribute('id');
  placeholder.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  
  // Force the placeholder to be collapsed so it looks like a normal sidebar item
  // and hides any blank cloned canvases.
  const body = placeholder.querySelector('.card-body');
  if (body) {
    body.classList.add('collapsed');
  }

  placeholder.className = 'card';
  placeholder.style.pointerEvents = 'none';

  if (info.nextSibling && info.parent.contains(info.nextSibling)) {
    info.parent.insertBefore(placeholder, info.nextSibling);
  } else {
    info.parent.appendChild(placeholder);
  }

  (cardEl as any)._placeholder = placeholder;
}

function prevStep(): void {
  if (activeStep > 0) {
    activeStep--;
    navDirection = 'prev';
    renderStep();
  }
}

function handleNext(): void {
  if (activeStep < PICKER_STEPS.length - 1) {
    activeStep++;
    navDirection = 'next';
    renderStep();
  } else {
    // Final step: Simulate!
    closePicker();
    if (simulateCallback) {
      simulateCallback();
    }
  }
}

export function renderStep(): void {
  const modal = document.getElementById('interactive-picker-modal');
  const container = document.querySelector('.picker-modal-container') as HTMLElement;
  const stage = document.getElementById('picker-card-stage');
  const stepperDots = document.getElementById('picker-stepper-dots');
  const stepCounter = document.getElementById('picker-step-counter');
  const stepSubtitle = document.getElementById('picker-step-subtitle');
  const backBtn = document.getElementById('picker-btn-back') as HTMLButtonElement;
  const nextBtn = document.getElementById('picker-btn-next') as HTMLButtonElement;
  const progressBar = document.getElementById('picker-progress-fill');

  if (!modal || !stage) return;

  const currentStepData = PICKER_STEPS[activeStep];
  const activeCardId = currentStepData.id;
  const isRtl = document.documentElement.dir === 'rtl';

  // Measure initial container height for smooth height animation
  const firstHeight = container ? container.getBoundingClientRect().height : 0;
  
  const previousCardId = currentCardIdInStage;

  // 1. Synchronously restore all non-active cards back to sidebar EXCEPT the incoming and outgoing cards
  PICKER_STEPS.forEach((step) => {
    if (step.id !== activeCardId && step.id !== previousCardId) {
      restoreCard(step.id);
    }
  });

  const previousCard = previousCardId ? document.getElementById(previousCardId) : null;
  const activeCard = document.getElementById(activeCardId);

  if (activeCard) {
    if (previousCard && previousCard !== activeCard && stage.contains(previousCard)) {
      // Slide OUT previous card using Web Animations API
      previousCard.style.position = 'absolute';
      previousCard.style.top = '0';
      previousCard.style.left = '0';
      previousCard.style.width = '100%';
      previousCard.style.pointerEvents = 'none';

      const xOffsetOut = navDirection === 'next' ? '-120%' : '120%';
      
      const outAnim = previousCard.animate([
        { transform: 'translateX(0)' },
        { transform: `translateX(${xOffsetOut})` }
      ], { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });

      outAnim.onfinish = () => {
        restoreCard(previousCard.id);
      };
    }

    // Now slide IN the active card
    activeCard.className = 'card in-picker-modal';
    activeCard.style.position = 'relative'; // Ensure relative so it drives stage height
    
    // Expand body inside picker modal
    const bodyId = `${activeCardId}-body`;
    const cardBody = document.getElementById(bodyId) || activeCard.querySelector('.card-body');
    if (cardBody) {
      cardBody.classList.remove('collapsed');
    }

    if (!stage.contains(activeCard)) {
       insertPlaceholderFor(activeCardId);
       stage.appendChild(activeCard);
    }

    // Since Web Animations override CSS transforms during execution, this won't conflict with any lingering classes
    const xOffsetIn = navDirection === 'next' ? '120%' : '-120%';
    activeCard.animate([
      { transform: `translateX(${xOffsetIn})` },
      { transform: 'translateX(0)' }
    ], { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    
    currentCardIdInStage = activeCardId;
  }

  // 3. Setup Location Step Mini Map if on Step 2 (card-location)
  if (activeCardId === 'card-location') {
    setTimeout(initOrUpdateLaunchMap, 350); // Deferred to prevent animation lag
  }

  // 4. Setup Target Step Mini Map if on Step 3 (card-target)
  if (activeCardId === 'card-target') {
    setTimeout(initOrUpdateTargetMap, 350); // Deferred to prevent animation lag
  }

  // 5. Update step counter & subtitle
  if (stepCounter) {
    const stepWord = t('picker.step');
    const ofWord = t('picker.of');
    const title = t(currentStepData.titleKey) || currentStepData.fallbackTitle;
    stepCounter.innerHTML = `<span class="step-num">${stepWord} ${activeStep + 1} ${ofWord} ${PICKER_STEPS.length}</span> — <span class="step-title">${title}</span>`;
  }

  if (stepSubtitle) {
    const isHe = document.documentElement.lang === 'he';
    stepSubtitle.textContent = isHe ? currentStepData.subtitleHe : currentStepData.subtitleEn;
  }

  // 6. Update progress bar width
  if (progressBar) {
    const pct = ((activeStep + 1) / PICKER_STEPS.length) * 100;
    progressBar.style.width = `${pct}%`;
  }

  // 7. Render stepper pills/dots (All 6 fit in 1 row)
  if (stepperDots) {
    stepperDots.innerHTML = '';
    let activePill: HTMLButtonElement | null = null;
    PICKER_STEPS.forEach((step, idx) => {
      const pill = document.createElement('button');
      pill.className = `picker-step-pill ${idx === activeStep ? 'active' : ''} ${idx < activeStep ? 'completed' : ''}`;
      pill.title = t(step.titleKey) || step.fallbackTitle;
      pill.setAttribute('aria-label', pill.title);
      pill.innerHTML = `
        <span class="pill-badge">${idx < activeStep ? '✓' : idx + 1}</span>
        <span class="pill-label">${t(step.titleKey) || step.fallbackTitle}</span>
      `;
      pill.addEventListener('click', () => {
        navDirection = idx > activeStep ? 'next' : 'prev';
        activeStep = idx;
        renderStep();
      });
      stepperDots.appendChild(pill);
      if (idx === activeStep) {
        activePill = pill;
      }
    });

    if (activePill) {
      setTimeout(() => {
        activePill?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 50);
    }
  }

  // 8. Update Back & Next/Simulate buttons
  if (backBtn) {
    backBtn.disabled = activeStep === 0;
  }

  if (nextBtn) {
    const isFinal = activeStep === PICKER_STEPS.length - 1;
    if (isFinal) {
      nextBtn.className = 'btn btn-primary btn-picker-simulate';
      nextBtn.innerHTML = `<i data-lucide="play"></i> <span>${t('btn.simulate')}</span>`;
    } else {
      nextBtn.className = 'btn btn-primary';
      const arrowIcon = isRtl ? 'chevron-left' : 'chevron-right';
      nextBtn.innerHTML = `<span>${t('btn.next')}</span> <i data-lucide="${arrowIcon}"></i>`;
    }
  }

  // 9. Update real-time 2D arc preview canvas (Deferred to prevent animation lag)
  setTimeout(updateArcPreview, 350);

  // Re-initialize lucide icons inside picker modal
  try {
    createIcons({ icons });
  } catch (e) {
    // Lucide fallback
  }

  // Measure final height and execute Web Animations API height transition
  if (container && firstHeight > 0) {
    const lastHeight = container.getBoundingClientRect().height;
    if (Math.abs(firstHeight - lastHeight) > 2) {
      container.animate([
        { height: `${firstHeight}px` },
        { height: `${lastHeight}px` }
      ], {
        duration: 300,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      });
    }
  }
}

// ── Launch Mini Map Initialization for Location Card Step ────────────────────
function initOrUpdateLaunchMap(): void {
  const container = document.getElementById('picker-location-map');
  if (!container) return;

  const latInput = document.getElementById('input-lat') as HTMLInputElement;
  const lonInput = document.getElementById('input-lon') as HTMLInputElement;
  const lat = parseFloat(latInput?.value || '31.7683');
  const lon = parseFloat(lonInput?.value || '35.2137');

  if (!miniLaunchMap) {
    miniLaunchMap = L.map(container, { zoomControl: true, attributionControl: false }).setView([lat, lon], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(miniLaunchMap);

    miniLaunchMarker = L.marker([lat, lon], {
      icon: L.divIcon({ className: 'map-launch-icon', html: launchSvg, iconSize: [28, 28], iconAnchor: [14, 28] }),
    }).addTo(miniLaunchMap);

    miniLaunchMap.on('click', (e: L.LeafletMouseEvent) => {
      const newLat = parseFloat(e.latlng.lat.toFixed(4));
      const newLon = parseFloat(e.latlng.lng.toFixed(4));

      if (latInput) latInput.value = String(newLat);
      if (lonInput) lonInput.value = String(newLon);

      if (miniLaunchMarker) miniLaunchMarker.setLatLng([newLat, newLon]);
      setLaunchPin(newLat, newLon);
    });
  } else {
    miniLaunchMap.setView([lat, lon], miniLaunchMap.getZoom());
    if (miniLaunchMarker) miniLaunchMarker.setLatLng([lat, lon]);
  }

  setTimeout(() => {
    miniLaunchMap?.invalidateSize();
  }, 100);
}

// ── Target Mini Map Initialization for Target Card Step ──────────────────────
function initOrUpdateTargetMap(): void {
  const container = document.getElementById('picker-target-map');
  if (!container) return;

  const latInput = document.getElementById('input-target-lat') as HTMLInputElement;
  const lonInput = document.getElementById('input-target-lon') as HTMLInputElement;
  const lat = parseFloat(latInput?.value || '31.8500');
  const lon = parseFloat(lonInput?.value || '35.3000');

  if (!miniTargetMap) {
    miniTargetMap = L.map(container, { zoomControl: true, attributionControl: false }).setView([lat, lon], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(miniTargetMap);

    miniTargetMarker = L.marker([lat, lon], {
      icon: L.divIcon({ className: 'map-target-icon', html: targetSvg, iconSize: [28, 28], iconAnchor: [14, 14] }),
    }).addTo(miniTargetMap);

    miniTargetMap.on('click', (e: L.LeafletMouseEvent) => {
      const newLat = parseFloat(e.latlng.lat.toFixed(4));
      const newLon = parseFloat(e.latlng.lng.toFixed(4));

      if (latInput) latInput.value = String(newLat);
      if (lonInput) lonInput.value = String(newLon);

      if (miniTargetMarker) miniTargetMarker.setLatLng([newLat, newLon]);
      setTargetPin(newLat, newLon);

      // Auto-run solver on target map click!
      runPickerAutoAim();
    });
  } else {
    miniTargetMap.setView([lat, lon], miniTargetMap.getZoom());
    if (miniTargetMarker) miniTargetMarker.setLatLng([lat, lon]);
  }

  setTimeout(() => {
    miniTargetMap?.invalidateSize();
  }, 100);
}

// ── Auto-Aim Solver Handler inside Target Card ──────────────────────────────
function runPickerAutoAim(): void {
  const targetLat = parseFloat((document.getElementById('input-target-lat') as HTMLInputElement)?.value || '31.8500');
  const targetLon = parseFloat((document.getElementById('input-target-lon') as HTMLInputElement)?.value || '35.3000');
  const statusEl = document.getElementById('picker-aim-solution-status');

  const baseParams = {
    latitudeDeg: parseFloat((document.getElementById('input-lat') as HTMLInputElement)?.value || '31.7683'),
    longitudeDeg: parseFloat((document.getElementById('input-lon') as HTMLInputElement)?.value || '35.2137'),
    day: 172,
    hour: 12,
    V: parseFloat((document.getElementById('input-V') as HTMLInputElement)?.value || '100'),
    degY: 45,
    degZ: 0,
    M: parseFloat((document.getElementById('input-M') as HTMLInputElement)?.value || '1'),
    y0: parseFloat((document.getElementById('input-y0') as HTMLInputElement)?.value || '1'),
    cd: parseFloat((document.getElementById('input-cd') as HTMLInputElement)?.value || '0.47'),
    diamFront: 0.1,
    diamSide: 0.2,
    diamBottom: 0.1,
    vWind: 0,
    pressureMb: 1013.25,
    tempC: 20,
    windDeg: 0,
    useISA: false,
    dt: 0.01,
    snapshotEvery: 50,
  };

  const solution = solveAutoAim(baseParams, targetLat, targetLon);

  if (solution) {
    const elevInput = document.getElementById('input-degY') as HTMLInputElement;
    const azimInput = document.getElementById('input-degZ') as HTMLInputElement;
    const elevSlider = document.getElementById('slider-degY') as HTMLInputElement;
    const azimSlider = document.getElementById('slider-degZ') as HTMLInputElement;

    if (elevInput) elevInput.value = solution.elevationDeg.toFixed(2);
    if (azimInput) azimInput.value = solution.azimuthDeg.toFixed(2);
    if (elevSlider) elevSlider.value = solution.elevationDeg.toFixed(2);
    if (azimSlider) azimSlider.value = solution.azimuthDeg.toFixed(2);

    setTargetPin(targetLat, targetLon);

    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.innerHTML = `<strong>Solution Found!</strong> Elevation: <strong>${solution.elevationDeg.toFixed(1)}°</strong> | Azimuth: <strong>${solution.azimuthDeg.toFixed(1)}°</strong> | Range: <strong>${(solution.predictedRangeM / 1000).toFixed(2)} km</strong>`;
    }
  } else if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.innerHTML = `<span style="color:var(--red);">Target out of range for current velocity. Increase speed (m/s).</span>`;
  }

  updateArcPreview();
}

// ── Live Weather Auto-Fetch Handler ─────────────────────────────────────────
async function handlePickerWeather(): Promise<void> {
  const lat = parseFloat((document.getElementById('input-lat') as HTMLInputElement)?.value || '31.7683');
  const lon = parseFloat((document.getElementById('input-lon') as HTMLInputElement)?.value || '35.2137');
  const badge = document.getElementById('weather-badge');

  try {
    if (badge) badge.textContent = 'Fetching weather…';
    const data = await fetchWeather(lat, lon);

    const windInput = document.getElementById('input-vWind') as HTMLInputElement;
    const windSlider = document.getElementById('slider-vWind') as HTMLInputElement;
    const windDegInput = document.getElementById('input-windDeg') as HTMLInputElement;
    const tempInput = document.getElementById('input-tempC') as HTMLInputElement;
    const pressInput = document.getElementById('input-pressureMb') as HTMLInputElement;

    if (windInput) windInput.value = String(data.windSpeedMs);
    if (windSlider) windSlider.value = String(data.windSpeedMs);
    if (windDegInput) windDegInput.value = String(data.windDeg);
    if (tempInput) tempInput.value = String(data.tempC);
    if (pressInput) pressInput.value = String(data.pressureMb);

    if (badge) {
      badge.textContent = `Updated: ${data.tempC}°C, Wind ${data.windSpeedMs} m/s @ ${data.fetchedAt}`;
      badge.style.color = 'var(--green)';
    }

    updateArcPreview();
  } catch (e) {
    if (badge) {
      badge.textContent = 'Failed to fetch weather data.';
      badge.style.color = 'var(--red)';
    }
  }
}

// ── Animated Real-Time 2D Arc Trajectory Preview Generator ────────────────────
function updateArcPreview(): void {
  const canvas = document.getElementById('picker-preview-canvas') as HTMLCanvasElement | null;
  const statsEl = document.getElementById('picker-preview-stats');
  if (!canvas) return;

  const v0 = parseFloat((document.getElementById('input-V') as HTMLInputElement)?.value || '100');
  const degY = parseFloat((document.getElementById('input-degY') as HTMLInputElement)?.value || '45');
  const y0 = parseFloat((document.getElementById('input-y0') as HTMLInputElement)?.value || '0');
  const cd = parseFloat((document.getElementById('input-cd') as HTMLInputElement)?.value || '0.47');
  const mass = parseFloat((document.getElementById('input-M') as HTMLInputElement)?.value || '1');
  const vWind = parseFloat((document.getElementById('input-vWind') as HTMLInputElement)?.value || '0');

  // Compute Muzzle Kinetic Energy (E_k = 0.5 * m * v^2)
  const keJoules = 0.5 * mass * v0 * v0;
  const keFormatted = keJoules > 1000000 ? `${(keJoules / 1000000).toFixed(2)} MJ` : keJoules > 1000 ? `${(keJoules / 1000).toFixed(1)} kJ` : `${keJoules.toFixed(0)} J`;

  const g = 9.80665;
  const rad = (degY * Math.PI) / 180;
  let vx = v0 * Math.cos(rad) - vWind;
  let vy = v0 * Math.sin(rad);

  let x = 0;
  let y = Math.max(0, y0);
  const newPoints: { x: number; y: number }[] = [{ x: 0, y }];
  let maxY = y;
  const dt = 0.05;

  const area = 0.01;
  const rho = 1.225;
  const dragConst = 0.5 * rho * cd * area / Math.max(0.01, mass);

  while (y >= 0 && newPoints.length < 300) {
    const vMag = Math.sqrt(vx * vx + vy * vy);
    const ax = -dragConst * vMag * vx;
    const ay = -g - dragConst * vMag * vy;

    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;

    if (y > maxY) maxY = y;
    newPoints.push({ x: Math.max(0, x), y: Math.max(0, y) });
  }

  const maxX = newPoints[newPoints.length - 1].x;

  if (statsEl) {
    statsEl.innerHTML = `Muzzle E: <strong style="color:var(--gold);">${keFormatted}</strong> | Max Alt: <strong style="color:var(--accent);">${maxY.toFixed(1)} m</strong> | Range: <strong style="color:var(--accent);">${maxX > 1000 ? (maxX / 1000).toFixed(2) + ' km' : maxX.toFixed(1) + ' m'}</strong>`;
  }

  // Set animation targets
  targetArcPoints = newPoints;
  if (currentArcPoints.length === 0) {
    currentArcPoints = newPoints;
  }

  // Trigger smooth requestAnimationFrame interpolation animation
  animProgress = 0;
  if (animFrameId) cancelAnimationFrame(animFrameId);

  const startPoints = [...currentArcPoints];

  function animateArcStep() {
    animProgress += 0.14;
    if (animProgress >= 1) animProgress = 1;

    // Resample / interpolate points array
    const len = Math.max(startPoints.length, targetArcPoints.length);
    const interpolated: { x: number; y: number }[] = [];

    for (let i = 0; i < len; i++) {
      const idxA = Math.min(i, startPoints.length - 1);
      const idxB = Math.min(i, targetArcPoints.length - 1);
      const pA = startPoints[idxA] || { x: 0, y: 0 };
      const pB = targetArcPoints[idxB] || { x: 0, y: 0 };

      interpolated.push({
        x: pA.x + (pB.x - pA.x) * animProgress,
        y: pA.y + (pB.y - pA.y) * animProgress,
      });
    }

    currentArcPoints = interpolated;
    drawArcCanvas(canvas!, interpolated, maxX, maxY);

    if (animProgress < 1) {
      animFrameId = requestAnimationFrame(animateArcStep);
    }
  }

  animateArcStep();
}

function drawArcCanvas(canvas: HTMLCanvasElement, points: { x: number; y: number }[], maxX: number, maxY: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const pad = 12;

  ctx.clearRect(0, 0, w, h);

  // Background Grid Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < w; gx += 40) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 0; gy < h; gy += 20) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  if (points.length < 2) return;

  const scaleX = (w - pad * 2) / Math.max(1, maxX);
  const scaleY = (h - pad * 2) / Math.max(1, maxY * 1.15);

  // Gradient trajectory path (No Glow as requested)
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#38bdf8');
  grad.addColorStop(0.5, '#eab308');
  grad.addColorStop(1, '#f43f5e');

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.strokeStyle = grad;
  ctx.lineWidth = 3;

  points.forEach((p, i) => {
    const px = pad + p.x * scaleX;
    const py = h - pad - p.y * scaleY;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // Peak marker dot
  const peakPt = points.reduce((best, p) => (p.y > best.y ? p : best), points[0]);
  const pxPeak = pad + peakPt.x * scaleX;
  const pyPeak = h - pad - peakPt.y * scaleY;

  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(pxPeak, pyPeak, 4, 0, Math.PI * 2);
  ctx.fill();
}

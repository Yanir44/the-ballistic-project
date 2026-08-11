/**
 * Education mode — formula explanations rendered with KaTeX.
 * Each section has a formula string (LaTeX) and a plain-text explanation.
 */

export interface Lesson {
  id: string;
  title: string;
  latex: string;
  explanation: string;
  wikiUrl?: string;
}

export const LESSONS: Lesson[] = [
  {
    id: 'somigliana',
    title: 'Normal Gravity (Somigliana)',
    latex: 'g(\\varphi) = g_{eq} \\dfrac{1 + k \\sin^2 \\varphi}{\\sqrt{1 - e^2 \\sin^2 \\varphi}}',
    explanation: 'Gravity varies with latitude φ because Earth is an oblate spheroid. It is stronger at the poles and weaker at the equator.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Normal_gravity',
  },
  {
    id: 'drag',
    title: 'Aerodynamic Drag Force',
    latex: 'F_d = \\frac{1}{2} \\rho v^2 A \\, C_d',
    explanation: 'Drag force depends on air density ρ, speed squared, frontal area A, and the drag coefficient Cd. It always acts opposite to motion.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Drag_equation',
  },
  {
    id: 'density',
    title: 'Air Density (Ideal Gas Law)',
    latex: '\\rho = \\dfrac{P}{R_{\\text{sp}} \\, T}',
    explanation: 'Air density is directly proportional to pressure P and inversely proportional to absolute temperature T. R_sp ≈ 287 J/(kg·K) for dry air.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Density_of_air',
  },
  {
    id: 'isa',
    title: 'ISA Temperature vs Altitude',
    latex: 'T(h) = T_0 - L \\cdot h \\quad (h \\leq 11\\,\\text{km})',
    explanation: 'In the troposphere, temperature drops 6.5°C per 1000 m of altitude. Above 11 km (stratosphere) it becomes roughly isothermal at −56.5°C.',
    wikiUrl: 'https://en.wikipedia.org/wiki/International_Standard_Atmosphere',
  },
  {
    id: 'solar',
    title: 'Solar Declination',
    latex: '\\delta = 23.45° \\sin\\!\\left(\\frac{360°}{365}(d-81)\\right)',
    explanation: 'The Sun\'s declination δ is the angle between its rays and the equatorial plane. It ranges from −23.45° (winter) to +23.45° (summer).',
    wikiUrl: 'https://en.wikipedia.org/wiki/Declination',
  },
  {
    id: 'elevation',
    title: 'Solar Elevation Angle',
    latex: '\\sin(\\alpha) = \\sin\\varphi\\sin\\delta + \\cos\\varphi\\cos\\delta\\cos H',
    explanation: 'Solar elevation α is how high the Sun appears above the horizon. H is the hour angle (15° per hour from noon). The Sun\'s gravity pull is projected onto the vertical axis via sin(α).',
    wikiUrl: 'https://en.wikipedia.org/wiki/Solar_zenith_angle',
  },
  {
    id: 'buoyancy',
    title: 'Buoyancy Force',
    latex: 'F_b = V_{\\text{obj}} \\, \\rho_{\\text{air}} \\, g',
    explanation: 'Like Archimedes\' principle for water, a projectile displaces air. The buoyancy force is tiny compared to gravity for dense objects but significant for lightweight ones.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Buoyancy',
  },
  {
    id: 'coriolis',
    title: 'Earth Rotation Correction',
    latex: 'v_{\\text{invariant}} = \\sqrt{(\\Delta x + v_{R,x}/t)^2 + (\\Delta z + v_{R,z}/t)^2}',
    explanation: 'Earth spins at 465 m/s at the equator. A projectile launched from a rotating surface retains that tangential speed, which adds a lateral correction to the solar-system-referenced distance.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Coriolis_force',
  },
];

let katexLoaded = false;

async function loadKatex(): Promise<void> {
  if (katexLoaded) return;
  await import('katex/dist/katex.min.css');
  katexLoaded = true;
}

export async function renderLessonPanel(lesson: Lesson, container: HTMLElement): Promise<void> {
  await loadKatex();
  const katex = (await import('katex')).default;
  container.innerHTML = `
    <div class="lesson-card">
      <h4>${lesson.title}</h4>
      <div class="lesson-formula" id="lesson-formula-${lesson.id}"></div>
      <p class="lesson-explanation">${lesson.explanation}</p>
      ${lesson.wikiUrl ? `<a class="lesson-link" href="${lesson.wikiUrl}" target="_blank" rel="noopener"><i data-lucide="book-open" class="lucide-icon"></i> Learn more</a>` : ''}
    </div>`;
  const formulaEl = container.querySelector(`#lesson-formula-${lesson.id}`)!;
  katex.render(lesson.latex, formulaEl as HTMLElement, { throwOnError: false, displayMode: true });
}

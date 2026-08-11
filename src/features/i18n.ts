export type Lang = 'en' | 'he';
let currentLang: Lang = 'en';

export function getLang(): Lang { return currentLang; }

export function setLang(lang: Lang): void {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === 'he' ? 'rtl' : 'ltr';
  applyTranslations();
}

export const TRANSLATIONS: Record<string, Record<Lang, string>> = {
  'app.title':          { en: 'UBT-Calc — Ballistic Trajectory Simulator', he: 'UBT-Calc — סימולטור מסלול בליסטי' },
  'app.subtitle':       { en: 'Advanced Physics Simulator', he: 'סימולטור פיזיקה מתקדם' },
  'card.location':      { en: 'Location & Time', he: 'מיקום וזמן' },
  'card.target':        { en: 'Target & Auto-Aim', he: 'יעד וכיוון אוטומטי' },
  'card.projectile':    { en: 'Projectile', he: 'קליע' },
  'card.shape':         { en: 'Object Shape', he: 'צורת העצם' },
  'card.atmosphere':    { en: 'Atmosphere', he: 'אטמוספרה' },
  'label.lat':          { en: 'Latitude (°)', he: 'קו רוחב (°)' },
  'label.lon':          { en: 'Longitude (°)', he: 'קו אורך (°)' },
  'label.targetLat':    { en: 'Target Lat (°)', he: 'קו רוחב יעד (°)' },
  'label.targetLon':    { en: 'Target Lon (°)', he: 'קו אורך יעד (°)' },
  'label.date':         { en: 'Date', he: 'תאריך' },
  'label.hour':         { en: 'Hour (24h)', he: 'שעה (24ש)' },
  'label.V':            { en: 'Speed (m/s)', he: 'מהירות (מ/ש)' },
  'label.degY':         { en: 'Elevation (°)', he: 'זווית גובה (°)' },
  'label.degZ':         { en: 'Azimuth (°)', he: 'זווית אזימוט (°)' },
  'label.M':            { en: 'Mass (kg)', he: 'מסה (ק"ג)' },
  'label.y0':           { en: 'Initial Height (m)', he: 'גובה התחלתי (מ)' },
  'label.cd':           { en: 'Drag Coeff. (Cd)', he: 'מקדם גרר (Cd)' },
  'label.diamFront':    { en: 'Front Diameter (m)', he: 'קוטר חזית (מ)' },
  'label.diamSide':     { en: 'Side Diameter (m)', he: 'קוטר צד (מ)' },
  'label.diamBottom':   { en: 'Bottom Diameter (m)', he: 'קוטר תחתית (מ)' },
  'label.vWind':        { en: 'Wind Speed (m/s)', he: 'מהירות רוח (מ/ש)' },
  'label.pressureMb':   { en: 'Air Pressure (mb)', he: 'לחץ אוויר (mb)' },
  'label.tempC':        { en: 'Temperature (°C)', he: 'טמפרטורה (°C)' },
  'label.windDeg':      { en: 'Wind Direction (°)', he: 'כיוון רוח (°)' },
  'btn.simulate':       { en: 'Simulate', he: 'סימולציה' },
  'btn.weather':        { en: 'Fetch Weather', he: 'טען מזג אוויר' },
  'btn.autoaim':        { en: 'Auto-Aim', he: 'כיוון אוטומטי' },
  'btn.saveRun':        { en: 'Save Run', he: 'שמור ריצה' },
  'btn.copyLink':       { en: 'Share', he: 'שתף' },
  'btn.exportCsv':      { en: 'Export CSV', he: 'ייצוא CSV' },
  'btn.exportPng':      { en: 'Export PNG', he: 'ייצוא PNG' },
  'btn.print':          { en: 'Print Card', he: 'הדפס כרטיס' },
  'btn.learnMode':      { en: 'Learn Mode', he: 'מצב למידה' },
  'results.loading':    { en: 'Calculating physics & trajectory results…', he: 'מחשב תוצאות פיזיקה ומסלול…' },
  'result.distance':    { en: 'Horizontal Distance', he: 'מרחק אופקי' },
  'result.flightTime':  { en: 'Flight Time', he: 'זמן טיסה' },
  'result.vFinal':      { en: 'Terminal Speed', he: 'מהירות סיום' },
  'result.maxAlt':      { en: 'Max Altitude', he: 'גובה מרבי' },
  'result.landingLat':  { en: 'Landing Latitude', he: 'קו רוחב נחיתה' },
  'result.landingLon':  { en: 'Landing Longitude', he: 'קו אורך נחיתה' },
  'result.dInvariant':  { en: 'Solar-Ref Distance', he: 'מרחק מהשמש' },
  'tab.side':           { en: 'Side View', he: 'מבט צד' },
  'tab.top':            { en: 'Top View', he: 'מבט עליון' },
  'tab.speed':          { en: 'Speed', he: 'מהירות' },
  'tab.forces':         { en: 'Forces', he: 'כוחות' },
  'section.map':        { en: 'Map', he: 'מפה' },
  'section.chart':      { en: 'Charts', he: 'גרפים' },
  'section.3d':         { en: '3D View', he: 'תצוגה תלת-ממד' },
  'section.firing':     { en: 'Firing Table', he: 'לוח אש' },
  'section.monte':      { en: 'Monte Carlo', he: 'מונטה קרלו' },
  'section.history':    { en: 'Saved Runs', he: 'ריצות שמורות' },
  'preset.label':       { en: 'Preset', he: 'תצורה מוגדרת מראש' },
  'opt.useISA':         { en: 'Use ISA altitude model', he: 'השתמש במודל ISA' },
  'btn.picker':         { en: 'Interactive Picker', he: 'אשף הגדרות אינטראקטיבי' },
  'picker.title':        { en: 'Interactive Setup Wizard', he: 'אשף הגדרת תצורה' },
  'picker.step':         { en: 'Step', he: 'שלב' },
  'picker.of':           { en: 'of', he: 'מתוך' },
  'btn.next':           { en: 'Next', he: 'הבא' },
  'btn.back':           { en: 'Back', he: 'הקודם' },
  'empty.results':      { en: 'Run a simulation to view results', he: 'הרץ סימולציה כדי לראות תוצאות' },
  'empty.charts':       { en: 'Run a simulation to view charts', he: 'הרץ סימולציה כדי לראות גרפים' },
  'empty.hud':          { en: 'Run a simulation to see live telemetry', he: 'הרץ סימולציה כדי לראות נתוני טלמטריה חיים' },
  'empty.3d':           { en: 'Run a simulation to view 3D trajectory', he: 'הרץ סימולציה כדי לראות מסלול תלת-ממדי' },
  'empty.mc':           { en: 'Run a basic simulation first', he: 'הרץ סימולציה בסיסית תחילה' },
  'empty.ft':           { en: 'Run a basic simulation first', he: 'הרץ סימולציה בסיסית תחילה' },
};

export function t(key: string): string {
  return TRANSLATIONS[key]?.[currentLang] ?? TRANSLATIONS[key]?.['en'] ?? key;
}

export function applyTranslations(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n!;
    el.textContent = t(key);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach(el => {
    (el as HTMLInputElement).placeholder = t(el.dataset.i18nPlaceholder!);
  });
}

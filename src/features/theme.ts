import { createIcons, icons } from 'lucide';

export type Theme = 'light' | 'dark';

let currentTheme: Theme = 'light';
const listeners: Array<(theme: Theme) => void> = [];

export function getTheme(): Theme {
  return currentTheme;
}

export function onThemeChange(fn: (theme: Theme) => void): void {
  listeners.push(fn);
}

export function setTheme(theme: Theme): void {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  document.body.classList.toggle('dark-theme', theme === 'dark');
  document.body.classList.toggle('light-theme', theme === 'light');
  localStorage.setItem('theme', theme);

  // Update button icons
  const btn = document.getElementById('btn-theme') || document.getElementById('btn-contrast');
  if (btn) {
    btn.setAttribute('title', theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode');
    btn.innerHTML = `<i data-lucide="${theme === 'light' ? 'moon' : 'sun'}" class="lucide-icon"></i>`;
    createIcons({ icons });
  }

  listeners.forEach(fn => fn(theme));
}

export function toggleTheme(): Theme {
  const next = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(next);
  return next;
}

export function initTheme(): void {
  const saved = localStorage.getItem('theme') as Theme | null;
  if (saved === 'dark' || saved === 'light') {
    setTheme(saved);
  } else {
    // Default is light mode
    setTheme('light');
  }
}

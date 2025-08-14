import { setupEventListeners } from './events.js';

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initTheme();
});

// --- Theme init/toggle ---
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
  localStorage.setItem('theme', theme);
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    const isDark = theme === 'dark';
    btn.classList.toggle('active', isDark);
    btn.setAttribute('aria-pressed', String(isDark));
  });
}
function initTheme() {
  const saved = localStorage.getItem('theme');
  const theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(theme);
  document.body.addEventListener('click', (e) => {
    const t = e.target.closest('.theme-toggle'); if (!t) return;
    const now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(now);
  });
}

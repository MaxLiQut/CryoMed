import { setupEventListeners } from './events.js';
import { initTheme } from './theme.js';
import { initializeUI } from './ui.js';

// Bootstrap application
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initializeUI();
  setupEventListeners();
});
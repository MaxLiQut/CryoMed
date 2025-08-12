import { setupEventListeners } from './events.js';

// Запускаємо наш додаток, коли HTML-структура готова
window.addEventListener('DOMContentLoaded', function () {
    console.log("Application DOM ready. Initializing...");
    setupEventListeners();
});
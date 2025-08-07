import { setupEventListeners, changeMonth, selectDate, showDayDetails } from './events.js';

// Робимо функції для onclick глобальними, щоб HTML міг їх викликати
window.changeMonth = changeMonth;
window.selectDate = selectDate;
window.showDayDetails = showDayDetails;

// Запускаємо наш додаток, коли HTML-структура готова
window.addEventListener('DOMContentLoaded', function () {
    console.log("Application DOM ready. Initializing...");
    setupEventListeners();
});
import { state } from './state.js';

/* ---------- Utils ---------- */
const numDays = (y, m) => new Date(y, m + 1, 0).getDate();
const pad2 = (n) => String(n).padStart(2, '0');
const formatISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const nextId = (arr) => (arr?.length ? Math.max(...arr.map(a => a.id || 0)) + 1 : 1);

/* Equalize heights for client dashboard right card */
function syncClientCardHeights() {
    const grid = document.getElementById('client-info-container');
    if (!grid) return;
    const leftCard = grid.querySelector('.lg\\:col-span-1 .dashboard-card');
    const rightCard = grid.querySelector('.lg\\:col-span-2 .dashboard-card');
    if (!(leftCard && rightCard)) return;

    rightCard.style.height = '';
    rightCard.style.maxHeight = '';
    const h = leftCard.getBoundingClientRect().height;
    if (h > 0) {
        rightCard.style.height = h + 'px';
        rightCard.style.maxHeight = h + 'px';
    }
}
function debounce(fn, wait = 150) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}
const resyncHeights = debounce(syncClientCardHeights, 150);
window.addEventListener('resize', resyncHeights);

/* ---------- Admin: statistics ---------- */
export function renderStatistics() {
    const { stats } = state;
    const el = document.getElementById('stats-container');
    el.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4 dashboard-card">
      <div><p class="text-2xl font-bold text-gray-800">${stats.total}</p><p class="text-sm text-gray-500">Wszystkich karnetów</p></div>
    </div>
    <div class="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4 dashboard-card">
      <div><p class="text-2xl font-bold text-gray-800">${stats.active}</p><p class="text-sm text-gray-500">Aktywnych karnetów</p></div>
    </div>
    <div class="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4 dashboard-card">
      <div><p class="text-2xl font-bold text-gray-800">${stats.expired}</p><p class="text-sm text-gray-500">Zakończonych karnetów</p></div>
    </div>`;
}

/* ---------- Admin: clients list ---------- */
export function renderClientsList() {
    const { clients, filters } = state;
    const today = new Date();

    const filtered = clients.filter(c => {
        const nameMatch = c.name.toLowerCase().includes(filters.searchQuery.toLowerCase());
        if (!nameMatch) return false;
        if (filters.filterBy === 'expiresSoon') {
            const exp = new Date(c.subscription.expires);
            const days = (exp - today) / 86400000;
            return days > 0 && days <= 7;
        }
        if (filters.filterBy === 'lowEntries') return c.subscription.entriesLeft <= 2;
        return true;
    });

    const container = document.getElementById('clients-list-container');
    if (!filtered.length) {
        container.innerHTML = `<p class="text-sm text-gray-500">Nie znaleziono klientów spełniających kryteria.</p>`;
        return;
    }

    container.innerHTML = filtered.map(client => {
        const type = client.subscription.type || '—';
        return `
      <div class="p-4 border rounded-lg flex justify-between items-center">
        <div>
          <p class="font-bold">${client.name}</p>
          <p class="text-sm text-gray-500">Karnet: ${type} (pozostało ${client.subscription.entriesLeft})</p>
          <p class="text-xs text-gray-400 mt-1">Ważny do: ${client.subscription.expires}</p>
        </div>
        <button data-client-id="${client.id}" class="manage-btn text-sm text-indigo-600 hover:underline">Zarządzaj</button>
      </div>`;
    }).join('');
}

/* ---------- Admin: requests ---------- */
export function renderRequests() {
    const container = document.getElementById('requests-container');
    const pending = state.requests.filter(r => r.status === 'pending_admin_approval');

    if (!pending.length) {
        container.innerHTML = `<p class="text-sm text-gray-500">Brak nowych wniosków.</p>`;
        return;
    }

    container.innerHTML = [...pending].reverse().map(req => {
        const originalIndex = state.requests.indexOf(req);
        return `
      <div class="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-3 rounded-md shadow-sm">
        <p class="font-bold">${req.from}</p>
        <p class="text-sm mb-3">${req.details}</p>
        <div class="flex items-center justify-end space-x-2">
          <button data-request-index="${originalIndex}" class="confirm-request-btn text-xs bg-green-200 text-green-800 px-2 py-1 rounded-md hover:bg-green-300">Potwierdź</button>
          <button data-request-index="${originalIndex}" class="propose-new-time-btn text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-md hover:bg-yellow-300">Zaproponuj inny</button>
          <button data-request-index="${originalIndex}" class="reject-request-btn text-xs bg-red-200 text-red-800 px-2 py-1 rounded-md hover:bg-red-300">Odrzuć</button>
        </div>
      </div>`;
    }).join('');
}

/* ---------- Client: dashboard (left card, tabs + lists) ---------- */
export function renderClientDashboard() {
    const client = state.clients.find(c => c.id === state.currentClientId);
    if (!client) return;

    const { subscription, history } = client;
    const exp = new Date(subscription.expires);
    const daysLeft = Math.ceil((exp - new Date()) / 86400000);

    const requestsHTML = [...state.requests].reverse().map((req, reversedIndex) => {
        const originalIndex = state.requests.length - 1 - reversedIndex;
        if (req.clientId !== client.id) return '';
        let bg = 'bg-blue-100 border-blue-500 text-blue-700';
        let buttons = '';
        switch (req.status) {
            case 'pending_admin_approval': break;
            case 'pending_client_approval':
                bg = 'bg-purple-100 border-purple-500 text-purple-800';
                buttons = `
          <div class="mt-2 text-right space-x-3">
            <button data-request-index="${originalIndex}" class="reject-proposal-btn font-semibold hover:underline">Odrzuć</button>
            <button data-request-index="${originalIndex}" class="accept-proposal-btn font-semibold text-green-600 hover:underline">Akceptuj</button>
          </div>`;
                break;
            case 'confirmed': bg = 'bg-green-100 border-green-500 text-green-800'; break;
            case 'rejected': bg = 'bg-red-100 border-red-500 text-red-800'; break;
        }
        return `<div class="${bg} border-l-4 p-3 rounded-md"><p class="text-sm">${req.details}</p>${buttons}</div>`;
    }).join('');

    const historyHTML = [...history].sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => {
        const temp = item.temperature ? `<span class="font-bold text-blue-600 w-16 text-center">${item.temperature}</span>` : '<span class="w-16"></span>';
        const dur = item.duration ? `<span class="font-semibold text-gray-700 w-16 text-center">${item.duration}</span>` : '<span class="w-16"></span>';
        const statusClass = item.status === 'Odwiedzono' ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100';
        return `
      <li class="flex justify-between items-center p-2 rounded-md hover:bg-gray-50">
        <div class="flex items-center space-x-3">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          <span class="font-semibold">${item.date}</span>
        </div>
        <div class="flex items-center space-x-4 text-sm">
          ${dur}${temp}
          <span class="w-24 text-center px-2 py-1 text-xs font-semibold ${statusClass} rounded-full">${item.status}</span>
        </div>
      </li>`;
    }).join('');

    document.getElementById('client-info-container').innerHTML = `
    <div class="lg:col-span-1">
      <div class="bg-white p-6 rounded-xl shadow-lg dashboard-card h-full">
        <h2 class="text-lg font-semibold mb-4">Mój karnet</h2>
        <div class="text-center py-8">
          <p class="text-5xl font-bold text-emerald-600">${subscription.entriesLeft}</p>
          <p class="text-gray-500">pozostało wejść</p>
        </div>
        <div class="text-sm text-gray-600">
          <p><strong>Typ:</strong> ${subscription.type || '—'}</p>
          <p><strong>Ważny do:</strong> ${subscription.expires} (${daysLeft > 0 ? `${daysLeft} dni` : 'Wygasł'})</p>
        </div>
      </div>
    </div>

    <div class="lg:col-span-2">
      <div class="bg-white p-6 rounded-xl shadow-lg dashboard-card flex flex-col h-full">
        <div class="tab-container" id="client-dashboard-tabs">
          <button class="tab-button ${state.clientDashboardTab === 'history' ? 'active' : ''}" data-tab="history">Historia wizyt</button>
          <button class="tab-button ${state.clientDashboardTab === 'requests' ? 'active' : ''}" data-tab="requests">Status wniosków</button>
        </div>

        <div class="flex-grow min-h-0 overflow-hidden" id="client-scroll-container">
          <div class="tab-content card-scroll-content ${state.clientDashboardTab === 'history' ? 'active' : ''}" id="history-content">
            <ul class="space-y-3">${historyHTML || '<p class="text-sm text-gray-500">Brak historii.</p>'}</ul>
          </div>
          <div class="tab-content card-scroll-content ${state.clientDashboardTab === 'requests' ? 'active' : ''}" id="requests-content">
            <div class="space-y-3">${requestsHTML || '<p class="text-sm text-gray-500">Brak aktywnych wniosków.</p>'}</div>
          </div>
        </div>
      </div>
    </div>`;

    renderAppointments();
    syncClientCardHeights();
}

/* ---------- Client: appointments list ---------- */
export function renderAppointments() {
    const el = document.getElementById('appointments-list');
    const items = state.appointments.filter(a => a.clientId === state.currentClientId);
    if (!items.length) { el.innerHTML = `<p class="text-sm text-gray-500">U Ciebie nie ma zaplanowanych wizyt.</p>`; return; }
    items.sort((a, b) => new Date(a.date) - new Date(b.date));

    el.innerHTML = items.map(app => {
        const visitDate = new Date(app.date);
        const dow = visitDate.toLocaleDateString('pl-PL', { weekday: 'long' });
        return `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div class="flex items-center space-x-3">
          <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          <div>
            <p class="font-semibold">${app.date} (${dow})</p>
            <p class="text-sm text-gray-600">Godzina: ${app.time}</p>
          </div>
        </div>
        <button data-appointment-id="${app.id}" class="change-appointment-btn text-xs text-indigo-600 hover:underline">Zmień termin</button>
      </div>`;
    }).join('');
}

/* ---------- Admin modal: manage client form ---------- */
export function renderClientForm({ mode, client }) {
    const isEdit = mode === 'edit';
    const title = isEdit ? `Zarządzaj klientem: ${client.name}` : 'Dodaj nowego klienta';
    const buttonText = isEdit ? 'Zapisz zmiany' : 'Dodaj klienta';

    let historyRowsHTML = '';
    if (isEdit && client.history?.length) {
        const sorted = [...client.history].sort((a, b) => new Date(b.date) - new Date(a.date));
        historyRowsHTML = sorted.map((item, idx) => `
      <div class="grid grid-cols-5 gap-4 items-center text-sm py-2 px-2 hover:bg-gray-100 rounded text-center">
        <span class="text-left">${item.date}</span>
        <span class="font-medium">${item.duration ?? 'Brak'}</span>
        <span>${item.status}</span>
        <span class="font-medium">${item.temperature ?? 'Brak'}</span>
        <button type="button" data-history-index="${idx}" class="delete-history-btn text-red-500 hover:underline justify-self-end text-xs">Usuń</button>
      </div>`).join('');
    } else if (isEdit) {
        historyRowsHTML = '<p class="text-sm text-gray-500 col-span-5 text-center py-2">Brak historii wizyt.</p>';
    }

    document.getElementById('manageClientModalTitle').innerText = title;
    document.getElementById('manageClientModalBody').innerHTML = `
    <div class="tab-container">
      <button class="tab-button ${state.activeModalTab === 'tab-main' ? 'active' : ''}" data-tab="tab-main">Dane Główne</button>
      ${isEdit ? `<button class="tab-button ${state.activeModalTab === 'tab-history' ? 'active' : ''}" data-tab="tab-history">Historia Wizyt</button>` : ''}
      ${isEdit ? `<button class="tab-button ${state.activeModalTab === 'tab-notes' ? 'active' : ''}" data-tab="tab-notes">Notatki</button>` : ''}
    </div>

    <form id="manage-client-form" data-mode="${mode}" data-client-id="${isEdit ? client.id : ''}">
      <div class="tab-content ${state.activeModalTab === 'tab-main' ? 'active' : ''}" id="tab-main">
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Imię i nazwisko</label>
              <input type="text" id="clientName" value="${isEdit ? client.name : ''}" required class="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Liczba wejść</label>
              <input type="number" id="entriesLeft" value="${isEdit ? client.subscription.entriesLeft : ''}" required class="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md"/>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Karnet ważny do</label>
            <input type="date" id="expires" value="${isEdit ? client.subscription.expires : ''}" required class="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md"/>
          </div>
        </div>
      </div>

      ${isEdit ? `
      <div class="tab-content ${state.activeModalTab === 'tab-history' ? 'active' : ''}" id="tab-history">
        <div class="space-y-3">
          <div class="space-y-1 p-2 bg-gray-50 rounded-md max-h-48 overflow-y-auto">
            <div class="grid grid-cols-5 gap-4 items-center text-xs font-bold text-gray-500 px-2 text-center">
              <span class="text-left">Data</span><span>Czas trwania</span><span>Status</span><span>Temperatura</span><span class="text-right">Akcja</span>
            </div>
            ${historyRowsHTML}
          </div>
          <div class="grid grid-cols-5 gap-4 items-end pt-2">
            <div>
              <label class="block text-xs font-medium text-gray-600">Data</label>
              <input type="date" id="newHistoryDate" class="mt-1 block w-full text-sm px-2 py-1 bg-white border border-gray-300 rounded-md"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600">Czas trwania (sek)</label>
              <input type="number" id="newHistoryDuration" placeholder="180" class="mt-1 block w-full text-sm px-2 py-1 bg-white border border-gray-300 rounded-md"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600">Status</label>
              <select id="newHistoryStatus" class="mt-1 block w-full text-sm px-2 py-1 bg-white border border-gray-300 rounded-md">
                <option>Odwiedzono</option><option>Opuszczono</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600">Temp. (°C)</label>
              <input type="number" id="newHistoryTemp" placeholder="-135" class="mt-1 block w-full text-sm px-2 py-1 bg-white border border-gray-300 rounded-md"/>
            </div>
            <div class="text-right">
              <button type="button" id="addHistoryBtn" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded-md">Dodaj</button>
            </div>
          </div>
        </div>
      </div>

      <div class="tab-content ${state.activeModalTab === 'tab-notes' ? 'active' : ''}" id="tab-notes">
        <label class="block text-sm font-medium text-gray-700 mb-1">Notatki</label>
        <textarea id="clientNotes" rows="5" class="w-full p-2 border border-gray-300 rounded-md">${client.notes || ''}</textarea>
      </div>` : ''}

      <div class="flex justify-end space-x-3 pt-4">
        <button type="button" id="cancelManageClientBtn" class="bg-white py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Anuluj</button>
        ${isEdit ? `<button type="button" id="deleteClientBtn" class="bg-red-50 text-red-700 hover:bg-red-100 py-2 px-4 border border-red-200 rounded-md text-sm">Usuń</button>` : ''}
        <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">${buttonText}</button>
      </div>
    </form>`;
}

/* ---------- Booking calendar (client) ---------- */
export function renderCalendar() {
    const cont = document.getElementById('booking-calendar');
    const date = state.calendar.currentDate;
    const y = date.getFullYear(), m = date.getMonth();

    cont.innerHTML = buildCalendar({ y, m, isAdmin: false });
    // відновити виділення
    if (state.calendar.selectedDate) {
        const sel = cont.querySelector(`.calendar-day[data-date="${formatISO(state.calendar.selectedDate)}"]`);
        if (sel) sel.classList.add('selected');
    }
}

/* ---------- Admin calendar ---------- */
export function renderAdminCalendar() {
    const cont = document.getElementById('admin-calendar-container');
    const date = state.calendar.currentDate;
    const y = date.getFullYear(), m = date.getMonth();
    cont.innerHTML = buildCalendar({ y, m, isAdmin: true });
}

/* ---------- Time slots (client) ---------- */
export function renderTimeSlots(selectedDate) {
    const container = document.getElementById('time-slots-container');
    if (!selectedDate) {
        container.innerHTML = `<p class="text-sm text-gray-500">Wybierz datę z kalendarza, aby zobaczyć dostępne terminy.</p>`;
        return;
    }
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth() + 1;
    const d = selectedDate.getDate();
    const dateKey = `${y}-${pad2(m)}-${pad2(d)}`;
    const weekday = selectedDate.getDay(); // 0..6
    const slots = state.schedule[weekday] || [];
    const booked = state.appointments.filter(a => a.date === dateKey).map(a => a.time);

    if (!slots.length) {
        container.innerHTML = `<p class="text-sm text-gray-500">Brak dostępnych terminów w tym dniu.</p>`;
        return;
    }

    container.innerHTML = slots.map(time => {
        const isBooked = booked.includes(time);
        return `<button class="time-slot ${isBooked ? 'booked' : ''}" ${isBooked ? 'disabled' : ''}>${time}</button>`;
    }).join('');
}

/* ---------- Shared calendar builder ---------- */
function buildCalendar({ y, m, isAdmin }) {
    const first = new Date(y, m, 1);
    const days = numDays(y, m);
    const startDay = first.getDay(); // 0..6 (Nd..Sb)
    const weekdays = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];

    const nav = `
    <div class="calendar-nav">
      <button data-action="change-month" data-direction="-1" data-is-admin="${isAdmin}" class="px-2 py-1 bg-gray-200 rounded">←</button>
      <div class="font-semibold">${first.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}</div>
      <button data-action="change-month" data-direction="1" data-is-admin="${isAdmin}" class="px-2 py-1 bg-gray-200 rounded">→</button>
    </div>`;

    const headers = weekdays.map(w => `<div class="calendar-day-header">${w}</div>`).join('');
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(`<div></div>`);
    for (let d = 1; d <= days; d++) {
        const dt = new Date(y, m, d);
        const iso = formatISO(dt);
        const isToday = formatISO(new Date()) === iso;
        const appts = state.appointments.filter(a => a.date === iso);
        const apptPreview = appts.slice(0, 2).map(a => `<div class="text-xs">${a.time}</div>`).join('');
        const more = appts.length > 2 ? `<a data-action="show-day-details" data-date="${iso}" class="admin-calendar-more-link text-indigo-600 text-xs cursor-pointer">+${appts.length - 2}</a>` : '';

        const dayAttrs = isAdmin
            ? `tabindex="0" role="button" class="calendar-day available" data-action="show-day-details" data-date="${iso}" data-year="${y}" data-month="${m + 1}" data-day="${d}" data-is-admin="true"`
            : `tabindex="0" role="button" class="calendar-day available" data-action="select-date" data-year="${y}" data-month="${m}" data-day="${d}" data-date="${iso}"`;

        cells.push(`
      <div ${dayAttrs}>
        <span class="day-number">${d}${isToday ? ' •' : ''}</span>
        ${isAdmin ? apptPreview + more : ''}
      </div>`);
    }

    const legend = isAdmin ? `<div class="calendar-legend"><span>• Kliknij dzień aby zobaczyć/zmienić wizyty</span></div>` : '';
    return `<div class="custom-calendar">${nav}<div class="calendar-grid">${headers}${cells.join('')}</div>${legend}</div>`;
}

import { state } from './state.js';

export function renderStatistics() {
    const { stats } = state;
    document.getElementById('stats-container').innerHTML = `<div class="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4 dashboard-card"><div><p class="text-2xl font-bold text-gray-800">${stats.total}</p><p class="text-sm text-gray-500">Wszystkich karnetów</p></div></div><div class="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4 dashboard-card"><div><p class="text-2xl font-bold text-gray-800">${stats.active}</p><p class="text-sm text-gray-500">Aktywnych karnetów</p></div></div><div class="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4 dashboard-card"><div><p class="text-2xl font-bold text-gray-800">${stats.expired}</p><p class="text-sm text-gray-500">Zakończonych karnetów</p></div></div>`;
}

export function renderClientsList() {
    const { clients, filters } = state;
    const today = new Date();
    const filteredClients = clients.filter(client => {
        const nameMatch = client.name.toLowerCase().includes(filters.searchQuery.toLowerCase());
        if (!nameMatch) return false;
        if (filters.filterBy === 'expiresSoon') {
            const expirationDate = new Date(client.subscription.expires);
            const daysLeft = (expirationDate - today) / (1000 * 60 * 60 * 24);
            return daysLeft > 0 && daysLeft <= 7;
        }
        if (filters.filterBy === 'lowEntries') return client.subscription.entriesLeft <= 2;
        return true;
    });
    const container = document.getElementById('clients-list-container');
    if (!container) return;
    if (filteredClients.length === 0) {
        container.innerHTML = `<p class="text-sm text-gray-500">Nie znaleziono klientów spełniających kryteria.</p>`;
        return;
    }
    container.innerHTML = filteredClients.map(client => `<div class="p-4 border rounded-lg flex justify-between items-center"><div><p class="font-bold">${client.name}</p><p class="text-sm text-gray-500">Karnet: ${client.subscription.type} (pozostało ${client.subscription.entriesLeft})</p><p class="text-xs text-gray-400 mt-1">Ważny do: ${client.subscription.expires}</p></div><button data-client-id="${client.id}" class="manage-btn text-sm text-indigo-600 hover:underline">Zarządzaj</button></div>`).join('');
}

export function renderRequests() {
    const { requests } = state;
    const requestsContainer = document.getElementById('requests-container');
    if (!requestsContainer) return;

    const pendingRequests = requests.filter(req => req.status === 'pending_admin_approval');

    if (pendingRequests.length === 0) {
        requestsContainer.innerHTML = `<p class="text-sm text-gray-500">Brak nowych wniosków.</p>`;
        return;
    }

    requestsContainer.innerHTML = [...pendingRequests].reverse().map(req => {
        const originalIndex = requests.findIndex(r => r === req);
        let bgColor = 'bg-blue-100 border-blue-500 text-blue-800';
        let buttonsHTML = `
            <div class="flex items-center justify-end space-x-2">
                <button data-request-index="${originalIndex}" class="confirm-request-btn text-xs bg-green-200 text-green-800 px-2 py-1 rounded-md hover:bg-green-300">Potwierdź</button>
                <button data-request-index="${originalIndex}" class="propose-new-time-btn text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-md hover:bg-yellow-300">Zaproponuj inny</button>
                <button data-request-index="${originalIndex}" class="reject-request-btn text-xs bg-red-200 text-red-800 px-2 py-1 rounded-md hover:bg-red-300">Odrzuć</button>
            </div>
        `;
        return `
            <div class="${bgColor} border-l-4 p-3 rounded-md shadow-sm">
                <p class="font-bold">${req.from}</p>
                <p class="text-sm mb-3">${req.details}</p>
                ${buttonsHTML}
            </div>
        `;
    }).join('');
}

export function renderClientDashboard() {
    const client = state.clients.find(c => c.id === state.currentClientId);
    if (!client) return;

    const { subscription, history } = client;
    const expirationDate = new Date(subscription.expires);
    const today = new Date();
    const daysLeft = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

    const requestsHTML = [...state.requests].reverse().map((req, reversedIndex) => {
        const originalIndex = state.requests.length - 1 - reversedIndex;

        if (req.clientId === client.id) {
            let bgColor = 'bg-blue-100 border-blue-500 text-blue-700';
            let buttonsHTML = '';

            switch (req.status) {
                case 'pending_admin_approval':
                    break;
                case 'pending_client_approval':
                    bgColor = 'bg-purple-100 border-purple-500 text-purple-800';
                    buttonsHTML = `<div class="mt-2 text-right space-x-3"><button data-request-index="${originalIndex}" class="reject-proposal-btn font-semibold hover:underline">Odrzuć</button><button data-request-index="${originalIndex}" class="accept-proposal-btn font-semibold text-green-600 hover:underline">Akceptuj</button></div>`;
                    break;
                case 'confirmed':
                    bgColor = 'bg-green-100 border-green-500 text-green-800';
                    break;
                case 'rejected':
                    bgColor = 'bg-red-100 border-red-500 text-red-800';
                    break;
            }
            return `<div class="${bgColor} border-l-4 p-3 rounded-md"><p class="text-sm">${req.details}</p>${buttonsHTML}</div>`;
        }
        return '';
    }).join('');

    const historyHTML = history.sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => {
        const temperatureInfo = item.temperature ? `<span class="font-bold text-blue-600 w-16 text-center">${item.temperature}</span>` : '<span class="w-16"></span>';
        const durationInfo = item.duration ? `<span class="font-semibold text-gray-700 w-16 text-center">${item.duration}</span>` : '<span class="w-16"></span>';
        const statusClass = item.status === 'Odwiedzono' ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100';
        return `
            <li class="flex justify-between items-center p-2 rounded-md hover:bg-gray-50">
                <div class="flex items-center space-x-3">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <span class="font-semibold">${item.date}</span>
                </div>
                <div class="flex items-center space-x-4 text-sm">
                    ${durationInfo}
                    ${temperatureInfo}
                    <span class="w-24 text-center px-2 py-1 text-xs font-semibold ${statusClass} rounded-full">${item.status}</span>
                </div>
            </li>
        `;
    }).join('');

    document.getElementById('client-info-container').innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-lg dashboard-card">
            <h2 class="text-lg font-semibold mb-4">Mój karnet</h2>
            <div class="text-center py-8">
                <p class="text-5xl font-bold text-emerald-600">${subscription.entriesLeft}</p>
                <p class="text-gray-500">pozostało wejść</p>
            </div>
            <div class="text-sm text-gray-600">
                <p><strong>Typ:</strong> ${subscription.type}</p>
                <p><strong>Ważny do:</strong> ${subscription.expires} (${daysLeft > 0 ? `${daysLeft} dni` : 'Wygasł'})</p>
            </div>
        </div>

        <div class="bg-white p-6 rounded-xl shadow-lg dashboard-card">
            <h2 class="text-lg font-semibold mb-4">Historia wizyt</h2>
            <ul class="space-y-3 scroll-list-client">
                ${historyHTML || '<p class="text-sm text-gray-500">Brak historii.</p>'}
            </ul>
        </div>

        <div class="bg-white p-6 rounded-xl shadow-lg dashboard-card">
            <h2 class="text-lg font-semibold mb-4">Status wniosków</h2>
            <div class="space-y-3 scroll-list-client">
                ${requestsHTML || '<p class="text-sm text-gray-500">Brak aktywnych wniosków.</p>'}
            </div>
        </div>
    `;

    renderAppointments();
}

export function renderAppointments() {
    const appointmentsList = document.getElementById('appointments-list');
    const clientAppointments = state.appointments.filter(app => app.clientId === state.currentClientId);
    if (clientAppointments.length === 0) {
        appointmentsList.innerHTML = `<p class="text-sm text-gray-500">U Ciebie nie ma zaplanowanych wizyt.</p>`;
        return;
    }
    clientAppointments.sort((a, b) => new Date(a.date) - new Date(b.date));
    appointmentsList.innerHTML = clientAppointments.map(app => {
        const visitDate = new Date(app.date);
        const dayOfWeek = visitDate.toLocaleDateString('pl-PL', { weekday: 'long' });
        return `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-3">
                    <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <div>
                        <p class="font-semibold">${app.date} (${dayOfWeek})</p>
                        <p class="text-sm text-gray-600">Godzina: ${app.time}</p>
                    </div>
                </div>
                <button data-appointment-id="${app.id}" class="change-appointment-btn text-xs text-indigo-600 hover:underline">
                    Zmień termin
                </button>
            </div>
        `;
    }).join('');
}

export function renderClientForm({ mode, client }) {
    const isEditMode = mode === 'edit';
    const title = isEditMode ? `Zarządzaj klientem: ${client.name}` : 'Dodaj nowego klienta';
    const buttonText = isEditMode ? 'Zapisz zmiany' : 'Dodaj klienta';
    let historyRowsHTML = '';
    if (isEditMode && client.history && client.history.length > 0) {
        const sortedHistory = [...client.history].sort((a, b) => new Date(b.date) - new Date(a.date));
        historyRowsHTML = sortedHistory.map((item, index) => `<div class="grid grid-cols-5 gap-4 items-center text-sm py-2 px-2 hover:bg-gray-100 rounded text-center"><span class="text-left">${item.date}</span><span class="font-medium">${item.duration || 'Brak'}</span><span>${item.status}</span><span class="font-medium">${item.temperature || 'Brak'}</span><button type="button" data-history-index="${index}" class="delete-history-btn text-red-500 hover:underline justify-self-end text-xs">Usuń</button></div>`).join('');
    } else if (isEditMode) {
        historyRowsHTML = '<p class="text-sm text-gray-500 col-span-5 text-center py-2">Brak historii wizyt.</p>';
    }
    document.getElementById('manageClientModalTitle').innerText = title;
    document.getElementById('manageClientModalBody').innerHTML = `<div class="tab-container"><button class="tab-button ${state.activeModalTab === 'tab-main' ? 'active' : ''}" data-tab="tab-main">Dane Główne</button>${isEditMode ? `<button class="tab-button ${state.activeModalTab === 'tab-history' ? 'active' : ''}" data-tab="tab-history">Historia Wizyt</button>` : ''}${isEditMode ? `<button class="tab-button ${state.activeModalTab === 'tab-notes' ? 'active' : ''}" data-tab="tab-notes">Notatki</button>` : ''}</div><form id="manage-client-form" data-mode="${mode}" data-client-id="${isEditMode ? client.id : ''}"><div class="tab-content-container"><div class="tab-content ${state.activeModalTab === 'tab-main' ? 'active' : ''}" id="tab-main"><div class="space-y-4"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-gray-700">Imię i nazwisko</label><input type="text" id="clientName" value="${isEditMode ? client.name : ''}" required class="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md"></div><div><label class="block text-sm font-medium text-gray-700">Liczba wejść</label><input type="number" id="entriesLeft" value="${isEditMode ? client.subscription.entriesLeft : ''}" required class="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md"></div></div><div><label class="block text-sm font-medium text-gray-700">Karnet ważny do</label><input type="date" id="expires" value="${isEditMode ? client.subscription.expires : ''}" required class="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md"></div></div></div><div class="tab-content ${state.activeModalTab === 'tab-history' ? 'active' : ''}" id="tab-history"><div class="space-y-3"><div class="space-y-1 p-2 bg-gray-50 rounded-md max-h-48 overflow-y-auto"><div class="grid grid-cols-5 gap-4 items-center text-xs font-bold text-gray-500 px-2 text-center"><span class="text-left">Data</span><span>Czas trwania</span><span>Status</span><span>Temperatura</span><span class="text-right">Akcja</span></div>${historyRowsHTML}</div><div class="grid grid-cols-5 gap-4 items-end pt-2"><div><label class="block text-xs font-medium text-gray-600">Data</label><input type="date" id="newHistoryDate" class="mt-1 block w-full text-sm px-2 py-1 bg-white border border-gray-300 rounded-md"></div><div><label class="block text-xs font-medium text-gray-600">Czas trwania (sek)</label><input type="number" id="newHistoryDuration" placeholder="180" class="mt-1 block w-full text-sm px-2 py-1 bg-white border border-gray-300 rounded-md"></div><div><label class="block text-xs font-medium text-gray-600">Status</label><select id="newHistoryStatus" class="mt-1 block w-full text-sm px-2 py-1 bg-white border border-gray-300 rounded-md"><option value="Odwiedzono">Odwiedzono</option><option value="Opuszczono">Opuszczono</option></select></div><div><label class="block text-xs font-medium text-gray-600">Temperatura</label><input type="number" id="newHistoryTemp" placeholder="-130" class="mt-1 block w-full text-sm px-2 py-1 bg-white border border-gray-300 rounded-md"></div><button type="button" id="addHistoryBtn" class="bg-indigo-600 text-white text-sm py-1 px-2 rounded-md hover:bg-indigo-700">Dodaj</button></div></div></div><div class="tab-content ${state.activeModalTab === 'tab-notes' ? 'active' : ''}" id="tab-notes"><textarea id="clientNotes" class="block w-full h-40 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">${isEditMode ? client.notes : ''}</textarea></div></div><div class="flex justify-between items-center pt-6 mt-6 border-t"><div>${isEditMode ? `<button type="button" id="deleteClientBtn" class="bg-red-100 text-red-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-red-200">Usuń klienta</button>` : ''}</div><div class="flex"><button type="button" id="cancelManageClientBtn" class="bg-white py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Anuluj</button><button type="submit" class="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">${buttonText}</button></div></div></form>`;
}

export function renderTimeSlots(date) {
    const dayOfWeek = date.getDay();
    const availableTimes = state.schedule[dayOfWeek];
    const timeSlotsContainer = document.getElementById('time-slots-container');
    if (!availableTimes) {
        timeSlotsContainer.innerHTML = `<p class="text-sm text-gray-500">Brak dostępних terminów w tym dniu.</p>`;
        return;
    }
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const booked = state.bookedSlots[dateString] || [];
    const slotsHTML = availableTimes.map(time => {
        const isBooked = booked.includes(time);
        return `<button class="time-slot ${isBooked ? 'booked' : ''}" ${isBooked ? 'disabled' : ''}>${time}${isBooked ? ' (Zajęty)' : ''}</button>`;
    }).join('');
    timeSlotsContainer.innerHTML = slotsHTML;
}

export function renderCalendar() {
    const { currentDate, selectedDate } = state.calendar;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
    const dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;
    const availableWeekdays = Object.keys(state.schedule).map(Number);

    let html = `
        <div class="calendar-header">
            <button class="calendar-nav-btn" data-action="change-month" data-direction="-1">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h3 class="text-lg font-semibold">${monthNames[month]} ${year}</h3>
            <button class="calendar-nav-btn" data-action="change-month" data-direction="1">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
        </div>
        <div class="calendar-grid">
    `;
    dayNames.forEach(day => { html += `<div class="calendar-day-header">${day}</div>`; });
    for (let i = 0; i < startingDayOfWeek; i++) { html += `<div class="calendar-day disabled"></div>`; }

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDateObj = new Date(year, month, day);
        const dayOfWeek = currentDateObj.getDay();
        const isToday = currentDateObj.toDateString() === today.toDateString();
        const isPast = currentDateObj < today;
        const isAvailable = availableWeekdays.includes(dayOfWeek) && !isPast;
        const isSelected = selectedDate && currentDateObj.toDateString() === selectedDate.toDateString();

        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (isAvailable) classes += ' available';
        if (!isAvailable) classes += ' disabled';

        const dataAttributes = isAvailable ? `data-action="select-date" data-year="${year}" data-month="${month}" data-day="${day}"` : '';
        html += `<div class="${classes}" ${dataAttributes}>${day}</div>`;
    }

    html += `</div>`;
    document.getElementById('booking-calendar').innerHTML = html;
}

export function renderAdminCalendar() {
    const container = document.getElementById('admin-calendar-container');
    if (!container) return;
    const APPOINTMENT_LIMIT = 2;
    const appointmentsByDate = {};
    state.appointments.forEach(app => {
        const client = state.clients.find(c => c.id === app.clientId);
        const clientName = client ? client.name : 'Nieznany klient';
        if (!appointmentsByDate[app.date]) {
            appointmentsByDate[app.date] = [];
        }
        appointmentsByDate[app.date].push({ id: app.id, time: app.time, clientName: clientName });
    });
    const { currentDate } = state.calendar;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
    const dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    let html = `
        <div class="calendar-header">
            <button class="calendar-nav-btn" data-action="change-month" data-direction="-1" data-is-admin="true">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h3 class="text-lg font-semibold">${monthNames[month]} ${year}</h3>
            <button class="calendar-nav-btn" data-action="change-month" data-direction="1" data-is-admin="true">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
        </div>
        <div class="calendar-grid admin-calendar-grid">
    `;

    dayNames.forEach(day => { html += `<div class="calendar-day-header">${day}</div>`; });
    for (let i = 0; i < startingDayOfWeek; i++) { html += `<div></div>`; }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const appointmentsForDay = appointmentsByDate[dateString] || [];
        let dayAppointmentsHTML = '';
        if (appointmentsForDay.length > 0) {
            appointmentsForDay.sort((a, b) => a.time.localeCompare(b.time));
            dayAppointmentsHTML = appointmentsForDay.slice(0, APPOINTMENT_LIMIT).map(app => `<div class="admin-calendar-appointment">${app.time} - ${app.clientName}</div>`).join('');
            if (appointmentsForDay.length > APPOINTMENT_LIMIT) {
                const remaining = appointmentsForDay.length - APPOINTMENT_LIMIT;
                dayAppointmentsHTML += `<div class="admin-calendar-more-link" data-action="show-day-details" data-date="${dateString}">+ ${remaining} więcej...</div>`;
            }
        }
        html += `<div class="admin-calendar-day" data-action="show-day-details" data-date="${dateString}"><div class="day-number">${day}</div>${dayAppointmentsHTML}</div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
}
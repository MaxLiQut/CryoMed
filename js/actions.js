import { state } from './state.js';
import * as render from './render.js';
import { nextId, formatISO } from './utils.js';
import { STATUS } from './constants.js';
import { openModal, closeModal, closeAllModals } from './ui.js';

/*
 This file contains functions that change the application's state.
 Each function should mutate the `state` object and then call the
 appropriate render function(s) to update the UI. This centralizes
 state management logic.
*/

// --- Authentication ---
export function login(role) {
    state.view = role;
    render.renderApp();
}

export function logout() {
    state.view = 'login';
    render.renderApp();
}

// --- Client Management (Admin) ---
export function addClient({ name, entriesLeft, expires }) {
    if (!name || !expires) {
        alert('Uzupełnij imię/nazwisko oraz datę ważności.');
        return;
    }
    state.clients.push({
        id: nextId(state.clients),
        name,
        contact: '',
        subscription: {
            type: 'Nowy',
            entriesLeft: parseInt(entriesLeft, 10) || 0,
            expires
        },
        history: [],
        notes: ''
    });
    render.renderClientsList();
    closeModal('manageClientModal');
    alert(`Klient "${name}" został dodany.`);
}

export function updateClient(clientId, { name, entriesLeft, expires, notes }) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;

    client.name = name;
    client.subscription.entriesLeft = parseInt(entriesLeft, 10);
    client.subscription.expires = expires;
    if (notes !== undefined) {
        client.notes = notes;
    }

    render.renderClientsList();
    closeModal('manageClientModal');
    alert(`Dane klienta "${name}" zostały zaktualizowane.`);
}

export function deleteClient(clientId) {
    const clientName = state.clients.find(c => c.id === clientId)?.name || '';
    state.clients = state.clients.filter(c => c.id !== clientId);
    state.clientToDeleteId = null;
    closeAllModals();
    render.renderClientsList();
    alert(`Klient "${clientName}" został usunięty.`);
}

export function addHistoryItem(clientId, itemData) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    if (!itemData.date) {
        alert('Proszę wybrać datę wizyty.');
        return;
    }

    client.history.unshift({
        date: itemData.date,
        duration: itemData.status === 'Odwiedzono' ? `${itemData.duration || 180} sec` : null,
        status: itemData.status,
        temperature: itemData.status === 'Odwiedzono' ? `${itemData.temperature || -130}°C` : null,
    });

    if (itemData.status === 'Odwiedzono' && client.subscription.entriesLeft > 0) {
        client.subscription.entriesLeft -= 1;
    }

    state.activeModalTab = 'tab-history';
    render.renderClientForm({ mode: 'edit', client });
}

export function deleteHistoryItem(clientId, historyIndex) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;

    const sorted = [...client.history].sort((a, b) => new Date(b.date) - new Date(a.date));
    const itemToDelete = sorted[historyIndex];
    const originalIndex = client.history.findIndex(h => h === itemToDelete);

    if (originalIndex > -1) {
        client.history.splice(originalIndex, 1);
    }

    state.activeModalTab = 'tab-history';
    render.renderClientForm({ mode: 'edit', client });
}

// --- Requests & Appointments (Client) ---
export function createBookingRequest(time) {
    if (!state.calendar.selectedDate) {
        alert('Proszę najpierw wybrać datę w kalendarzu.');
        return;
    }
    const date = formatISO(state.calendar.selectedDate);
    const client = state.clients.find(c => c.id === state.currentClientId);

    state.requests.push({
        from: client.name,
        clientId: client.id,
        type: 'Rezerwacja z kalendarza',
        details: `Prośba o wizytę: ${date} o ${time}`,
        status: STATUS.PENDING_ADMIN
    });

    render.renderClientDashboard();
    alert(`Twoja prośba o rezerwację na ${date} o ${time} została wysłana!`);
}

export function createSpecialRequest({ requestedDate, requestedTime }) {
    if (!requestedDate || !requestedTime) {
        alert('Proszę wybrać datę i godzinę.');
        return;
    }
    const client = state.clients.find(c => c.id === state.currentClientId);
    let type = 'Termin Specjalny';
    let details = `Prośba o wizytę: ${requestedDate} o ${requestedTime}`;

    // Check if it's a change request
    if (state.appointmentToChangeId !== null) {
        const idx = state.appointments.findIndex(a => a.id === state.appointmentToChangeId);
        if (idx > -1) {
            const orig = state.appointments[idx];
            type = 'Prośba o zmianę terminu';
            details = `Klient prosi o zmianę terminu z <strong>${orig.date} o ${orig.time}</strong> na <strong>${requestedDate} o ${requestedTime}</strong>.`;
            state.appointments.splice(idx, 1);
        }
        state.appointmentToChangeId = null;
    }

    state.requests.push({ from: client.name, clientId: client.id, type, details, status: STATUS.PENDING_ADMIN });
    alert('Twoja prośba została wysłana!');
    render.renderClientDashboard();
    closeModal('specialTermModal');
}

export function acceptAdminProposal(requestIndex) {
    const req = state.requests[requestIndex];
    if (!req) return;

    const dateMatch = req.details.match(/\d{4}-\d{2}-\d{2}/g);
    const timeMatch = req.details.match(/\d{2}:\d{2}/g);

    if (dateMatch && timeMatch) {
        const date = dateMatch.pop();
        const time = timeMatch.pop();
        state.appointments.push({ id: nextId(state.appointments), date, time, clientId: state.currentClientId });
        state.requests.splice(requestIndex, 1);
        alert('Propozycja została zaakceptowana! Twój termin został zarezerwowany.');
        render.renderClientDashboard();
        render.renderAdminCalendar(); // Update admin view too
    } else {
        alert('Błąd: Nie udało się przetworzyć terminu z propozycji.');
    }
}

export function rejectAdminProposal(requestIndex) {
    state.requests.splice(requestIndex, 1);
    alert('Propozycja została odrzucona.');
    render.renderClientDashboard();
}

// --- Requests & Appointments (Admin) ---
export function confirmRequest(requestIndex) {
    const req = state.requests[requestIndex];
    if (!req) return;

    const dateMatch = req.details.match(/\d{4}-\d{2}-\d{2}/g);
    const timeMatch = req.details.match(/\d{2}:\d{2}/g);
    if (!dateMatch || !timeMatch) {
        alert('Nie udało się przetworzyć daty i godziny z wniosku. Odrzuć wniosek.');
        return;
    }
    const date = dateMatch.pop();
    const time = timeMatch.pop();

    state.appointments.push({ id: nextId(state.appointments), date, time, clientId: req.clientId });
    req.status = STATUS.CONFIRMED;
    req.details = `Wizyta na <strong>${date} o ${time}</strong> została pomyślnie potwierdzona!`;

    render.renderRequests();
    render.renderAdminCalendar();
    alert(`Wizyta dla "${req.from}" na ${date} o ${time} została potwierdzona!`);
}

export function rejectRequest(requestIndex) {
    const req = state.requests[requestIndex];
    if (!req) return;

    req.status = STATUS.REJECTED;
    req.details = `Prośba (${req.details}) została odrzucona.`;
    render.renderRequests();
    alert(`Wniosek od "${req.from}" został odrzucony.`);
}

export function proposeNewTime({ newDate, newTime }) {
    if (!newDate || !newTime) {
        alert('Proszę wybrać nową datę i godzinę.');
        return;
    }

    if (state.requestToEditIndex !== null) {
        const req = state.requests[state.requestToEditIndex];
        if (req) {
            req.details = `Administrator zaproponował nowy termin: <strong>${newDate} o ${newTime}</strong>.`;
            req.status = STATUS.PENDING_CLIENT;
        }
    } else if (state.appointmentToEditId !== null) {
        // This is for changing an existing appointment
    }

    state.requestToEditIndex = null;
    state.appointmentToEditId = null;
    render.renderRequests();
    closeModal('proposeTimeModal');
    alert('Propozycja zmiany terminu została wysłana do klienta!');
}

/* ---------- НОВІ ДІЇ ДЛЯ КАЛЕНДАРЯ АДМІНІСТРАТОРА ---------- */

export function adminDeleteAppointment(appointmentId) {
    const appIndex = state.appointments.findIndex(a => a.id === appointmentId);
    if (appIndex === -1) return;

    if (confirm('Czy na pewno chcesz usunąć tę wizytę?')) {
        state.appointments.splice(appIndex, 1);
        // Re-render the modal with updated info and the main calendar
        render.renderDayDetailsModal(state.dayForModal);
        render.renderAdminCalendar();
        alert('Wizyta została usunięta.');
    }
}

export function createAppointment({ clientId, time }) {
    if (!clientId || !time || !state.dayForModal) {
        alert('Błąd: Nie można utworzyć wizyty. Brak danych.');
        return;
    }
    const client = state.clients.find(c => c.id === parseInt(clientId));
    if (!client) {
        alert('Błąd: Wybrany klient nie istnieje.');
        return;
    }
    if (client.subscription.entriesLeft <= 0) {
        if (!confirm(`Uwaga: Klient "${client.name}" nie ma dostępnych wejść na karnecie. Czy na pewno chcesz utworzyć wizytę?`)) {
            return;
        }
    }

    state.appointments.push({
        id: nextId(state.appointments),
        date: state.dayForModal,
        time,
        clientId: parseInt(clientId)
    });

    client.subscription.entriesLeft--; // Take one entry

    closeAllModals();
    render.renderAdminCalendar();
    alert(`Dodano wizytę dla ${client.name} na ${state.dayForModal} o ${time}.`);
}



// --- Modal Opening & State Setup ---
export function openAddClientModal() {
    state.activeModalTab = 'tab-main';
    state.clientToManageId = null;
    render.renderClientForm({ mode: 'add', client: null });
    openModal('manageClientModal');
}

export function openManageClientModal(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    state.clientToManageId = clientId;
    state.activeModalTab = 'tab-main';
    render.renderClientForm({ mode: 'edit', client });
    openModal('manageClientModal');
}

export function openDeleteConfirmModal(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    state.clientToDeleteId = clientId;
    document.getElementById('deleteConfirmText').innerText = `Czy na pewno chcesz usunąć klienta "${client.name}"? Tej operacji nie można cofnąć.`;
    openModal('deleteConfirmModal');
}

export function openProposeTimeModal(requestIndex) {
    state.requestToEditIndex = requestIndex;
    state.appointmentToEditId = null;
    openModal('proposeTimeModal');
}

// --- НОВІ ФУНКЦІЇ ДЛЯ ВІДКРИТТЯ МОДАЛЬНИХ ВІКОН ---
export function openDayDetailsModal(date) {
    state.dayForModal = date;
    render.renderDayDetailsModal(date);
    openModal('dayDetailsModal');
}

export function openCreateAppointmentModal() {
    render.renderClientSelectOptions();
    // The date is already stored in state.dayForModal
    const title = document.getElementById('createAppointmentModalTitle');
    if (title) title.textContent = `Nowa wizyta na dzień ${state.dayForModal}`;
    openModal('createAppointmentModal');
}

// --- Calendar ---
export function changeMonth(direction, isAdmin) {
    state.calendar.currentDate.setMonth(state.calendar.currentDate.getMonth() + direction);
    if (isAdmin) {
        render.renderAdminCalendar();
    } else {
        render.renderCalendar();
        render.renderTimeSlots(state.calendar.selectedDate);
    }
}

export function selectDate(y, m, d) {
    state.calendar.selectedDate = new Date(y, m, d);
    render.renderCalendar();
    render.renderTimeSlots(state.calendar.selectedDate);
}
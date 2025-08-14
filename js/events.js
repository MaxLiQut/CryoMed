import { state } from './state.js';
import * as actions from './actions.js';
import { toggleTheme } from './theme.js';
import { closeAllModals } from './ui.js';
import * as render from './render.js';
import { debounce } from './utils.js';

// --- Event Handlers Setup ---
export function setupEventListeners() {
    document.body.addEventListener('click', handleBodyClick);
    document.body.addEventListener('submit', handleFormSubmit);
    document.body.addEventListener('keydown', handleKeyDown);

    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');
    if (searchInput) searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    if (filterSelect) filterSelect.addEventListener('change', handleFilterChange);
}


// --- Main Delegated Handlers ---

function handleBodyClick(e) {
    const target = e.target;

    // --- Actions via ID ---
    const targetId = target.id || target.closest('button')?.id;
    switch (targetId) {
        case 'loginAdminBtn': return actions.login('admin');
        case 'loginClientBtn': return actions.login('client');
        case 'logoutAdminBtn': return actions.logout();
        case 'logoutClientBtn': return actions.logout();
        case 'addClientBtn': return actions.openAddClientModal();
        case 'requestSpecialTermBtn': return actions.openModal('specialTermModal');
        case 'confirmDeleteBtn':
            if (state.clientToDeleteId) actions.deleteClient(state.clientToDeleteId);
            return;
        case 'deleteClientBtn':
            actions.openDeleteConfirmModal(state.clientToManageId);
            return;
        case 'addHistoryBtn':
            handleAddHistory();
            return;
        // НОВИЙ ОБРОБНИК
        case 'add-new-appointment-btn':
            actions.openCreateAppointmentModal();
            return;
    }

    // --- Actions via data-action attribute ---
    const dataActionTarget = target.closest('[data-action]');
    if (dataActionTarget) {
        const { action, direction, isAdmin, year, month, day, date } = dataActionTarget.dataset;
        switch (action) {
            case 'close-modal': return closeAllModals();
            case 'change-month': return actions.changeMonth(parseInt(direction, 10), isAdmin === 'true');
            case 'select-date': return actions.selectDate(parseInt(year, 10), parseInt(month, 10), parseInt(day, 10));
            // НОВИЙ ОБРОБНИК
            case 'show-day-details':
                actions.openDayDetailsModal(date);
                return;
        }
    }

    // --- Actions via class name ---
    const classActions = {
        '.manage-btn': (el) => actions.openManageClientModal(parseInt(el.dataset.clientId, 10)),
        '.delete-history-btn': (el) => actions.deleteHistoryItem(state.clientToManageId, parseInt(el.dataset.historyIndex, 10)),
        '.tab-button': handleTabClick,
        '.theme-toggle': toggleTheme,
        '.time-slot:not(.booked):not(:disabled)': (el) => actions.createBookingRequest(el.textContent.trim()),
        '.confirm-request-btn': (el) => actions.confirmRequest(parseInt(el.dataset.requestIndex, 10)),
        '.reject-request-btn': (el) => actions.rejectRequest(parseInt(el.dataset.requestIndex, 10)),
        '.propose-new-time-btn': (el) => actions.openProposeTimeModal(parseInt(el.dataset.requestIndex, 10)),
        '.accept-proposal-btn': (el) => actions.acceptAdminProposal(parseInt(el.dataset.requestIndex, 10)),
        '.reject-proposal-btn': (el) => actions.rejectAdminProposal(parseInt(el.dataset.requestIndex, 10)),
        '.change-appointment-btn': handleChangeAppointmentClick,
        '.delete-appointment-btn': (el) => actions.adminDeleteAppointment(parseInt(el.dataset.appointmentId, 10)),
    };

    for (const selector in classActions) {
        const el = target.closest(selector);
        if (el) {
            classActions[selector](el);
            return;
        }
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;

    switch (form.id) {
        case 'manage-client-form':
            handleManageClientSubmit(form);
            break;
        case 'specialTermForm':
            actions.createSpecialRequest({
                requestedDate: form.querySelector('#specialDate').value,
                requestedTime: form.querySelector('#specialTime').value,
            });
            form.reset();
            break;
        case 'proposeTimeForm':
            actions.proposeNewTime({
                newDate: form.querySelector('#proposeDate').value,
                newTime: form.querySelector('#proposeTime').value,
            });
            form.reset();
            break;
        case 'createAppointmentForm':
            actions.createAppointment({
                clientId: form.querySelector('#clientSelect').value,
                time: form.querySelector('#appointmentTime').value,
            });
            form.reset();
            break;
    }
}

function handleKeyDown(e) {
    // Calendar Keyboard Navigation
    const focused = document.activeElement;
    if (focused && focused.classList.contains('calendar-day') && focused.dataset.action) {
        handleCalendarKeyDown(e, focused);
    }
}


// --- Specific Event Logic ---

function handleCalendarKeyDown(e, focused) {
    const { year, month, day, isAdmin, action } = focused.dataset;
    const baseDate = new Date(parseInt(year, 10), parseInt(month, 10), parseInt(day, 10));

    let delta = 0;
    switch (e.key) {
        case 'ArrowLeft': delta = -1; break;
        case 'ArrowRight': delta = 1; break;
        case 'ArrowUp': delta = -7; break;
        case 'ArrowDown': delta = 7; break;
        case 'Enter':
        case ' ':
            e.preventDefault();
            focused.click(); // Trigger the click action
            return;
        default: return;
    }

    e.preventDefault();
    if (delta === 0) return;

    baseDate.setDate(baseDate.getDate() + delta);
    const nextDate = { y: baseDate.getFullYear(), m: baseDate.getMonth(), d: baseDate.getDate() };
    const nextDaySelector = `.calendar-day[data-date="${nextDate.y}-${String(nextDate.m + 1).padStart(2, '0')}-${String(nextDate.d).padStart(2, '0')}"]`;
    const nextDayEl = document.querySelector(nextDaySelector);

    if (nextDayEl) {
        nextDayEl.focus();
    } else {
        // Day is in another month, change month and focus after re-render
        actions.changeMonth(delta > 0 ? 1 : -1, isAdmin === 'true');
        // Use a microtask to wait for the DOM update
        queueMicrotask(() => {
            document.querySelector(nextDaySelector)?.focus();
        });
    }
}

function handleManageClientSubmit(form) {
    const isEdit = form.dataset.mode === 'edit';
    const clientId = parseInt(form.dataset.clientId, 10);

    const formData = {
        name: form.querySelector('#clientName').value,
        entriesLeft: form.querySelector('#entriesLeft').value,
        expires: form.querySelector('#expires').value,
    };

    if (isEdit) {
        const notesEl = form.querySelector('#clientNotes');
        if (notesEl) formData.notes = notesEl.value;
        actions.updateClient(clientId, formData);
    } else {
        actions.addClient(formData);
    }
}

function handleAddHistory() {
    const modal = document.getElementById('manageClientModal');
    if (!modal) return;

    const itemData = {
        date: modal.querySelector('#newHistoryDate').value,
        duration: modal.querySelector('#newHistoryDuration').value,
        status: modal.querySelector('#newHistoryStatus').value,
        temperature: modal.querySelector('#newHistoryTemp').value,
    };

    actions.addHistoryItem(state.clientToManageId, itemData);
}

function handleTabClick(tabButton) {
    if (tabButton.classList.contains('active')) return;
    state.activeModalTab = tabButton.dataset.tab;
    const client = state.clients.find(c => c.id === state.clientToManageId);
    if (client) {
        render.renderClientForm({ mode: 'edit', client });
    } else {
        render.renderClientForm({ mode: 'add', client: null });
    }
}

function handleChangeAppointmentClick(button) {
    const id = parseInt(button.dataset.appointmentId, 10);
    const app = state.appointments.find(a => a.id === id);
    if (!app) return;

    const diffH = (new Date(`${app.date}T${app.time}`) - new Date()) / 36e5;
    let msg = 'Czy na pewno chcesz poprosić o zmianę terminu? Twoja obecna rezerwacja zostanie anulowana, a wniosek wysłany do administratora.';
    if (diffH < 24 && diffH >= 0) {
        msg = 'UWAGA: Do wizyty pozostało mniej niż 24 godziny. Zgodnie z regulaminem, z Twojego karnetu zostanie odjęte 1 wejście. Czy chcesz kontynuować?';
    } else if (diffH < 0) {
        alert("Nie można zmienić terminu przeszłej wizyty.");
        return;
    }

    if (!confirm(msg)) return;

    const client = state.clients.find(c => c.id === state.currentClientId);
    if (diffH < 24) {
        if (client.subscription.entriesLeft > 0) {
            client.subscription.entriesLeft -= 1;
        }
    }
    state.appointmentToChangeId = app.id;
    actions.openModal('specialTermModal');
}

function handleSearchInput(e) {
    state.filters.searchQuery = e.target.value;
    render.renderClientsList();
}

function handleFilterChange(e) {
    state.filters.filterBy = e.target.value;
    render.renderClientsList();
}
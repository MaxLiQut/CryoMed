import { state } from './state.js';
import * as render from './render.js';

/* --------- Toasts (заміна alert) --------- */
const __origAlert = window.alert.bind(window);
function toast(msg, type = 'info', ttl = 2500) {
    const el = document.getElementById('toast');
    if (!el) return __origAlert(msg);
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), ttl);
}
window.alert = (m) => toast(String(m));

/* --------- Focus trap для модалей --------- */
const __focusTrap = new Map();
function trapFocus(modalEl) {
    const focusables = modalEl.querySelectorAll('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    function onKey(e) {
        if (e.key === 'Escape') closeAnyOpenModal();
        if (e.key !== 'Tab') return;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    modalEl.addEventListener('keydown', onKey);
    __focusTrap.set(modalEl, onKey);
    __focusTrap.set('returnFocus', document.activeElement);
    first.focus();
}
function untrapFocus(modalEl) {
    const onKey = __focusTrap.get(modalEl);
    if (onKey) modalEl.removeEventListener('keydown', onKey);
    __focusTrap.delete(modalEl);
    const back = __focusTrap.get('returnFocus');
    if (back?.focus) back.focus();
    __focusTrap.delete('returnFocus');
}
function closeAnyOpenModal() {
    for (const id of ['manageClientModal', 'createAppointmentModal', 'specialTermModal', 'proposeTimeModal', 'dayDetailsModal']) {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) {
            el.classList.add('hidden'); untrapFocus(el); break;
        }
    }
}
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAnyOpenModal(); });

/* --------- Helpers --------- */
const nextId = (arr) => (arr?.length ? Math.max(...arr.map(a => a.id || 0)) + 1 : 1);

/* ================== ACTIONS ================== */
function login(role) {
    document.getElementById('loginScreen').classList.add('hidden');
    if (role === 'admin') {
        document.getElementById('adminDashboard').classList.remove('hidden');
        render.renderStatistics();
        render.renderClientsList();
        render.renderRequests();
        render.renderAdminCalendar();
    } else {
        document.getElementById('clientDashboard').classList.remove('hidden');
        render.renderClientDashboard();
        initializeCalendar();
    }
}
function logout() {
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('clientDashboard').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
}

/* Manage client modal */
function openManageClientModal(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    state.activeModalTab = 'tab-main';
    render.renderClientForm({ mode: 'edit', client });
    const m = document.getElementById('manageClientModal'); trapFocus(m);
    m.classList.remove('hidden');
}
function openAddClientModal() {
    state.activeModalTab = 'tab-main';
    render.renderClientForm({ mode: 'add', client: null });
    const m = document.getElementById('manageClientModal'); trapFocus(m);
    m.classList.remove('hidden');
}
function closeManageClientModal() { const m = document.getElementById('manageClientModal'); untrapFocus(m); m.classList.add('hidden'); }

function openDeleteConfirmationModal(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    state.clientToDeleteId = clientId;
    document.getElementById('deleteConfirmText').innerText = `Czy na pewno chcesz usunąć klienta "${client.name}"? Tej operacji nie można cofnąć.`;
    document.getElementById('deleteConfirmModal').classList.remove('hidden');
}
function closeDeleteConfirmationModal() { state.clientToDeleteId = null; document.getElementById('deleteConfirmModal').classList.add('hidden'); }

function updateClient(clientId, data) {
    const c = state.clients.find(x => x.id === clientId);
    if (!c) return;
    c.name = data.name;
    c.subscription.entriesLeft = parseInt(data.entriesLeft, 10);
    c.subscription.expires = data.expires;
}
function deleteClient(id) { state.clients = state.clients.filter(c => c.id !== id); }

/* Calendars */
function initializeCalendar() { render.renderCalendar(); }
function changeMonth(direction, isAdmin = false) {
    state.calendar.currentDate.setMonth(state.calendar.currentDate.getMonth() + direction);
    isAdmin ? render.renderAdminCalendar() : render.renderCalendar();
}
function selectDate(y, m, d) {
    state.calendar.selectedDate = new Date(y, m, d);
    render.renderCalendar();
    render.renderTimeSlots(state.calendar.selectedDate);
}

/* Day details (admin) */
function showDayDetails(dateString) {
    const title = document.getElementById('dayDetailsModalTitle');
    const body = document.getElementById('dayDetailsModalBody');
    const visitDate = new Date(dateString);
    title.innerText = `Wizyty na dzień ${visitDate.getDate()}.${visitDate.getMonth() + 1}.${visitDate.getFullYear()}`;

    const list = state.appointments.filter(a => a.date === dateString).sort((a, b) => a.time.localeCompare(b.time));
    const html = !list.length
        ? `<p class="text-sm text-gray-500 text-center py-4">Brak zaplanowanych wizyt na ten dzień.</p>`
        : list.map(app => {
            const c = state.clients.find(x => x.id === app.clientId);
            return `
          <div class="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
            <p class="font-semibold">${app.time} - ${c ? c.name : 'Nieznany klient'}</p>
            <div class="space-x-3">
              <button class="manage-appointment-btn text-xs text-indigo-600 hover:underline" data-appointment-id="${app.id}">Zmień termin</button>
              <button class="delete-appointment-btn text-xs text-red-500 hover:underline" data-appointment-id="${app.id}">Usuń</button>
            </div>
          </div>`;
        }).join('');

    body.innerHTML = `${html}
    <div class="mt-4 border-t pt-4">
      <button data-action="open-create-appointment-from-details" data-date="${dateString}"
        class="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">+ Dodaj nową wizytę</button>
    </div>`;
    const m = document.getElementById('dayDetailsModal'); trapFocus(m); m.classList.remove('hidden');
}
function openCreateAppointmentFromDetails(dateString) { closeDayDetailsModal(); openCreateAppointmentModal(dateString); }
function openCreateAppointmentModal(dateString) {
    const m = document.getElementById('createAppointmentModal'); trapFocus(m);
    m.querySelector('#createAppointmentModalTitle').innerText = `Nowa wizyta na dzień ${dateString}`;
    m.querySelector('#appointmentDateInput').value = dateString;
    m.querySelector('#clientSelect').innerHTML = state.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    m.classList.remove('hidden');
}
function closeCreateAppointmentModal() { const m = document.getElementById('createAppointmentModal'); untrapFocus(m); m.classList.add('hidden'); }
function openSpecialTermModal() { const m = document.getElementById('specialTermModal'); trapFocus(m); m.classList.remove('hidden'); }
function closeSpecialTermModal() { const m = document.getElementById('specialTermModal'); untrapFocus(m); m.classList.add('hidden'); }
function openProposeTimeModal({ requestIndex, appointmentId }) {
    const m = document.getElementById('proposeTimeModal'); trapFocus(m);
    state.requestToEditIndex = null; state.appointmentToEditId = null;
    if (requestIndex !== undefined) { document.getElementById('requestIndexInput').value = requestIndex; state.requestToEditIndex = requestIndex; }
    if (appointmentId !== undefined) { state.appointmentToEditId = appointmentId; }
    m.classList.remove('hidden');
}
function closeProposeTimeModal() { const m = document.getElementById('proposeTimeModal'); untrapFocus(m); m.classList.add('hidden'); }
function closeDayDetailsModal() { const m = document.getElementById('dayDetailsModal'); untrapFocus(m); m.classList.add('hidden'); }

/* ================== LISTENERS ================== */
function setupLoginListeners() {
    document.getElementById('loginAdminBtn').addEventListener('click', () => login('admin'));
    document.getElementById('loginClientBtn').addEventListener('click', () => login('client'));
    document.getElementById('logoutAdminBtn').addEventListener('click', logout);
    document.getElementById('logoutClientBtn').addEventListener('click', logout);
}

function setupAdminDashboardListeners() {
    const root = document.getElementById('adminDashboard');
    if (!root) return;

    root.addEventListener('click', (e) => {
        const t = e.target;

        if (t.id === 'addClientBtn') return openAddClientModal();

        if (t.classList.contains('manage-btn')) {
            const id = parseInt(t.dataset.clientId, 10);
            return openManageClientModal(id);
        }

        const reqIndex = parseInt(t.dataset.requestIndex, 10);
        if (!Number.isNaN(reqIndex)) {
            const req = state.requests[reqIndex]; if (!req) return;

            if (t.classList.contains('reject-request-btn')) {
                req.status = 'rejected';
                req.details = `Prośba (${req.details}) została odrzucona.`;
                render.renderRequests(); alert(`Wniosek od "${req.from}" został odrzucony.`);
            }
            if (t.classList.contains('propose-new-time-btn')) {
                openProposeTimeModal({ requestIndex: reqIndex });
            }
            if (t.classList.contains('confirm-request-btn')) {
                const dateMatch = req.details.match(/\d{4}-\d{2}-\d{2}/g);
                const timeMatch = req.details.match(/\d{2}:\d{2}/g);
                if (!dateMatch || !timeMatch) {
                    alert('Nie udało się przetworzyć daty i godziny z wniosku.');
                    state.requests.splice(reqIndex, 1); render.renderRequests(); return;
                }
                const date = dateMatch[dateMatch.length - 1];
                const time = timeMatch[timeMatch.length - 1];
                const client = state.clients.find(c => c.id === req.clientId);
                if (!client) { alert(`Klient o ID "${req.clientId}" nie został znaleziony.`); return; }

                state.appointments.push({ id: nextId(state.appointments), date, time, clientId: client.id });
                req.status = 'confirmed';
                req.details = `Wizyta na <strong>${date} o ${time}</strong> została pomyślnie potwierdzona!`;
                render.renderRequests(); render.renderAdminCalendar(); render.renderClientsList();
                alert(`Wizyta dla "${req.from}" na ${date} o ${time} została potwierdzona!`);
            }
        }
    });

    document.getElementById('searchInput').addEventListener('input', (e) => { state.filters.searchQuery = e.target.value; render.renderClientsList(); });
    document.getElementById('filterSelect').addEventListener('change', (e) => { state.filters.filterBy = e.target.value; render.renderClientsList(); });
}

function setupClientDashboardListeners() {
    const root = document.getElementById('clientDashboard');
    if (!root) return;

    root.addEventListener('click', (e) => {
        const t = e.target;

        // tabs
        if (t.closest('#client-dashboard-tabs') && t.dataset.tab) {
            state.clientDashboardTab = t.dataset.tab;
            render.renderClientDashboard();
            return;
        }

        // quick special term
        if (t.id === 'requestSpecialTermBtn' || t.closest?.('#requestSpecialTermBtn')) {
            state.appointmentToChangeId = null;
            openSpecialTermModal();
            return;
        }

        // pick time slot
        if (t.classList.contains('time-slot') && !t.disabled) {
            if (!state.calendar.selectedDate) { alert('Proszę najpierw wybrać datę w kalendarzu.'); return; }
            const selectedTime = t.textContent.trim();
            const d = state.calendar.selectedDate;
            const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const client = state.clients.find(c => c.id === state.currentClientId);
            state.requests.push({ from: client.name, clientId: client.id, type: 'Rezerwacja z kalendarza', details: `Prośba o wizytę: ${date} o ${selectedTime}`, status: 'pending_admin_approval' });
            render.renderClientDashboard();
            alert(`Twoja prośba o rezerwację na ${date} o ${selectedTime} została wysłana!`);
            return;
        }

        // accept / reject admin proposal
        if (t.classList.contains('accept-proposal-btn') || t.classList.contains('reject-proposal-btn')) {
            const idx = parseInt(t.dataset.requestIndex, 10); const req = state.requests[idx]; if (!req) return;
            if (t.classList.contains('reject-proposal-btn')) {
                state.requests.splice(idx, 1); alert('Propozycja została odrzucona.'); render.renderClientDashboard(); return;
            }
            const dateMatch = req.details.match(/\d{4}-\d{2}-\d{2}/g);
            const timeMatch = req.details.match(/\d{2}:\d{2}/g);
            if (dateMatch && timeMatch) {
                const date = dateMatch.pop(); const time = timeMatch.pop();
                state.appointments.push({ id: nextId(state.appointments), date, time, clientId: state.currentClientId });
                state.requests.splice(idx, 1);
                alert('Propozycja została zaakceptowana! Twój termin został zarezerwowany.');
                render.renderClientDashboard(); render.renderAdminCalendar();
            } else {
                alert('Błąd: Nie udało się przetworzyć terminu z propozycji.');
            }
        }

        // request to change existing appointment
        if (t.classList.contains('change-appointment-btn')) {
            const id = parseInt(t.dataset.appointmentId, 10);
            const app = state.appointments.find(a => a.id === id);
            if (!app) return;
            const diffH = (new Date(`${app.date}T${app.time}`) - new Date()) / 36e5;
            let msg = 'Czy na pewno chcesz poprosić o zmianę terminu? Twoja obecna rezerwacja zostanie anulowana.';
            if (diffH < 24) msg = 'UWAGA: Do wizyty pozostało mniej niż 24 godziny. Z Twojego karnetu zostanie odjęte 1 wejście. Kontynuować?';
            if (!confirm(msg)) return;
            const client = state.clients.find(c => c.id === state.currentClientId);
            if (diffH < 24) client.subscription.entriesLeft -= 1;
            state.appointmentToChangeId = app.id;
            openSpecialTermModal();
        }
    });
}

function setupModalListeners() {
    // close button
    document.getElementById('closeManageClientModalBtn').addEventListener('click', closeManageClientModal);

    // tabs, add/delete history, save form
    document.getElementById('manageClientModalBody').addEventListener('click', (e) => {
        const t = e.target;

        if (t.classList.contains('tab-button')) {
            e.preventDefault();
            state.activeModalTab = t.dataset.tab;
            const body = document.getElementById('manageClientModalBody');
            body.querySelectorAll('.tab-button').forEach(x => x.classList.remove('active'));
            body.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            document.getElementById(state.activeModalTab).classList.add('active');
            return;
        }

        const form = document.querySelector('#manage-client-form');
        if (!form?.dataset.clientId) return;
        const clientId = parseInt(form.dataset.clientId, 10);
        const client = state.clients.find(c => c.id === clientId);
        if (!client) return;

        if (t.id === 'cancelManageClientBtn') { state.activeModalTab = 'tab-main'; closeManageClientModal(); }
        if (t.id === 'deleteClientBtn') { openDeleteConfirmationModal(clientId); }
        if (t.id === 'addHistoryBtn') {
            const dateInput = document.getElementById('newHistoryDate');
            const durationInput = document.getElementById('newHistoryDuration');
            const statusInput = document.getElementById('newHistoryStatus');
            const tempInput = document.getElementById('newHistoryTemp');
            if (!dateInput.value) { alert('Proszę wybrać datę wizyty.'); return; }

            let temp = tempInput.value ? `${tempInput.value}°C` : null;
            let dur = durationInput.value ? `${durationInput.value} sec` : null;
            if (statusInput.value !== 'Odwiedzono') { temp = null; dur = null; }

            client.history.push({ date: dateInput.value, duration: dur, status: statusInput.value, temperature: temp });
            if (statusInput.value === 'Odwiedzono') client.subscription.entriesLeft -= 1;

            state.activeModalTab = 'tab-history';
            render.renderClientForm({ mode: 'edit', client });
        }

        if (t.classList.contains('delete-history-btn')) {
            const sorted = [...client.history].sort((a, b) => new Date(b.date) - new Date(a.date));
            const idx = parseInt(t.dataset.historyIndex, 10);
            const item = sorted[idx];
            const original = client.history.findIndex(x => x.date === item.date && x.duration === item.duration && x.status === item.status);
            if (original > -1) client.history.splice(original, 1);
            state.activeModalTab = 'tab-history';
            render.renderClientForm({ mode: 'edit', client });
        }
    });

    document.getElementById('manageClientModalBody').addEventListener('submit', (e) => {
        if (e.target.id !== 'manage-client-form') return;
        e.preventDefault();
        const form = e.target;
        const isEdit = !!form.dataset.clientId;

        if (isEdit) {
            const id = parseInt(form.dataset.clientId, 10);
            updateClient(id, {
                name: form.querySelector('#clientName').value,
                entriesLeft: form.querySelector('#entriesLeft').value,
                expires: form.querySelector('#expires').value
            });
            const notesEl = form.querySelector('#clientNotes');
            if (notesEl) {
                const c = state.clients.find(x => x.id === id);
                c.notes = notesEl.value || '';
            }
            render.renderClientsList(); closeManageClientModal();
        } else {
            const name = form.querySelector('#clientName').value.trim();
            const entriesLeft = parseInt(form.querySelector('#entriesLeft').value, 10) || 0;
            const expires = form.querySelector('#expires').value;
            if (!name || !expires) { alert('Uzupełnij imię/nazwisko oraz datę ważności.'); return; }
            state.clients.push({ id: nextId(state.clients), name, contact: '', subscription: { type: '—', entriesLeft, expires }, history: [], notes: '' });
            render.renderClientsList(); closeManageClientModal();
        }
    });

    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteConfirmationModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        if (state.clientToDeleteId) { deleteClient(state.clientToDeleteId); closeDeleteConfirmationModal(); closeManageClientModal(); render.renderClientsList(); }
    });

    // Special term (client request)
    document.getElementById('cancelSpecialTermBtn').addEventListener('click', closeSpecialTermModal);
    document.getElementById('specialTermForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const requestedDate = document.getElementById('specialDate').value;
        const requestedTime = document.getElementById('specialTime').value;
        if (!requestedDate || !requestedTime) { alert('Proszę wybrać datę i godzinę.'); return; }

        const client = state.clients.find(c => c.id === state.currentClientId);
        let type = 'Termin Specjalny';
        let details = `Prośba o wizytę: ${requestedDate} o ${requestedTime}`;

        if (state.appointmentToChangeId !== null) {
            const idx = state.appointments.findIndex(a => a.id === state.appointmentToChangeId);
            if (idx === -1) return;
            const orig = state.appointments[idx];
            type = 'Prośba o zmianę terminu';
            details = `Klient prosi o zmianę terminu z <strong>${orig.date} o ${orig.time}</strong> na <strong>${requestedDate} o ${requestedTime}</strong>.`;
            state.appointments.splice(idx, 1);
            state.appointmentToChangeId = null;
        }

        state.requests.push({ from: client.name, clientId: client.id, type, details, status: 'pending_admin_approval' });
        alert('Twoja prośba została wysłana!');
        render.renderClientDashboard();
        closeSpecialTermModal();
        e.target.reset();
    });

    // Propose time (admin or edit request)
    document.getElementById('cancelProposeTimeBtn').addEventListener('click', closeProposeTimeModal);
    document.getElementById('proposeTimeForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newDate = document.getElementById('proposeDate').value;
        const newTime = document.getElementById('proposeTime').value;
        if (!newDate || !newTime) { alert('Proszę wybrać nową datę i godzinę.'); return; }

        if (state.appointmentToEditId !== null) {
            const idx = state.appointments.findIndex(a => a.id === state.appointmentToEditId);
            if (idx === -1) return;
            const original = state.appointments[idx];
            const client = state.clients.find(c => c.id === original.clientId);
            state.requests.push({
                from: 'Administrator',
                clientId: client.id,
                type: 'Propozycja zmiany',
                details: `Zaproponowano zmianę terminu z ${original.date} ${original.time} na <strong>${newDate} o ${newTime}</strong>.`,
                status: 'pending_client_approval'
            });
            state.appointments.splice(idx, 1);
        } else if (state.requestToEditIndex !== null) {
            const r = state.requests[state.requestToEditIndex]; if (!r) return;
            r.details = `Administrator zaproponował nowy termin: <strong>${newDate} o ${newTime}</strong>.`;
            r.status = 'pending_client_approval';
        }

        state.appointmentToEditId = null; state.requestToEditIndex = null;
        render.renderRequests(); render.renderAdminCalendar();
        closeProposeTimeModal(); e.target.reset();
        alert('Propozycja zmiany terminu została wysłana do klienta!');
    });

    // Day details modal buttons / quick create
    document.getElementById('closeDayDetailsModalBtn').addEventListener('click', closeDayDetailsModal);
    document.getElementById('dayDetailsModalBody').addEventListener('click', (e) => {
        const t = e.target;
        if (t.dataset.action === 'open-create-appointment-from-details') { openCreateAppointmentFromDetails(t.dataset.date); return; }
        const id = parseInt(t.dataset.appointmentId, 10); if (!id) return;
        if (t.classList.contains('manage-appointment-btn')) openProposeTimeModal({ appointmentId: id });
        if (t.classList.contains('delete-appointment-btn')) {
            if (!confirm('Czy na pewno chcesz usunąć tę wizytę? Klient nie zostanie obciążony karą.')) return;
            const idx = state.appointments.findIndex(a => a.id === id);
            if (idx > -1) {
                const deleted = state.appointments[idx];
                state.appointments.splice(idx, 1);
                closeDayDetailsModal(); render.renderAdminCalendar(); showDayDetails(deleted.date);
                alert('Wizyta została usunięta.');
            }
        }
    });

    // Quick create appointment (admin)
    document.getElementById('cancelCreateAppointmentBtn').addEventListener('click', closeCreateAppointmentModal);
    document.getElementById('createAppointmentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const date = e.target.querySelector('#appointmentDateInput').value;
        const time = e.target.querySelector('#appointmentTime').value;
        const clientId = parseInt(e.target.querySelector('#clientSelect').value, 10);
        const client = state.clients.find(c => c.id === clientId);
        if (!client) return;
        if (client.subscription?.entriesLeft <= 0) { alert('Ten klient nie ma już dostępnych wejść w karnecie!'); return; }
        if (state.appointments.some(a => a.date === date && a.time === time)) { alert('Termin już zajęty'); return; }

        state.appointments.push({ id: nextId(state.appointments), date, time, clientId });
        closeCreateAppointmentModal();
        render.renderAdminCalendar(); render.renderClientsList();
        showDayDetails(date);
    });
}

/* Body-level calendar events + keyboard */
function setupCalendarListeners() {
    document.body.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action]'); if (!t) return;
        const action = t.dataset.action;
        if (action === 'change-month') { changeMonth(parseInt(t.dataset.direction, 10), t.dataset.isAdmin === 'true'); }
        if (action === 'select-date') { selectDate(parseInt(t.dataset.year, 10), parseInt(t.dataset.month, 10), parseInt(t.dataset.day, 10)); }
        if (action === 'show-day-details') { showDayDetails(t.dataset.date); }
        if (action === 'open-create-appointment-from-details') { openCreateAppointmentFromDetails(t.dataset.date); }
    });

    document.body.addEventListener('keydown', (e) => {
        const focused = document.activeElement;
        if (!focused || !focused.classList.contains('calendar-day')) return;
        const y = parseInt(focused.dataset.year, 10);
        const m = parseInt(focused.dataset.month, 10);
        const d = parseInt(focused.dataset.day, 10);
        const isAdmin = focused.dataset.isAdmin === 'true';
        const move = (delta) => {
            const base = new Date(y, (isAdmin ? m - 1 : m), d); // normalize month attr
            base.setDate(base.getDate() + delta);
            const ny = base.getFullYear(), nm = base.getMonth() + 1, nd = base.getDate();
            const sel = document.querySelector(`.calendar-day[data-year="${ny}"][data-month="${nm}"][data-day="${nd}"]`);
            if (sel) { sel.focus(); return; }
            changeMonth(delta > 0 ? 1 : -1, isAdmin);
            queueMicrotask(() => {
                const later = document.querySelector(`.calendar-day[data-year="${ny}"][data-month="${nm}"][data-day="${nd}"]`);
                if (later) later.focus();
            });
        };
        switch (e.key) {
            case 'ArrowLeft': e.preventDefault(); move(-1); break;
            case 'ArrowRight': e.preventDefault(); move(+1); break;
            case 'ArrowUp': e.preventDefault(); move(-7); break;
            case 'ArrowDown': e.preventDefault(); move(+7); break;
            case 'Enter': case ' ': e.preventDefault(); showDayDetails(focused.dataset.date); break;
        }
    });
}

export function setupEventListeners() {
    setupLoginListeners();
    setupAdminDashboardListeners();
    setupClientDashboardListeners();
    setupModalListeners();
    setupCalendarListeners();
}

import { state } from './state.js';
import * as render from './render.js';

// === ACTIONS / LOGIC (Функції-помічники) ===

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

function openManageClientModal(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (client) {
        state.activeModalTab = 'tab-main';
        render.renderClientForm({ mode: 'edit', client });
        document.getElementById('manageClientModal').classList.remove('hidden');
    }
}

function openAddClientModal() {
    state.activeModalTab = 'tab-main';
    render.renderClientForm({ mode: 'add', client: null });
    document.getElementById('manageClientModal').classList.remove('hidden');
}

function closeManageClientModal() {
    document.getElementById('manageClientModal').classList.add('hidden');
}

function openDeleteConfirmationModal(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    state.clientToDeleteId = clientId;
    document.getElementById('deleteConfirmText').innerText = `Czy na pewno chcesz usunąć klienta "${client.name}"? Tej operacji nie można cofnąć.`;
    document.getElementById('deleteConfirmModal').classList.remove('hidden');
}

function closeDeleteConfirmationModal() {
    state.clientToDeleteId = null;
    document.getElementById('deleteConfirmModal').classList.add('hidden');
}

function updateClient(clientId, updatedData) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    client.name = updatedData.name;
    client.subscription.entriesLeft = parseInt(updatedData.entriesLeft, 10);
    client.subscription.expires = updatedData.expires;
}

function deleteClient(clientId) {
    state.clients = state.clients.filter(c => c.id !== clientId);
}

function initializeCalendar() {
    render.renderCalendar();
}

function changeMonth(direction, isAdminCalendar = false) {
    state.calendar.currentDate.setMonth(state.calendar.currentDate.getMonth() + direction);
    if (isAdminCalendar) {
        render.renderAdminCalendar();
    } else {
        render.renderCalendar();
    }
}

function selectDate(year, month, day) {
    state.calendar.selectedDate = new Date(year, month, day);
    render.renderCalendar();
    render.renderTimeSlots(state.calendar.selectedDate);
}

function showDayDetails(dateString) {
    const modalTitle = document.getElementById('dayDetailsModalTitle');
    const modalBody = document.getElementById('dayDetailsModalBody');
    const visitDate = new Date(dateString);
    modalTitle.innerText = `Wizyty na dzień ${visitDate.getDate()}.${visitDate.getMonth() + 1}.${visitDate.getFullYear()}`;

    const appointmentsForDay = state.appointments
        .filter(app => app.date === dateString)
        .sort((a, b) => a.time.localeCompare(b.time));

    let appointmentsHTML = '';

    if (appointmentsForDay.length === 0) {
        appointmentsHTML = `<p class="text-sm text-gray-500 text-center py-4">Brak zaplanowanych wizyt na ten dzień.</p>`;
    } else {
        appointmentsHTML = appointmentsForDay.map(app => {
            const client = state.clients.find(c => c.id === app.clientId);
            const clientName = client ? client.name : 'Nieznany klient';
            return `
                <div class="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                    <p class="font-semibold">${app.time} - ${clientName}</p>
                    <div class="space-x-3">
                        <button class="manage-appointment-btn text-xs text-indigo-600 hover:underline" data-appointment-id="${app.id}">Zmień termin</button>
                        <button class="delete-appointment-btn text-xs text-red-500 hover:underline" data-appointment-id="${app.id}">Usuń</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    modalBody.innerHTML = `
        ${appointmentsHTML}
        <div class="mt-4 border-t pt-4">
            <button 
                data-action="open-create-appointment-from-details" 
                data-date="${dateString}" 
                class="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
                + Dodaj nową wizytę
            </button>
        </div>
    `;

    openDayDetailsModal();
}

function openCreateAppointmentFromDetails(dateString) {
    closeDayDetailsModal();
    openCreateAppointmentModal(dateString);
}

function openCreateAppointmentModal(dateString) {
    const modal = document.getElementById('createAppointmentModal');
    modal.querySelector('#createAppointmentModalTitle').innerText = `Nowa wizyta na dzień ${dateString}`;
    modal.querySelector('#appointmentDateInput').value = dateString;
    modal.querySelector('#clientSelect').innerHTML = state.clients.map(client => `<option value="${client.id}">${client.name}</option>`).join('');
    modal.classList.remove('hidden');
}

function closeCreateAppointmentModal() {
    document.getElementById('createAppointmentModal').classList.add('hidden');
}

function openSpecialTermModal() {
    document.getElementById('specialTermModal').classList.remove('hidden');
}

function closeSpecialTermModal() {
    document.getElementById('specialTermModal').classList.add('hidden');
}

function openProposeTimeModal({ requestIndex, appointmentId }) {
    state.requestToEditIndex = null;
    state.appointmentToEditId = null;
    if (requestIndex !== undefined) {
        document.getElementById('requestIndexInput').value = requestIndex;
        state.requestToEditIndex = requestIndex;
    }
    if (appointmentId !== undefined) {
        state.appointmentToEditId = appointmentId;
    }
    document.getElementById('proposeTimeModal').classList.remove('hidden');
}

function closeProposeTimeModal() {
    document.getElementById('proposeTimeModal').classList.add('hidden');
}

function openDayDetailsModal() {
    document.getElementById('dayDetailsModal').classList.remove('hidden');
}

function closeDayDetailsModal() {
    document.getElementById('dayDetailsModal').classList.add('hidden');
}

// === EVENT LISTENERS ===

function setupLoginListeners() {
    document.getElementById('loginAdminBtn').addEventListener('click', () => login('admin'));
    document.getElementById('loginClientBtn').addEventListener('click', () => login('client'));
    document.getElementById('logoutAdminBtn').addEventListener('click', logout);
    document.getElementById('logoutClientBtn').addEventListener('click', logout);
}

function setupAdminDashboardListeners() {
    const adminDashboard = document.getElementById('adminDashboard');
    if (!adminDashboard) return;

    adminDashboard.addEventListener('click', (event) => {
        const target = event.target;

        if (target.id === 'addClientBtn') {
            openAddClientModal();
        }

        if (target.classList.contains('manage-btn')) {
            const clientId = parseInt(target.dataset.clientId, 10);
            openManageClientModal(clientId);
        }

        const requestIndex = parseInt(target.dataset.requestIndex, 10);
        if (!isNaN(requestIndex)) {
            const request = state.requests[requestIndex];
            if (!request) return;

            if (target.classList.contains('reject-request-btn')) {
                request.status = 'rejected';
                request.details = `Prośba (${request.details}) została odrzucona.`;
                render.renderRequests();
                alert(`Wniosek od "${request.from}" został odrzucony.`);
            }
            if (target.classList.contains('propose-new-time-btn')) {
                openProposeTimeModal({ requestIndex });
            }
            if (target.classList.contains('confirm-request-btn')) {
                const dateMatch = request.details.match(/\d{4}-\d{2}-\d{2}/g);
                const timeMatch = request.details.match(/\d{2}:\d{2}/g);
                if (!dateMatch || !timeMatch) {
                    alert('Nie udało się przetworzyć daty i godziny z wniosku.');
                    state.requests.splice(requestIndex, 1);
                    render.renderRequests();
                    return;
                }
                const date = dateMatch[dateMatch.length - 1];
                const time = timeMatch[timeMatch.length - 1];
                const client = state.clients.find(c => c.id === request.clientId);
                if (!client) {
                    alert(`Klient o ID "${request.clientId}" nie został znaleziony.`);
                    return;
                }
                const newAppointment = { id: state.appointments.length > 0 ? Math.max(...state.appointments.map(a => a.id)) + 1 : 1, date: date, time: time, clientId: client.id };
                state.appointments.push(newAppointment);
                request.status = 'confirmed';
                request.details = `Wizyta na <strong>${date} o ${time}</strong> została pomyślnie potwierdzona!`;
                render.renderRequests();
                render.renderAdminCalendar();
                render.renderClientsList();
                alert(`Wizyta dla "${request.from}" na ${date} o ${time} została pomyślnie potwierdzona!`);
            }
        }
    });

    document.getElementById('searchInput').addEventListener('input', (event) => {
        state.filters.searchQuery = event.target.value;
        render.renderClientsList();
    });
    document.getElementById('filterSelect').addEventListener('change', (event) => {
        state.filters.filterBy = event.target.value;
        render.renderClientsList();
    });
}

function setupClientDashboardListeners() {
    const clientDashboard = document.getElementById('clientDashboard');
    if (!clientDashboard) return;

    clientDashboard.addEventListener('click', (event) => {
        const target = event.target;

        if (target.id === 'requestSpecialTermBtn') {
            state.appointmentToChangeId = null;
            openSpecialTermModal();
        }

        if (target.classList.contains('time-slot') && !target.disabled) {
            if (!state.calendar.selectedDate) {
                alert('Proszę najpierw wybrać datę w kalendarzu.');
                return;
            }
            const selectedTime = target.innerText.split(' ')[0];
            const date = state.calendar.selectedDate;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const selectedDate = `${year}-${month}-${day}`;
            const client = state.clients.find(c => c.id === state.currentClientId);
            const newRequest = { from: client.name, clientId: client.id, type: 'Rezerwacja z kalendarza', details: `Prośba o wizytę: ${selectedDate} o ${selectedTime}`, status: 'pending_admin_approval' };
            state.requests.push(newRequest);
            render.renderClientDashboard();
            alert(`Twoja prośba o rezerwację na ${selectedDate} o ${selectedTime} została wysłana!`);
        }

        const isAcceptBtn = target.classList.contains('accept-proposal-btn');
        const isRejectBtn = target.classList.contains('reject-proposal-btn');
        if (isAcceptBtn || isRejectBtn) {
            const requestIndex = parseInt(target.dataset.requestIndex, 10);
            const request = state.requests[requestIndex];
            if (!request) return;
            if (isRejectBtn) {
                state.requests.splice(requestIndex, 1);
                alert('Propozycja została odrzucona.');
                render.renderClientDashboard();
            }
            if (isAcceptBtn) {
                const dateMatch = request.details.match(/\d{4}-\d{2}-\d{2}/g);
                const timeMatch = request.details.match(/\d{2}:\d{2}/g);
                if (dateMatch && timeMatch) {
                    const date = dateMatch[dateMatch.length - 1];
                    const time = timeMatch[timeMatch.length - 1];
                    const newAppointment = { id: state.appointments.length > 0 ? Math.max(...state.appointments.map(a => a.id)) + 1 : 1, date: date, time: time, clientId: state.currentClientId };
                    state.appointments.push(newAppointment);
                    state.requests.splice(requestIndex, 1);
                    alert('Propozycja została zaakceptowana! Twój termin został zarezerwowany.');
                    render.renderClientDashboard();
                    render.renderAdminCalendar();
                } else {
                    alert('Błąd: Nie udało się przetworzyć terminu z propozycji.');
                }
            }
        }

        if (target.classList.contains('change-appointment-btn')) {
            const appointmentId = parseInt(target.dataset.appointmentId, 10);
            const appointment = state.appointments.find(a => a.id === appointmentId);
            if (!appointment) return;
            const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
            const now = new Date();
            const hoursDifference = (appointmentDateTime - now) / (1000 * 60 * 60);
            let confirmationMessage = 'Czy na pewno chcesz poprosić o zmianę terminu? Twoja obecna rezerwacja zostanie anulowana.';
            if (hoursDifference < 24) {
                confirmationMessage = 'UWAGA: Do wizyty pozostało mniej niż 24 godziny. Z Twojego karnetu zostanie odjęte 1 wejście. Czy na pewno chcesz kontynuować?';
            }
            if (!confirm(confirmationMessage)) return;
            const client = state.clients.find(c => c.id === state.currentClientId);
            if (hoursDifference < 24) {
                client.subscription.entriesLeft -= 1;
            }
            state.appointmentToChangeId = appointment.id;
            openSpecialTermModal();
        }
    });
}

function setupModalListeners() {
    document.getElementById('closeManageClientModalBtn').addEventListener('click', closeManageClientModal);
    document.getElementById('manageClientModalBody').addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('tab-button')) {
            event.preventDefault();
            state.activeModalTab = target.dataset.tab;
            const modalBody = document.getElementById('manageClientModalBody');
            modalBody.querySelectorAll('.tab-button').forEach(tab => tab.classList.remove('active'));
            modalBody.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            target.classList.add('active');
            document.getElementById(state.activeModalTab).classList.add('active');
        }
        const form = document.getElementById('manageClientModalBody').querySelector('form');
        if (!form || !form.dataset.clientId) return;
        const clientId = parseInt(form.dataset.clientId, 10);
        const client = state.clients.find(c => c.id === clientId);
        if (!client) return;
        if (target.id === 'cancelManageClientBtn') {
            state.activeModalTab = 'tab-main';
            closeManageClientModal();
        }
        if (target.id === 'deleteClientBtn') openDeleteConfirmationModal(clientId);
        if (target.id === 'addHistoryBtn') {
            const dateInput = document.getElementById('newHistoryDate');
            const durationInput = document.getElementById('newHistoryDuration');
            const statusInput = document.getElementById('newHistoryStatus');
            const tempInput = document.getElementById('newHistoryTemp');
            if (!dateInput.value) {
                alert('Proszę wybrać datę wizyty.');
                return;
            }
            let tempValue = tempInput.value ? `${tempInput.value}°C` : null;
            let durationValue = durationInput.value ? `${durationInput.value} sec` : null;
            if (statusInput.value !== 'Odwiedzono') {
                tempValue = null;
                durationValue = null;
            }
            client.history.push({ date: dateInput.value, duration: durationValue, status: statusInput.value, temperature: tempValue });
            if (statusInput.value === 'Odwiedzono') {
                client.subscription.entriesLeft -= 1;
            }
            state.activeModalTab = 'tab-history';
            render.renderClientForm({ mode: 'edit', client: client });
        }
        if (target.classList.contains('delete-history-btn')) {
            const sortedHistory = [...client.history].sort((a, b) => new Date(b.date) - new Date(a.date));
            const historyIndexToDelete = parseInt(event.target.dataset.historyIndex, 10);
            const itemToDelete = sortedHistory[historyIndexToDelete];
            const originalIndex = client.history.findIndex(item => item.date === itemToDelete.date && item.duration === itemToDelete.duration && item.status === itemToDelete.status);
            if (originalIndex > -1) {
                client.history.splice(originalIndex, 1);
            }
            state.activeModalTab = 'tab-history';
            render.renderClientForm({ mode: 'edit', client: client });
        }
    });
    document.getElementById('manageClientModalBody').addEventListener('submit', (event) => {
        if (event.target.id === 'manage-client-form') {
            event.preventDefault();
            const clientId = parseInt(event.target.dataset.clientId, 10);
            updateClient(clientId, {
                name: event.target.querySelector('#clientName').value,
                entriesLeft: event.target.querySelector('#entriesLeft').value,
                expires: event.target.querySelector('#expires').value
            });
            const notes = event.target.querySelector('#clientNotes');
            if (notes) {
                const client = state.clients.find(c => c.id === clientId);
                client.notes = notes.value;
            }
            render.renderClientsList();
            closeManageClientModal();
        }
    });
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteConfirmationModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        if (state.clientToDeleteId) {
            deleteClient(state.clientToDeleteId);
            closeDeleteConfirmationModal();
            closeManageClientModal();
            render.renderClientsList();
        }
    });
    document.getElementById('cancelSpecialTermBtn').addEventListener('click', closeSpecialTermModal);
    document.getElementById('specialTermForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const requestedDate = document.getElementById('specialDate').value;
        const requestedTime = document.getElementById('specialTime').value;
        if (!requestedDate || !requestedTime) {
            alert('Proszę wybrać datę i godzinę.');
            return;
        }
        const client = state.clients.find(c => c.id === state.currentClientId);
        let detailsText = '';
        let requestType = 'Termin Specjalny';
        if (state.appointmentToChangeId !== null) {
            const appointmentIndex = state.appointments.findIndex(a => a.id === state.appointmentToChangeId);
            if (appointmentIndex === -1) return;
            const originalAppointment = state.appointments[appointmentIndex];
            requestType = 'Prośba o zmianę terminu';
            detailsText = `Klient prosi o zmianę terminu z <strong>${originalAppointment.date} o ${originalAppointment.time}</strong> na <strong>${requestedDate} o ${requestedTime}</strong>.`;
            state.appointments.splice(appointmentIndex, 1);
            state.appointmentToChangeId = null;
        } else {
            detailsText = `Prośba o wizytę: ${requestedDate} o ${requestedTime}`;
        }
        const newRequest = { from: client.name, clientId: client.id, type: requestType, details: detailsText, status: 'pending_admin_approval' };
        state.requests.push(newRequest);
        alert('Twoja prośba została wysłana!');
        render.renderClientDashboard();
        closeSpecialTermModal();
        document.getElementById('specialTermForm').reset();
    });
    document.getElementById('cancelProposeTimeBtn').addEventListener('click', closeProposeTimeModal);
    document.getElementById('proposeTimeForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const newDate = document.getElementById('proposeDate').value;
        const newTime = document.getElementById('proposeTime').value;
        if (!newDate || !newTime) {
            alert('Proszę wybrać nową datę i godzinę.');
            return;
        }
        if (state.appointmentToEditId !== null) {
            const appointmentIndex = state.appointments.findIndex(a => a.id === state.appointmentToEditId);
            if (appointmentIndex === -1) return;
            const originalAppointment = state.appointments[appointmentIndex];
            const client = state.clients.find(c => c.id === originalAppointment.clientId);
            const newRequest = { from: 'Administrator', clientId: client.id, type: 'Propozycja zmiany', details: `Zaproponowano zmianę terminu z ${originalAppointment.date} ${originalAppointment.time} na <strong>${newDate} o ${newTime}</strong>.`, status: 'pending_client_approval' };
            state.requests.push(newRequest);
            state.appointments.splice(appointmentIndex, 1);
        } else if (state.requestToEditIndex !== null) {
            const originalRequest = state.requests[state.requestToEditIndex];
            if (!originalRequest) return;
            originalRequest.details = `Administrator zaproponował nowy termin: <strong>${newDate} o ${newTime}</strong>.`;
            originalRequest.status = 'pending_client_approval';
        }
        state.appointmentToEditId = null;
        state.requestToEditIndex = null;
        render.renderRequests();
        render.renderAdminCalendar();
        closeProposeTimeModal();
        document.getElementById('proposeTimeForm').reset();
        alert('Propozycja zmiany terminu została wysłana do klienta!');
    });
    document.getElementById('closeDayDetailsModalBtn').addEventListener('click', closeDayDetailsModal);
    document.getElementById('dayDetailsModalBody').addEventListener('click', (event) => {
        const target = event.target;

        if (target.dataset.action === 'open-create-appointment-from-details') {
            openCreateAppointmentFromDetails(target.dataset.date);
            return;
        }

        const appointmentId = parseInt(target.dataset.appointmentId, 10);
        if (!appointmentId) return;

        if (target.classList.contains('manage-appointment-btn')) {
            openProposeTimeModal({ appointmentId });
        }
        if (target.classList.contains('delete-appointment-btn')) {
            if (confirm('Czy na pewno chcesz usunąć tę wizytę? Klient nie zostanie obciążony karą.')) {
                const appointmentIndex = state.appointments.findIndex(a => a.id === appointmentId);
                if (appointmentIndex > -1) {
                    const deletedAppointment = state.appointments[appointmentIndex];
                    state.appointments.splice(appointmentIndex, 1);
                    closeDayDetailsModal();
                    render.renderAdminCalendar();
                    showDayDetails(deletedAppointment.date);
                    alert('Wizyta została usunięta.');
                }
            }
        }
    });
    document.getElementById('cancelCreateAppointmentBtn').addEventListener('click', closeCreateAppointmentModal);
    document.getElementById('createAppointmentForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const form = event.target;
        const date = form.querySelector('#appointmentDateInput').value;
        const time = form.querySelector('#appointmentTime').value;
        const clientId = parseInt(form.querySelector('#clientSelect').value, 10);
        const client = state.clients.find(c => c.id === clientId);
        if (!client) return;
        if (client.subscription.entriesLeft <= 0) {
            alert('Ten klient nie ma już dostępnych wejść w karnecie!');
            return;
        }
        const newAppointment = { id: state.appointments.length > 0 ? Math.max(...state.appointments.map(a => a.id)) + 1 : 1, date: date, time: time, clientId: clientId };
        state.appointments.push(newAppointment);
        closeCreateAppointmentModal();
        render.renderAdminCalendar();
        render.renderClientsList();
        showDayDetails(date);
    });
}

function setupCalendarListeners() {
    const calendarContainer = document.querySelector('body'); // Listen on the whole body
    calendarContainer.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        switch (action) {
            case 'change-month':
                const direction = parseInt(target.dataset.direction, 10);
                const isAdmin = target.dataset.isAdmin === 'true';
                changeMonth(direction, isAdmin);
                break;
            case 'select-date':
                const { year, month, day } = target.dataset;
                selectDate(parseInt(year, 10), parseInt(month, 10), parseInt(day, 10));
                break;
            case 'show-day-details':
                showDayDetails(target.dataset.date);
                break;
            case 'open-create-appointment-from-details':
                openCreateAppointmentFromDetails(target.dataset.date);
                break;
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
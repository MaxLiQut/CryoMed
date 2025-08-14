import { STATUS } from './constants.js';

// Global state (simple in-memory store)
export let state = {
    // UI State
    view: 'login', // 'login', 'admin', 'client'
    clientDashboardTab: 'history',
    activeModalTab: 'tab-main',
    currentClientId: 1, // Simulates logged-in client

    // Data
    clients: [
        {
            id: 1,
            name: 'Jan Kowalski',
            contact: 'jan.kowalski@example.com',
            subscription: { type: '12 wejść', entriesLeft: 8, expires: '2025-08-25' },
            history: [
                { date: '2025-08-13', duration: '180 sec', status: 'Odwiedzono', temperature: '-135°C' },
                { date: '2025-07-30', duration: '180 sec', status: 'Odwiedzono', temperature: '-135°C' },
                { date: '2025-07-28', duration: '150 sec', status: 'Odwiedzono', temperature: '-130°C' },
                { date: '2025-07-25', status: 'Opuszczono', temperature: null, duration: null },
            ],
            notes: 'Ma lekką kontuzję kolana, unikać dużych obciążeń.',
        },
        { id: 2, name: 'Maria Nowak', contact: 'maria.nowak@example.com', subscription: { type: '8 wejść', entriesLeft: 2, expires: '2025-08-15' }, history: [], notes: '' },
        { id: 3, name: 'Piotr Zieliński', contact: 'piotr.zielinski@example.com', subscription: { type: '24 wejścia', entriesLeft: 23, expires: '2025-09-10' }, history: [], notes: '' },
        { id: 4, name: 'Anna Wiśniewska', contact: 'anna.wisniewska@example.com', subscription: { type: '12 wejść', entriesLeft: 1, expires: '2025-08-05' }, history: [], notes: '' },
    ],

    appointments: [{ id: 1, date: '2025-08-22', time: '19:00', clientId: 1 }],

    requests: [
        { from: 'Maria Nowak', clientId: 2, type: 'Termin Specjalny', details: 'Prośba o wizytę: WT 11:00', status: STATUS.PENDING_ADMIN },
        { from: 'Jan Kowalski', clientId: 1, type: 'Akceptacja', details: 'Zaakceptował Twoją propozycję na PT 19:00', status: STATUS.CONFIRMED }
    ],

    // Admin view specific state
    stats: { total: 50, active: 35, expired: 15 },
    filters: { searchQuery: '', filterBy: 'all' },

    // Temporary state for modals/forms
    clientToManageId: null,
    clientToDeleteId: null,
    appointmentToChangeId: null,
    appointmentToEditId: null,
    requestToEditIndex: null,

    // Schedule and calendar state
    schedule: { 1: ['19:00'], 4: ['19:00'], 5: ['19:00'], 0: ['09:00'] }, // 0=Sun..6=Sat
    calendar: { currentDate: new Date(), selectedDate: null }
};
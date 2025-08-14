// Using constants for status strings prevents typos and makes code easier to maintain.
export const STATUS = {
    PENDING_ADMIN: 'pending_admin_approval',
    PENDING_CLIENT: 'pending_client_approval',
    CONFIRMED: 'confirmed',
    REJECTED: 'rejected',
};

// IDs of all modals for centralized management
export const MODAL_IDS = [
    'manageClientModal',
    'deleteConfirmModal',
    'createAppointmentModal',
    'specialTermModal',
    'proposeTimeModal',
    'dayDetailsModal'
];
import { MODAL_IDS } from './constants.js';

// --- Toast Notifications ---
let toastTimer;
export function toast(message, duration = 3000) {
    const el = document.getElementById('toast');
    if (!el) {
        console.log('Toast:', message); // Fallback
        return;
    }
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

// --- Focus Trap for Modals ---
const focusTrapState = {
    returnFocus: null,
    onKey: null,
    activeModal: null,
};

function trapFocus(modalEl) {
    const focusables = modalEl.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    focusTrapState.activeModal = modalEl;
    focusTrapState.onKey = (e) => {
        if (e.key === 'Escape') return closeAllModals();
        if (e.key !== 'Tab') return;

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };

    modalEl.addEventListener('keydown', focusTrapState.onKey);
    focusTrapState.returnFocus = document.activeElement;
    first.focus();
}

function untrapFocus(modalEl) {
    if (focusTrapState.onKey) {
        modalEl.removeEventListener('keydown', focusTrapState.onKey);
    }
    if (focusTrapState.returnFocus?.focus) {
        focusTrapState.returnFocus.focus();
    }
    focusTrapState.returnFocus = null;
    focusTrapState.onKey = null;
    focusTrapState.activeModal = null;
}

// --- Modal Management ---
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    closeAllModals(); // Ensure only one is open
    modal.classList.remove('hidden');
    trapFocus(modal);
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('hidden');
    untrapFocus(modal);
}

export function closeAllModals() {
    for (const id of MODAL_IDS) {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) {
            closeModal(id);
        }
    }
}

// --- Miscellaneous UI Initialization ---
export function initializeUI() {
    // Override default alert with our custom toast
    window.alert = toast;

    // Global Escape key handler for modals
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}
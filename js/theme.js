/**
 * Applies the given theme to the document and saves it to localStorage.
 * @param {'light' | 'dark'} theme The theme to apply.
 */
function applyTheme(theme) {
    const root = document.documentElement;
    const isDark = theme === 'dark';

    if (isDark) {
        root.setAttribute('data-theme', 'dark');
    } else {
        root.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);

    // Sync all theme toggle buttons
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.classList.toggle('active', isDark);
        btn.setAttribute('aria-pressed', String(isDark));
    });
}

/**
 * Toggles the current theme between 'light' and 'dark'.
 */
export function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

/**
 * Initializes the theme based on localStorage or user's OS preference.
 */
export function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
}
// General purpose, side-effect-free utility functions.

/**
 * Pads a number with a leading zero if it's less than 10.
 * @param {number} n The number to pad.
 * @returns {string}
 */
export const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Gets the number of days in a specific month and year.
 * @param {number} year The full year.
 * @param {number} month The month index (0-11).
 * @returns {number}
 */
export const numDays = (year, month) => new Date(year, month + 1, 0).getDate();

/**
 * Formats a Date object into 'YYYY-MM-DD' string.
 * @param {Date} d The date to format.
 * @returns {string}
 */
export const formatISO = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * Generates the next available ID for an array of objects with 'id' properties.
 * @param {Array<{id: number}>} arr The array to check.
 * @returns {number}
 */
export const nextId = (arr) =>
    arr?.length ? Math.max(...arr.map((a) => a?.id || 0)) + 1 : 1;

/**
 * Creates a debounced function that delays invoking `fn` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was invoked.
 * @param {Function} fn The function to debounce.
 * @param {number} wait The number of milliseconds to delay.
 * @returns {Function} Returns the new debounced function.
 */
export function debounce(fn, wait = 150) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), wait);
    };
}
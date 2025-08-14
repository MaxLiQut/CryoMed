// Загальні утиліти без побічних ефектів
export const pad2 = (n) => String(n).padStart(2, "0");
export const numDays = (y, m) => new Date(y, m + 1, 0).getDate(); // m: 0–11
export const formatISO = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const nextId = (arr) =>
    arr?.length ? Math.max(...arr.map((a) => a?.id || 0)) + 1 : 1;

export function debounce(fn, wait = 150) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

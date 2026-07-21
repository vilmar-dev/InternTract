// ============================================================
// utils.js
// Shared helper functions used across all pages
// ============================================================

/** Show a toast notification. type: "success" | "error" | "info" */
export function showToast(message, type = "info", duration = 3500) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${iconFor(type)}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-show"));
  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function iconFor(type) {
  switch (type) {
    case "success": return "✓";
    case "error": return "✕";
    default: return "ℹ";
  }
}

/** Basic HTML escaping to avoid injection when rendering user data */
export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Show / hide a full-page loading spinner overlay */
export function showSpinner() {
  let el = document.getElementById("global-spinner");
  if (!el) {
    el = document.createElement("div");
    el.id = "global-spinner";
    el.className = "spinner-overlay";
    el.innerHTML = `<div class="spinner"></div>`;
    document.body.appendChild(el);
  }
  el.classList.add("spinner-visible");
}
export function hideSpinner() {
  const el = document.getElementById("global-spinner");
  if (el) el.classList.remove("spinner-visible");
}

/** Format a JS Date as YYYY-MM-DD (used as the attendance "date" key) */
export function formatDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format a JS Date as a readable long date, e.g. "Tuesday, July 21, 2026" */
export function formatLongDate(date = new Date()) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

/** Format a JS Date as HH:MM:SS AM/PM */
export function formatTime(date = new Date()) {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

/** Format a JS Date as a short readable time, e.g. "9:03 AM" */
export function formatShortTime(date) {
  if (!date) return "--";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** Convert a decimal-hours number into "Xh Ym" */
export function formatHoursMinutes(decimalHours) {
  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

/** Difference in decimal hours between two JS Dates */
export function diffInHours(start, end) {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/** Clamp a number between min and max */
export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/** Convert a Firestore Timestamp (or Date, or null) to a JS Date */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  return new Date(value);
}

/** Validate an email is a company domain (rejects common free providers) 
export function isCompanyEmail(email) {
  const freeProviders = [
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
    "icloud.com", "aol.com", "live.com", "protonmail.com", "mail.com"
  ];
  const parts = String(email).toLowerCase().split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1].trim();
  if (!domain.includes(".")) return false;
  return !freeProviders.includes(domain);
} */



/**
 * Validate that the email belongs to your company domain.
 */
export function isCompanyEmail(email) {
  const companyDomain = "macrologic.com"; // Change this to your own domain

  const parts = String(email).toLowerCase().trim().split("@");

  if (parts.length !== 2) return false;

  return parts[1] === companyDomain;
}

/** Simple debounce helper, used for search inputs */
export function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** Trigger a browser download of a text blob (used for CSV export) */
export function downloadTextFile(filename, content, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Convert an array of row objects into a CSV string */
export function arrayToCsv(rows, columns) {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  return [header, ...lines].join("\n");
}

/** Apply the persisted dark-mode preference on page load */
export function applyStoredTheme() {
  const theme = localStorage.getItem("interntrack-theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);
  return theme;
}

/** Toggle + persist dark mode, returns the new theme */
export function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("interntrack-theme", next);
  return next;
}

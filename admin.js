// ============================================================
// admin.js — admin.html
// ============================================================

import {
  db,
  doc, getDoc, updateDoc, deleteDoc, setDoc,
  collection, query, where, orderBy, onSnapshot, getDocs
} from "./firebase.js";
import { requireAuth, attachLogoutHandler } from "./auth.js";
import {
  showToast, showSpinner, hideSpinner, escapeHtml,
  formatDateKey, formatShortTime, formatHoursMinutes, toDate,
  applyStoredTheme, toggleTheme, debounce, downloadTextFile, arrayToCsv
} from "./utils.js";

applyStoredTheme();

let allInterns = [];
let allAttendanceToday = [];
let allAttendanceHistory = [];
let allPending = [];
let departments = new Set();

const el = {
  logoutBtn: document.getElementById("logoutBtn"),
  themeToggle: document.getElementById("themeToggle"),
  sidebarToggle: document.getElementById("sidebarToggle"),
  sidebar: document.getElementById("sidebar"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  navLinks: document.querySelectorAll(".nav-link[data-section]"),
  sections: document.querySelectorAll(".dashboard-section"),

  totalInterns: document.getElementById("statTotalInterns"),
  presentToday: document.getElementById("statPresentToday"),
  pendingCount: document.getElementById("statPendingAccounts"),
  completedCount: document.getElementById("statCompletedInternship"),
  todayTableBody: document.getElementById("todayAttendanceBody"),

  internSearch: document.getElementById("internSearch"),
  internTableBody: document.getElementById("internTableBody"),

  attendanceDateFilter: document.getElementById("attendanceDateFilter"),
  attendanceDeptFilter: document.getElementById("attendanceDeptFilter"),
  attendanceSearch: document.getElementById("attendanceSearch"),
  attendanceTableBody: document.getElementById("attendanceHistoryBody"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),

  pendingTableBody: document.getElementById("pendingTableBody"),

  deptListBody: document.getElementById("departmentListBody"),
  addDeptForm: document.getElementById("addDeptForm"),
  newDeptName: document.getElementById("newDeptName"),

  reportDeptSelect: document.getElementById("reportDeptFilter"),
  reportTableBody: document.getElementById("reportTableBody"),

  profileName: document.getElementById("adminProfileName"),
  profileEmail: document.getElementById("adminProfileEmail"),
  profileDept: document.getElementById("adminProfileDepartment")
};

init();

async function init() {
  const { userData } = await requireAuth("admin");

  el.profileName.textContent = userData.name || "—";
  el.profileEmail.textContent = userData.email || "—";
  el.profileDept.textContent = userData.department || "—";

  attachLogoutHandler(el.logoutBtn);
  el.themeToggle?.addEventListener("click", () => toggleTheme());
  el.sidebarToggle?.addEventListener("click", toggleSidebar);
  el.sidebarBackdrop?.addEventListener("click", closeSidebar);
  window.addEventListener("resize", () => {
    if (window.innerWidth > 960) closeSidebar();
  });

  setupNavigation();
  listenToInterns();
  listenToPendingAccounts();
  listenToTodayAttendance();
  listenToAttendanceHistory();
  listenToDepartments();

  el.internSearch?.addEventListener("input", debounce(renderInternTable, 200));
  el.attendanceSearch?.addEventListener("input", debounce(renderAttendanceHistory, 200));
  el.attendanceDateFilter?.addEventListener("change", renderAttendanceHistory);
  el.attendanceDeptFilter?.addEventListener("change", renderAttendanceHistory);
  el.exportCsvBtn?.addEventListener("click", exportAttendanceCsv);
  el.addDeptForm?.addEventListener("submit", handleAddDepartment);
  el.reportDeptSelect?.addEventListener("change", renderReport);
}

// ------------------------------------------------------------
// Navigation (sidebar sections)
// ------------------------------------------------------------
function toggleSidebar() {
  const isOpen = el.sidebar.classList.toggle("sidebar-open");
  el.sidebarBackdrop?.classList.toggle("show", isOpen);
  document.body.classList.toggle("sidebar-open", isOpen);
}

function closeSidebar() {
  el.sidebar.classList.remove("sidebar-open");
  el.sidebarBackdrop?.classList.remove("show");
  document.body.classList.remove("sidebar-open");
}

function setupNavigation() {
  el.navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.dataset.section;
      el.sections.forEach((s) => s.classList.toggle("section-active", s.id === target));
      el.navLinks.forEach((l) => l.classList.toggle("nav-active", l === link));
      closeSidebar();
    });
  });
}

// ------------------------------------------------------------
// Interns (realtime)
// ------------------------------------------------------------
function listenToInterns() {
  const q = query(collection(db, "users"), where("role", "==", "intern"));
  onSnapshot(q, (snap) => {
    allInterns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    departments = new Set(allInterns.map((i) => i.department).filter(Boolean));
    renderStats();
    renderInternTable();
    renderReport();
    populateDeptFilters();
  });
}

function renderStats() {
  const approvedInterns = allInterns.filter((i) => i.status === "approved");
  el.totalInterns.textContent = approvedInterns.length;
  el.completedCount.textContent = approvedInterns.filter(
    (i) => (i.remainingHours ?? i.requiredHours) <= 0
  ).length;
  el.pendingCount.textContent = allPending.length;
  el.presentToday.textContent = allAttendanceToday.filter((a) => a.status === "active").length;
}

function renderInternTable() {
  const search = (el.internSearch?.value || "").toLowerCase().trim();
  const rows = allInterns
    .filter((i) => i.status !== "pending")
    .filter((i) => !search || i.name?.toLowerCase().includes(search) || i.department?.toLowerCase().includes(search));

  if (rows.length === 0) {
    el.internTableBody.innerHTML = `<tr><td colspan="7" class="empty-row">No interns found.</td></tr>`;
    return;
  }

  el.internTableBody.innerHTML = rows
    .map((i) => `
      <tr>
        <td>${escapeHtml(i.name)}</td>
        <td>${escapeHtml(i.department)}</td>
        <td>${escapeHtml(i.school)}</td>
        <td>${escapeHtml(i.startDate)}</td>
        <td>${formatHoursMinutes(i.requiredHours || 0)}</td>
        <td>${formatHoursMinutes(i.renderedHours || 0)}</td>
        <td class="table-actions">
          <button class="btn-icon" data-action="view" data-id="${i.id}" title="View profile">👁</button>
          <button class="btn-icon" data-action="deactivate" data-id="${i.id}" title="${i.status === "deactivated" ? "Activate" : "Deactivate"}">
            ${i.status === "deactivated" ? "▶" : "⏸"}
          </button>
          <button class="btn-icon btn-danger" data-action="delete" data-id="${i.id}" title="Delete">🗑</button>
        </td>
      </tr>`)
    .join("");

  el.internTableBody.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => handleInternAction(btn.dataset.action, btn.dataset.id));
  });
}

async function handleInternAction(action, id) {
  const intern = allInterns.find((i) => i.id === id);
  if (!intern) return;

  if (action === "view") {
    alert(
      `Name: ${intern.name}\nDepartment: ${intern.department}\nSchool: ${intern.school}\n` +
      `Start Date: ${intern.startDate}\nRequired Hours: ${formatHoursMinutes(intern.requiredHours || 0)}\n` +
      `Rendered Hours: ${formatHoursMinutes(intern.renderedHours || 0)}\nRemaining Hours: ${formatHoursMinutes(intern.remainingHours || 0)}\n` +
      `Phone: ${intern.phone || "—"}\nStudent ID: ${intern.studentId || "—"}`
    );
    return;
  }

  if (action === "deactivate") {
    const newStatus = intern.status === "deactivated" ? "approved" : "deactivated";
    await updateDoc(doc(db, "users", id), { status: newStatus });
    showToast(`Intern ${newStatus === "deactivated" ? "deactivated" : "reactivated"}.`, "success");
    return;
  }

  if (action === "delete") {
    if (!window.confirm(`Delete ${intern.name}'s account permanently? This cannot be undone.`)) return;
    await deleteDoc(doc(db, "users", id));
    showToast("Intern account deleted.", "success");
  }
}

// ------------------------------------------------------------
// Pending accounts (interns + admins)
// ------------------------------------------------------------
function listenToPendingAccounts() {
  const q = query(collection(db, "users"), where("status", "==", "pending"));
  onSnapshot(q, (snap) => {
    allPending = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderPendingTable();
    renderStats();
  });
}

function renderPendingTable() {
  if (allPending.length === 0) {
    el.pendingTableBody.innerHTML = `<tr><td colspan="5" class="empty-row">No pending accounts.</td></tr>`;
    return;
  }
  el.pendingTableBody.innerHTML = allPending
    .map((p) => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.email)}</td>
        <td><span class="status-badge status-pending">${p.role}</span></td>
        <td>${escapeHtml(p.department || "—")}</td>
        <td class="table-actions">
          <button class="btn-small btn-approve" data-action="approve" data-id="${p.id}">Approve</button>
          <button class="btn-small btn-reject" data-action="reject" data-id="${p.id}">Reject</button>
          <button class="btn-small btn-danger" data-action="delete" data-id="${p.id}">Delete</button>
        </td>
      </tr>`)
    .join("");

  el.pendingTableBody.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => handlePendingAction(btn.dataset.action, btn.dataset.id));
  });
}

async function handlePendingAction(action, id) {
  if (action === "approve") {
    await updateDoc(doc(db, "users", id), { status: "approved" });
    showToast("Account approved.", "success");
  } else if (action === "reject") {
    await updateDoc(doc(db, "users", id), { status: "rejected" });
    showToast("Account rejected.", "success");
  } else if (action === "delete") {
    if (!window.confirm("Delete this account permanently?")) return;
    await deleteDoc(doc(db, "users", id));
    showToast("Account deleted.", "success");
  }
}

// ------------------------------------------------------------
// Attendance — today (dashboard live table)
// ------------------------------------------------------------
function listenToTodayAttendance() {
  const dateKey = formatDateKey();
  const q = query(collection(db, "attendance"), where("date", "==", dateKey));
  onSnapshot(q, (snap) => {
    allAttendanceToday = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderTodayTable();
    renderStats();
  });
}

function renderTodayTable() {
  if (allAttendanceToday.length === 0) {
    el.todayTableBody.innerHTML = `<tr><td colspan="6" class="empty-row">No attendance records yet today.</td></tr>`;
    return;
  }
  el.todayTableBody.innerHTML = allAttendanceToday
    .map((a) => {
      const intern = allInterns.find((i) => i.id === a.userId);
      const statusClass = a.status === "completed" ? "status-complete" : "status-active";
      return `
        <tr>
          <td>${escapeHtml(a.userName)}</td>
          <td>${escapeHtml(a.department)}</td>
          <td>${formatShortTime(toDate(a.timeIn))}</td>
          <td>${a.timeOut ? formatShortTime(toDate(a.timeOut)) : "—"}</td>
          <td><span class="status-badge ${statusClass}">${a.status === "completed" ? "Completed" : "Active"}</span></td>
          <td>${a.hoursRendered ? formatHoursMinutes(a.hoursRendered) : "—"}${intern ? ` <span class="muted">(${formatHoursMinutes(intern.remainingHours || 0)} left)</span>` : ""}</td>
        </tr>`;
    })
    .join("");
}

// ------------------------------------------------------------
// Attendance — full history (filterable, exportable)
// ------------------------------------------------------------
function listenToAttendanceHistory() {
  const q = query(collection(db, "attendance"), orderBy("date", "desc"));
  onSnapshot(q, (snap) => {
    allAttendanceHistory = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAttendanceHistory();
  });
}

function getFilteredHistory() {
  const dateFilter = el.attendanceDateFilter?.value || "";
  const deptFilter = el.attendanceDeptFilter?.value || "";
  const search = (el.attendanceSearch?.value || "").toLowerCase().trim();

  return allAttendanceHistory.filter((a) => {
    if (dateFilter && a.date !== dateFilter) return false;
    if (deptFilter && a.department !== deptFilter) return false;
    if (search && !a.userName?.toLowerCase().includes(search)) return false;
    return true;
  });
}

function renderAttendanceHistory() {
  const rows = getFilteredHistory();
  if (rows.length === 0) {
    el.attendanceTableBody.innerHTML = `<tr><td colspan="6" class="empty-row">No attendance records match your filters.</td></tr>`;
    return;
  }
  el.attendanceTableBody.innerHTML = rows
    .map((a) => `
      <tr>
        <td>${escapeHtml(a.date)}</td>
        <td>${escapeHtml(a.userName)}</td>
        <td>${escapeHtml(a.department)}</td>
        <td>${formatShortTime(toDate(a.timeIn))}</td>
        <td>${a.timeOut ? formatShortTime(toDate(a.timeOut)) : "—"}</td>
        <td>${a.hoursRendered ? formatHoursMinutes(a.hoursRendered) : "—"}</td>
      </tr>`)
    .join("");
}

function exportAttendanceCsv() {
  const rows = getFilteredHistory().map((a) => ({
    date: a.date,
    name: a.userName,
    department: a.department,
    timeIn: a.timeIn ? formatShortTime(toDate(a.timeIn)) : "",
    timeOut: a.timeOut ? formatShortTime(toDate(a.timeOut)) : "",
    hours: a.hoursRendered ? a.hoursRendered.toFixed(2) : "0"
  }));
  if (rows.length === 0) {
    showToast("No records to export for the current filters.", "info");
    return;
  }
  const csv = arrayToCsv(rows, [
    { key: "date", label: "Date" },
    { key: "name", label: "Name" },
    { key: "department", label: "Department" },
    { key: "timeIn", label: "Time In" },
    { key: "timeOut", label: "Time Out" },
    { key: "hours", label: "Hours Rendered" }
  ]);
  downloadTextFile(`interntrack-attendance-${formatDateKey()}.csv`, csv);
  showToast("CSV export downloaded.", "success");
}

// ------------------------------------------------------------
// Departments
// ------------------------------------------------------------
function listenToDepartments() {
  const q = query(collection(db, "departments"), orderBy("name"));
  onSnapshot(q, (snap) => {
    const docDepartments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderDepartmentList(docDepartments);
    docDepartments.forEach((d) => departments.add(d.name));
    populateDeptFilters();
  });
}

function renderDepartmentList(docDepartments) {
  if (docDepartments.length === 0) {
    el.deptListBody.innerHTML = `<tr><td colspan="3" class="empty-row">No departments added yet.</td></tr>`;
    return;
  }
  el.deptListBody.innerHTML = docDepartments
    .map((d) => {
      const count = allInterns.filter((i) => i.department === d.name).length;
      return `
        <tr>
          <td>${escapeHtml(d.name)}</td>
          <td>${count}</td>
          <td><button class="btn-icon btn-danger" data-action="delete-dept" data-id="${d.id}" title="Delete">🗑</button></td>
        </tr>`;
    })
    .join("");

  el.deptListBody.querySelectorAll("button[data-action='delete-dept']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!window.confirm("Delete this department?")) return;
      await deleteDoc(doc(db, "departments", btn.dataset.id));
      showToast("Department deleted.", "success");
    });
  });
}

async function handleAddDepartment(e) {
  e.preventDefault();
  const name = el.newDeptName.value.trim();
  if (!name) return;
  await setDoc(doc(collection(db, "departments")), { name, createdAt: new Date().toISOString() });
  el.newDeptName.value = "";
  showToast(`Department "${name}" added.`, "success");
}

function populateDeptFilters() {
  const options = ['<option value="">All Departments</option>']
    .concat([...departments].sort().map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`));
  [el.attendanceDeptFilter, el.reportDeptSelect].forEach((select) => {
    if (!select) return;
    const current = select.value;
    select.innerHTML = options.join("");
    if ([...departments].includes(current)) select.value = current;
  });
}

// ------------------------------------------------------------
// Reports
// ------------------------------------------------------------
function renderReport() {
  if (!el.reportTableBody) return;
  const deptFilter = el.reportDeptSelect?.value || "";
  const rows = allInterns
    .filter((i) => i.status === "approved" || i.status === "deactivated")
    .filter((i) => !deptFilter || i.department === deptFilter);

  if (rows.length === 0) {
    el.reportTableBody.innerHTML = `<tr><td colspan="5" class="empty-row">No interns to report on.</td></tr>`;
    return;
  }

  el.reportTableBody.innerHTML = rows
    .map((i) => {
      const required = i.requiredHours || 0;
      const rendered = i.renderedHours || 0;
      const pct = required > 0 ? Math.min((rendered / required) * 100, 100) : 0;
      return `
        <tr>
          <td>${escapeHtml(i.name)}</td>
          <td>${escapeHtml(i.department)}</td>
          <td>${formatHoursMinutes(required)}</td>
          <td>${formatHoursMinutes(rendered)}</td>
          <td>
            <div class="mini-progress"><div class="mini-progress-fill" style="width:${pct}%"></div></div>
            <span class="muted">${pct.toFixed(0)}%</span>
          </td>
        </tr>`;
    })
    .join("");
}

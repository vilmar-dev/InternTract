// ============================================================
// intern.js — intern.html
// ============================================================

import {
  db,
  doc, getDoc, updateDoc,
  collection, query, where, orderBy, onSnapshot,
  addDoc, getDocs, serverTimestamp, Timestamp
} from "./firebase.js";
import { requireAuth, attachLogoutHandler } from "./auth.js";
import {
  showToast, showSpinner, hideSpinner,
  formatDateKey, formatLongDate, formatTime, formatShortTime,
  formatHoursMinutes, diffInHours, clamp, toDate,
  applyStoredTheme, toggleTheme, escapeHtml
} from "./utils.js";

applyStoredTheme();

let uid = null;
let userData = null;
let todayAttendanceId = null;
let todayAttendance = null;
let clockInterval = null;

const el = {
  clock: document.getElementById("liveClock"),
  dateLabel: document.getElementById("todayDateLabel"),
  timeInBtn: document.getElementById("timeInBtn"),
  timeOutBtn: document.getElementById("timeOutBtn"),
  statusBadge: document.getElementById("attendanceStatusBadge"),
  requiredHours: document.getElementById("requiredHoursValue"),
  renderedHours: document.getElementById("renderedHoursValue"),
  remainingHours: document.getElementById("remainingHoursValue"),
  progressBar: document.getElementById("progressBarFill"),
  progressLabel: document.getElementById("progressLabel"),
  profileName: document.getElementById("profileName"),
  profileNameLarge: document.getElementById("profileNameLarge"),
  profileDept: document.getElementById("profileDepartment"),
  profileDeptLarge: document.getElementById("profileDepartmentLarge"),
  profileSchool: document.getElementById("profileSchool"),
  profileStart: document.getElementById("profileStartDate"),
  profilePhoto: document.getElementById("profilePhoto"),
  profilePhotoLarge: document.getElementById("profilePhotoLarge"),
  historyBody: document.getElementById("historyTableBody"),
  todayAllBody: document.getElementById("todayAllInternsBody"),
  logoutBtn: document.getElementById("logoutBtn"),
  themeToggle: document.getElementById("themeToggle"),
  sidebarToggle: document.getElementById("sidebarToggle"),
  sidebar: document.getElementById("sidebar")
};

init();

async function init() {
  const authResult = await requireAuth("intern");
  uid = authResult.uid;
  userData = authResult.userData;

  renderProfile();
  renderHours();
  startClock();
  await loadTodayAttendance();
  listenToHistory();
  listenToTodayAllInterns();

  attachLogoutHandler(el.logoutBtn);
  el.timeInBtn.addEventListener("click", handleTimeIn);
  el.timeOutBtn.addEventListener("click", handleTimeOut);
  el.themeToggle?.addEventListener("click", () => toggleTheme());
  el.sidebarToggle?.addEventListener("click", () => el.sidebar.classList.toggle("sidebar-open"));
}

function renderProfile() {
  el.profileName.textContent = userData.name || "—";
  el.profileNameLarge.textContent = userData.name || "—";
  el.profileDept.textContent = userData.department || "—";
  el.profileDeptLarge.textContent = userData.department || "—";
  el.profileSchool.textContent = userData.school || "—";
  el.profileStart.textContent = userData.startDate || "—";
  if (userData.photoURL) {
    el.profilePhoto.src = userData.photoURL;
    el.profilePhotoLarge.src = userData.photoURL;
  }
}

function renderHours() {
  const required = userData.requiredHours || 0;
  const rendered = userData.renderedHours || 0;
  const remaining = userData.remainingHours ?? Math.max(required - rendered, 0);

  el.requiredHours.textContent = formatHoursMinutes(required);
  el.renderedHours.textContent = formatHoursMinutes(rendered);
  el.remainingHours.textContent = formatHoursMinutes(Math.max(remaining, 0));

  const pct = required > 0 ? clamp((rendered / required) * 100, 0, 100) : 0;
  el.progressBar.style.width = `${pct}%`;
  el.progressLabel.textContent = `${pct.toFixed(1)}% of internship completed`;
}

function startClock() {
  const tick = () => {
    const now = new Date();
    el.clock.textContent = formatTime(now);
    el.dateLabel.textContent = formatLongDate(now);
  };
  tick();
  clockInterval = setInterval(tick, 1000);
}

async function loadTodayAttendance() {
  const dateKey = formatDateKey();
  const q = query(
    collection(db, "attendance"),
    where("userId", "==", uid),
    where("date", "==", dateKey)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const docSnap = snap.docs[0];
    todayAttendanceId = docSnap.id;
    todayAttendance = docSnap.data();
  }
  updateAttendanceButtons();
}

function updateAttendanceButtons() {
  if (!todayAttendance) {
    el.timeInBtn.disabled = false;
    el.timeOutBtn.disabled = true;
    el.statusBadge.textContent = "Not timed in";
    el.statusBadge.className = "status-badge status-pending";
    return;
  }
  if (todayAttendance.timeIn && !todayAttendance.timeOut) {
    el.timeInBtn.disabled = true;
    el.timeOutBtn.disabled = false;
    el.statusBadge.textContent = "Timed in — currently working";
    el.statusBadge.className = "status-badge status-active";
    return;
  }
  if (todayAttendance.timeIn && todayAttendance.timeOut) {
    el.timeInBtn.disabled = true;
    el.timeOutBtn.disabled = true;
    el.statusBadge.textContent = "Completed for today";
    el.statusBadge.className = "status-badge status-complete";
  }
}

async function handleTimeIn() {
  if (todayAttendance) {
    showToast("You have already timed in today.", "error");
    return;
  }
  showSpinner();
  try {
    const now = new Date();
    const dateKey = formatDateKey(now);
    const docRef = await addDoc(collection(db, "attendance"), {
      userId: uid,
      userName: userData.name,
      department: userData.department,
      date: dateKey,
      timeIn: Timestamp.fromDate(now),
      timeOut: null,
      hoursRendered: 0,
      status: "active",
      timestamp: serverTimestamp()
    });
    todayAttendanceId = docRef.id;
    todayAttendance = { userId: uid, date: dateKey, timeIn: Timestamp.fromDate(now), timeOut: null, hoursRendered: 0, status: "active" };
    updateAttendanceButtons();
    showToast("Timed in successfully. Have a productive day!", "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to time in. Please try again.", "error");
  } finally {
    hideSpinner();
  }
}

async function handleTimeOut() {
  if (!todayAttendance || !todayAttendance.timeIn || todayAttendance.timeOut) {
    showToast("You need to time in before timing out.", "error");
    return;
  }
  showSpinner();
  try {
    const now = new Date();
    const timeInDate = toDate(todayAttendance.timeIn);
    const hoursWorked = Math.max(diffInHours(timeInDate, now), 0);

    await updateDoc(doc(db, "attendance", todayAttendanceId), {
      timeOut: Timestamp.fromDate(now),
      hoursRendered: hoursWorked,
      status: "completed"
    });

    const freshUserSnap = await getDoc(doc(db, "users", uid));
    const freshUser = freshUserSnap.data();
    const newRendered = (freshUser.renderedHours || 0) + hoursWorked;
    const newRemaining = Math.max((freshUser.requiredHours || 0) - newRendered, 0);

    await updateDoc(doc(db, "users", uid), {
      renderedHours: newRendered,
      remainingHours: newRemaining
    });

    userData.renderedHours = newRendered;
    userData.remainingHours = newRemaining;
    todayAttendance.timeOut = Timestamp.fromDate(now);
    todayAttendance.hoursRendered = hoursWorked;

    renderHours();
    updateAttendanceButtons();
    showToast(`Timed out. ${formatHoursMinutes(hoursWorked)} rendered today.`, "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to time out. Please try again.", "error");
  } finally {
    hideSpinner();
  }
}

function listenToHistory() {
  const q = query(
    collection(db, "attendance"),
    where("userId", "==", uid),
    orderBy("date", "desc")
  );
  onSnapshot(q, (snap) => {
    if (snap.empty) {
      el.historyBody.innerHTML = `<tr><td colspan="5" class="empty-row">No attendance records yet. Time in to get started.</td></tr>`;
      return;
    }
    el.historyBody.innerHTML = snap.docs
      .map((d) => {
        const r = d.data();
        const timeIn = formatShortTime(toDate(r.timeIn));
        const timeOut = r.timeOut ? formatShortTime(toDate(r.timeOut)) : "—";
        const hours = r.hoursRendered ? formatHoursMinutes(r.hoursRendered) : "—";
        const statusClass = r.status === "completed" ? "status-complete" : "status-active";
        return `
          <tr>
            <td>${escapeHtml(r.date)}</td>
            <td>${timeIn}</td>
            <td>${timeOut}</td>
            <td>${hours}</td>
            <td><span class="status-badge ${statusClass}">${r.status === "completed" ? "Completed" : "Active"}</span></td>
          </tr>`;
      })
      .join("");
  });
}

function listenToTodayAllInterns() {
  const dateKey = formatDateKey();
  const q = query(collection(db, "attendance"), where("date", "==", dateKey));
  onSnapshot(q, (snap) => {
    if (snap.empty) {
      el.todayAllBody.innerHTML = `<tr><td colspan="5" class="empty-row">No one has timed in yet today.</td></tr>`;
      return;
    }
    const rows = snap.docs
      .map((d) => d.data())
      .sort((a, b) => (a.userName || "").localeCompare(b.userName || ""));

    el.todayAllBody.innerHTML = rows
      .map((r) => {
        const timeIn = formatShortTime(toDate(r.timeIn));
        const timeOut = r.timeOut ? formatShortTime(toDate(r.timeOut)) : "—";
        const statusClass = r.status === "completed" ? "status-complete" : "status-active";
        return `
          <tr>
            <td>${escapeHtml(r.userName)}</td>
            <td>${escapeHtml(r.department)}</td>
            <td>${timeIn}</td>
            <td>${timeOut}</td>
            <td><span class="status-badge ${statusClass}">${r.status === "completed" ? "Completed" : "Active"}</span></td>
          </tr>`;
      })
      .join("");
  });
}

window.addEventListener("beforeunload", () => {
  if (clockInterval) clearInterval(clockInterval);
});

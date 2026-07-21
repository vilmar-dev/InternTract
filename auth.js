// ============================================================
// auth.js
// Shared authentication guards for protected pages
// ============================================================

import { auth, db, doc, getDoc, onAuthStateChanged, signOut } from "./firebase.js";
import { showToast, showSpinner, hideSpinner } from "./utils.js";

/**
 * Protects a dashboard page. Redirects to login.html if not authenticated,
 * to pending.html if the account isn't approved yet, or to the correct
 * dashboard if the user's role doesn't match requiredRole.
 * Resolves with { uid, userData } once the check passes.
 */
export function requireAuth(requiredRole) {
  return new Promise((resolve) => {
    showSpinner();
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          showToast("Account record not found. Please contact an admin.", "error");
          await signOut(auth);
          window.location.href = "login.html";
          return;
        }
        const userData = snap.data();

        if (userData.status === "rejected") {
          showToast("Your account was rejected. Contact an administrator.", "error");
          await signOut(auth);
          window.location.href = "login.html";
          return;
        }

        if (userData.status === "pending") {
          window.location.href = "pending.html";
          return;
        }

        if (userData.role !== requiredRole) {
          window.location.href = userData.role === "admin" ? "admin.html" : "intern.html";
          return;
        }

        hideSpinner();
        resolve({ uid: user.uid, userData });
      } catch (err) {
        console.error(err);
        showToast("Something went wrong loading your account.", "error");
        hideSpinner();
      }
    });
  });
}

/** Standard logout handler with a confirmation dialog */
export function attachLogoutHandler(buttonEl) {
  if (!buttonEl) return;
  buttonEl.addEventListener("click", async () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;
    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (err) {
      console.error(err);
      showToast("Failed to log out. Try again.", "error");
    }
  });
}

// ============================================================
// login.js — login.html
// ============================================================

import {
  auth, db,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  doc, getDoc
} from "./firebase.js";
import { showToast, showSpinner, hideSpinner } from "./utils.js";

const form = document.getElementById("loginForm");
const forgotLink = document.getElementById("forgotPasswordLink");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const loginAs = document.querySelector('input[name="loginRole"]:checked').value;
  const email = form.email.value.trim();
  const password = form.password.value;

  showSpinner();
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, "users", cred.user.uid));

    if (!snap.exists()) {
      showToast("No account record found for this user.", "error");
      hideSpinner();
      return;
    }

    const userData = snap.data();

    if (userData.role !== loginAs) {
      showToast(`This account is registered as ${userData.role}. Select the correct login option.`, "error");
      hideSpinner();
      return;
    }

    if (userData.status === "rejected") {
      showToast("Your account was rejected. Please contact an administrator.", "error");
      hideSpinner();
      return;
    }

    if (userData.status === "pending") {
      window.location.href = "pending.html";
      return;
    }

    window.location.href = userData.role === "admin" ? "admin.html" : "intern.html";
  } catch (err) {
    console.error(err);
    hideSpinner();
    showToast(friendlyAuthError(err), "error");
  }
});

forgotLink.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  if (!email) {
    showToast("Enter your email above first, then click 'Forgot password'.", "info");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showToast("Password reset email sent. Check your inbox.", "success");
  } catch (err) {
    console.error(err);
    showToast("Could not send reset email. Check the address and try again.", "error");
  }
});

function friendlyAuthError(err) {
  switch (err.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/invalid-email":
      return "That email address looks invalid.";
    default:
      return "Login failed. Please try again.";
  }
}

// ============================================================
// register.js — register.html
// Handles Intern and Admin account creation
// ============================================================

import {
  auth, db,
  createUserWithEmailAndPassword,
  updateProfile,
  doc, setDoc, serverTimestamp,
  
} from "./firebase.js";
import { showToast, showSpinner, hideSpinner, isCompanyEmail } from "./utils.js";

const roleRadios = document.querySelectorAll('input[name="accountType"]');
const internFields = document.getElementById("internFields");
const adminFields = document.getElementById("adminFields");
const form = document.getElementById("registerForm");

function syncFieldVisibility() {
  const selected = document.querySelector('input[name="accountType"]:checked').value;
  internFields.classList.toggle("hidden", selected !== "intern");
  adminFields.classList.toggle("hidden", selected !== "admin");
  internFields.querySelectorAll("input,select").forEach((el) => (el.required = selected === "intern"));
  adminFields.querySelectorAll("input,select").forEach((el) => (el.required = selected === "admin"));
}
roleRadios.forEach((r) => r.addEventListener("change", syncFieldVisibility));
syncFieldVisibility();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const role = document.querySelector('input[name="accountType"]:checked').value;

  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;
  if (password !== confirmPassword) {
    showToast("Passwords do not match.", "error");
    return;
  }
  if (password.length < 6) {
    showToast("Password must be at least 6 characters.", "error");
    return;
  }

  showSpinner();
  try {
    if (role === "intern") {
      await registerIntern();
    } else {
      await registerAdmin();
    }
  } catch (err) {
    console.error(err);
    showToast(friendlyAuthError(err), "error");
  } finally {
    hideSpinner();
  }
});

async function registerIntern() {
  const fullName = form.internFullName.value.trim();
  const school = form.internSchool.value.trim();
  const department = form.internDepartment.value.trim();
  const email = form.internEmail.value.trim();
  const password = form.password.value;
  const startDate = form.internStartDate.value;
  const requiredHours = parseFloat(form.internRequiredHours.value);
  const phone = form.internPhone.value.trim();
  const studentId = form.internStudentId.value.trim();
  

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: fullName });

 
  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid,
    role: "intern",
    status: "pending",
    name: fullName,
    school,
    department,
    email,
    startDate,
    requiredHours,
    renderedHours: 0,
    remainingHours: requiredHours,
    phone,
    studentId,
    photoURL: "",
    createdAt: serverTimestamp()
  });

  showToast("Account created! Waiting for administrator approval.", "success");
  window.location.href = "pending.html";
}

async function registerAdmin() {
  const fullName = form.adminFullName.value.trim();
  const email = form.adminEmail.value.trim();
  const password = form.password.value;
  const department = form.adminDepartment.value.trim();

  if (!isCompanyEmail(email)) {
    throw { code: "custom/company-email", message: "Please use a company email address (e.g. name@company.com)." };
  }

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: fullName });

  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid,
    role: "admin",
    status: "pending",
    name: fullName,
    email,
    department,
    createdAt: serverTimestamp()
  });

  showToast("Admin account created! Waiting for an existing admin to approve you.", "success");
  window.location.href = "pending.html";
}

function friendlyAuthError(err) {
  switch (err.code) {
    case "auth/email-already-in-use":
      return "That email is already registered. Try logging in instead.";
    case "auth/invalid-email":
      return "That email address looks invalid.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "custom/company-email":
      return err.message;
    default:
      return "Registration failed. Please try again.";
  }
}

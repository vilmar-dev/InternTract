// ============================================================
// firebase.js
// Firebase initialization + shared exports for InternTrack
// ------------------------------------------------------------
// 1) Replace firebaseConfig below with your project's config
//    (Firebase Console > Project Settings > General > Your apps)
// 2) Enable Email/Password sign-in under Authentication > Sign-in method
// 3) Create a Firestore database (production mode) and paste the
//    rules from firestore.rules into Firestore > Rules
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ------------------------------------------------------------
// TODO: Replace with your own Firebase project credentials
// ------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCwuTXFIA_J0bJDb_I3Qs3hlyCBt0pLQks",
  authDomain: "interntract.firebaseapp.com",
  projectId: "interntract",
  storageBucket: "interntract.firebasestorage.app",
  messagingSenderId: "675949820406",
  appId: "1:675949820406:web:713474101e601ec4136fd7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
  app,
  auth,
  db,
  storage,
  // auth
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  // firestore
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  // storage
  ref,
  uploadBytes,
  getDownloadURL
};

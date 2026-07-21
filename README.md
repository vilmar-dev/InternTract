# InternTrack — Internship Time Tracking System

A complete Firebase-backed internship attendance and hours-tracking web app.
Vanilla HTML/CSS/JS front end, Firebase Authentication + Firestore + Storage back end.

## File structure

```
interntrack/
├── index.html          Landing page
├── login.html           Login (Intern / Admin)
├── register.html         Registration (Intern / Admin)
├── pending.html          "Awaiting approval" holding page
├── admin.html           Admin dashboard
├── intern.html          Intern dashboard
├── firebase.json         Firebase Hosting config
├── firestore.rules        Firestore security rules
├── css/
│   ├── style.css        Shared base styles, buttons, forms, toasts, landing page
│   ├── login.css        Login/register role-selector styles
│   ├── admin.css        Admin dashboard layout
│   └── intern.css        Intern dashboard layout
└── js/
    ├── firebase.js       Firebase init + exported SDK functions (EDIT THIS FILE FIRST)
    ├── utils.js          Toasts, spinner, date/time/hour formatting, CSV export
    ├── auth.js           Auth guards for protected pages
    ├── login.js          login.html logic
    ├── register.js        register.html logic
    ├── admin.js          admin.html logic
    └── intern.js          intern.html logic
```

## 1. Create a Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Add a **Web app** to the project (Project Settings → General → Your apps → `</>`).
3. Copy the `firebaseConfig` object it gives you.

## 2. Configure the app

Open `js/firebase.js` and replace the placeholder `firebaseConfig` values with your own:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 3. Enable Authentication

Firebase Console → **Authentication** → **Sign-in method** → enable **Email/Password**.

## 4. Create Firestore

Firebase Console → **Firestore Database** → **Create database** → start in **production mode**.

Collections are created automatically the first time data is written (`users`, `attendance`, `departments`). No manual setup needed.

## 5. Apply security rules

Firebase Console → **Firestore Database** → **Rules** tab → paste the contents of `firestore.rules` → **Publish**.

## 6. Enable Storage (for optional intern profile pictures)

Firebase Console → **Storage** → **Get started** → use default rules, or restrict uploads to authenticated users:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profilePictures/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 7. Create the first admin account

Registration requires **every new admin** to be approved by an *existing* approved admin — including the very first one. To bootstrap:

1. Register an admin account normally at `register.html` (uses a company email, e.g. `you@yourcompany.com`).
2. In the Firebase Console → Firestore → `users` collection, find that user's document and manually change `status` from `"pending"` to `"approved"`.
3. From then on, that admin can approve every other account from the **Pending Accounts** tab in the dashboard.

## 8. Run locally

No build step is required — it's plain HTML/CSS/JS with ES modules. Serve the folder with any static server (opening `index.html` directly via `file://` will block ES module imports in some browsers):

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## 9. Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # select your project, use existing firebase.json
firebase deploy
```

## Notes

- Only company email domains are accepted for admin registration (Gmail/Yahoo/Outlook/etc. are rejected client-side in `register.js`).
- An intern can only Time In once per day; Time Out is disabled until they've timed in.
- Rendered/remaining hours update automatically and in real time via Firestore's `onSnapshot` listeners.
- Dark mode preference is stored in `localStorage` per browser.
- CSV export in the admin **Attendance** tab respects the currently applied date/department/name filters.

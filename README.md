# Ace-app 🎾

**Disciplined, Location-Locked Tennis Court Management.**

Ace-app is a hackathon project built by **Manav** and **Sudeepa**. It is designed to eliminate "ghost" waitlists at public tennis facilities by enforcing a strict physical-presence requirement using high-accuracy geofencing.

---

## 🚀 The Core Philosophy: "Discipline over Utility"

Unlike standard reservation apps, Ace-app prioritizes **fairness**. If you aren't at the courts, you aren't in the queue. 

* **Physical Currency:** Your GPS location is your reservation.
* **Zero Ghosting:** Automated removals for abandoned sessions.
* **Group Accountability:** The "Tag Holder" (Leader) must stay within the "Hub" to keep the court for the whole group.

---

## 🛠 Tech Stack

* **Frontend:** React Native via Expo (Expo Go)
* **Styling:** NativeWind (Tailwind CSS)
* **Backend:** Firebase (Firestore, Authentication, Cloud Functions)
* **Location:** `expo-location` + `expo-task-manager` for background geofencing
* **Notifications:** Firebase Cloud Messaging (FCM) for live, background alerts

---

## 🧠 The "5+5 Silent Sentry" Logic

This is the automated referee that manages active courts:

| Phase | Time | Status | Action |
| :--- | :--- | :--- | :--- |
| **Phase 1** | 0-5m | `active` | User exits geofence. App monitors silently. |
| **Phase 2** | 5-10m | `pending` | **Alert Sent:** User warned to return within 5 minutes. |
| **Release** | 10:01m | `open` | Court is released. Tag Holder is removed. |

> **Note on The Return:** If a user re-enters the 50m Hub radius at any point before the 10:01 mark, the timers reset automatically.

---

## 📂 Project Structure

* **/services/firebase.js**: Firestore initialization and data fetching logic. (Manav)
* **/hooks/useSilentSentry.js**: Background location tracking and geofence math. (Manav)
* **/screens/HubDashboard.js**: The primary UI grid for court visualization. (Sudeepa)
* **/components/CourtCard.jsx**: Adaptive UI component for Active/Pending/Open states. (Sudeepa)
* **/functions/**: Server-side logic for 10-minute automated court releases.

---

## ⚙️ Configuration Constants

These values are centralized for easy tweaking during the hackathon:

* `GEOLOCK_RADIUS`: 50m
* `WAITLIST_EXIT_GRACE`: 180s (3m)
* `CLAIM_WINDOW`: 180s (3m)
* `SENTRY_TOTAL_LIMIT`: 600s (10m)

---

## 🛠 Setup & Installation

1. **Clone the repo:** `git clone [your-repo-link]`
2. **Install dependencies:** `npm install`
3. **Set up Firebase:** Create a `.env` file with your Firebase Config keys.
4. **Run the app:** `npx expo start`

---

## 🏗 Development Workflow

* **Manav (Architect):** Responsible for the "Plumbing"—Firebase schema, background GPS tasks, and state transitions.
* **Sudeepa (Product/UI):** Responsible for the "Experience"—Dashboard UI, notification copy, and the "Claim" modal flow.

---

*Built for the 2026 Hackathon using Google Antigravity and Codex.*

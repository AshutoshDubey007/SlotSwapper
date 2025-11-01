# 🧩 SlotSwapper

SlotSwapper is a modern web application designed to simplify **slot management and swapping** within service-based or shift-oriented organizations. Built using **React, TypeScript, and Supabase**, it allows users to **view, request, and swap slots** easily with real-time updates and secure authentication.

---

## 🚀 Overview

The goal of SlotSwapper is to make shift or service slot management easier for teams.  
Users can:
- View their assigned slots using a **calendar view**.
- Request slot swaps with others in real-time.
- Accept or decline swap requests.
- Receive notifications for updates and confirmations.
- Authenticate securely using **Supabase Auth**.

### 🧠 Design Choices
- **React + TypeScript:** For modular, type-safe, and scalable development.  
- **Supabase Backend:** Handles authentication, database, and serverless functions seamlessly.  
- **Vite:** Enables fast development and optimized builds.  
- **Context API:** Manages global authentication and user state efficiently.  
- **Component-Based Architecture:** Each major feature (Dashboard, Marketplace, Notifications) is isolated for maintainability.

---

## 🛠️ Tech Stack

| Category | Technology |
|-----------|-------------|
| **Frontend** | React.js, TypeScript, Tailwind CSS |
| **Backend** | Supabase (Database + Auth + Edge Functions) |
| **Build Tool** | Vite |
| **Package Manager** | npm |
| **Deployment (optional)** | Vercel / Netlify |

---

## ⚙️ Setup Instructions

Follow these steps to run the project locally:

### 1️⃣ Clone the Repository
```bash

npm install
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

npm run dev

src/
 ├── components/
 │   ├── Auth.tsx
 │   ├── CalendarView.tsx
 │   ├── Dashboard.tsx
 │   ├── Marketplace.tsx
 │   └── Notifications.tsx
 ├── contexts/
 │   └── AuthContext.tsx
 ├── supabase/
 │   └── functions/
 │       ├── swap-request/
 │       │   └── index.ts
 │       ├── swap-response/
 │       │   └── index.ts
 │       └── swappable-slots/
 │           └── index.ts
 ├── App.tsx
 ├── main.tsx
 ├── index.css
 ├── vite-env.d.ts


💡 Assumptions

Each user is assigned a unique slot for a specific time/day.

Swaps are allowed only between authenticated users.

Each swap request must be approved by both sender and receiver.

Supabase handles all authentication and database actions.

⚔️ Challenges Faced

Handling real-time data synchronization between multiple users.

Managing multiple pending swap requests for the same slot.

Designing an intuitive calendar-based UI for slot visualization.

Ensuring security and data integrity using Supabase auth roles.
git clone https://github.com/<your-username>/SlotSwapper.git
cd SlotSwapper

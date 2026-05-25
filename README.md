# Court Case Management System (CourtMS)

**Advanced Web Technologies — Lab Final (MERN Stack)**  
Multi-role court portal: case filing, clerk registration, hearings, documents, and service requests.

**Repository:** https://github.com/Faizamunir720/CourtMS.git

---

## Features by role

| Role | Capabilities |
|------|----------------|
| **Citizen** | File cases (self-represented), track cases/documents, submit service requests |
| **Lawyer** | File cases for linked citizen accounts, hearings, documents, service requests |
| **Clerk** | Register cases, assign counsel, schedule hearings, registry documents, **registry inquiries** |
| **Judge** | Assigned cases/hearings, record outcomes, calendar |
| **Admin** | Users, analytics, audit logs, **service requests** (portal & escalation) |

### Case workflow

```
Submitted → Registered → Hearing Scheduled → Ongoing / Adjourned → Closed
```

### Service request categories

| Category | Handled by |
|----------|------------|
| Scheduling & hearings | Clerk |
| Documents & case file | Clerk |
| Portal & login | Admin |
| Other / escalation | Admin |

---

## Tech stack

MongoDB · Express · React (Vite) · Node.js · JWT · bcrypt · Multer

---

## Project structure

```
├── client/           # React SPA (Vite)
├── models/           # Mongoose schemas
├── routes/           # REST API
├── middlewares/
├── uploads/          # Document storage (local, gitignored)
├── index.js          # Express API
├── .env.example
└── README.md
```

---

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### 1. Environment

```bash
cp .env.example .env
```

```env
MONGODB_URI=mongodb://localhost:27017/court-case-manager
JWT_SECRET=your_long_random_secret
JWT_REFRESH_SECRET=your_long_random_refresh_secret
PORT=3000
NODE_ENV=development
```

### 2. Install

```bash
npm install
cd client && npm install && cd ..
```

### 3. Run

```bash
npm run dev:all
```

| Service | URL |
|---------|-----|
| React UI | http://localhost:5000 |
| API | http://localhost:3000/api |

Create accounts via **Register** on the login page (citizen, lawyer, etc.).

---

## Demo flow

1. Register users (or use existing DB accounts).
2. **Citizen** — file a case.
3. **Lawyer** — file for a citizen (select portal account).
4. **Clerk** — register case, assign counsel, schedule hearing.
5. **Judge** — record hearing outcome.
6. **Service requests** — citizen/lawyer submit; clerk or admin responds by category.

---

## API overview

Base: `http://localhost:3000/api` · Auth header: `Authorization: Bearer <token>`

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/login`, `/auth/register` |
| Cases | `POST /cases/submit`, `POST /cases/:id/register`, `GET /cases` |
| Hearings | `GET/POST /hearings`, `PUT /hearings/:id/outcome` |
| Documents | `POST/GET /documents`, download by ID |
| Service requests | `POST/GET /complaints`, `PUT /complaints/:id/respond` |
| Admin | `GET /users`, `/analytics/*`, `/audit-logs` |

---

## Authors

Ummara & Faiza — Advanced Web Technologies, Lab Final

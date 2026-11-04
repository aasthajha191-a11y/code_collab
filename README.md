# Real-Time Collaborative Code Editor (CodeCollab)

CodeCollab is a full-stack, enterprise-grade, real-time collaborative code editor and execution workspace. Built with React 18, Monaco Editor (VS Code), Node.js, Express, Socket.IO, Yjs CRDTs, PostgreSQL, Redis, and Judge0 integration.

---

## 📑 Table of Contents
1. [Problem Statement & Overview](#-problem-statement--overview)
2. [Key Features](#-key-features)
3. [System Architecture](#-system-architecture)
4. [Database Entity-Relationship (ER) Diagram](#-database-entity-relationship-er-diagram)
5. [Tech Stack](#-tech-stack)
6. [API Documentation](#-api-documentation)
7. [Installation & Setup](#-installation--setup)
8. [Docker & Deployment Guide](#-docker--deployment-guide)
9. [Automated Testing & Verification](#-automated-testing--verification)
10. [Known Limitations & Future Enhancements](#-known-limitations--future-enhancements)

---

## 🎯 Problem Statement & Overview
Modern engineering teams, pair programmers, and interviewers require seamless, low-latency code collaboration. Traditional text-sharing tools either suffer from race conditions (overwriting teammates' edits), lack real-time cursor awareness, or lack secure isolated code execution. 

CodeCollab solves this by providing:
- **Conflict-Free Replicated Data Types (CRDTs)** via Yjs to mathematically guarantee state convergence without conflicts.
- **Monaco Editor** for syntax highlighting, code autocompletion, bracket matching, and multi-language support.
- **Remote sandboxed code execution** via Judge0 (with simulated fallback).
- **Persistent snapshots and version comparison** backed by PostgreSQL.
- **Horizontally scalable WebSockets** powered by Redis pub/sub.

---

## ✨ Key Features

- ⚡ **Real-Time Code Collaboration**: Conflict-free concurrent editing powered by Yjs CRDTs and Socket.IO.
- 💻 **Monaco Code Editor**: VS Code-like editing experience with syntax highlighting, auto-completion, line numbers, and multi-language support (Python, JavaScript, Java).
- 👥 **Live Presence & Cursors**: See active collaborators in the room with colored cursors and awareness indicators.
- 🔒 **Authentication & Authorization**: Secure JWT authentication (cookies and Bearer tokens), bcrypt password hashing, and GitHub OAuth integration.
- 📁 **Room Management**: Create rooms, invite team members, adjust room permissions, and manage room access.
- 🕒 **Version History & Deduplication**: Automatic snapshots every 30 seconds when code changes occur, duplicate snapshot suppression, version diff comparison, and one-click rollback into the live Yjs session.
- 🚀 **Multi-Language Code Execution**: Judge0 integration for sandboxed execution of Python, JavaScript, and Java with compilation output, runtime errors, and execution timings.
- 🐳 **DevOps Ready**: Production Dockerfiles, Nginx reverse proxy with WebSocket upgrade support, Redis pub/sub adapter, and GitHub Actions CI.

---

## 🏛 System Architecture

```text
                           ┌────────────────────────┐
                           │      Web Browser       │
                           │ React + Monaco + Yjs   │
                           └───────────┬────────────┘
                                       │ HTTP / WebSockets
                                       ▼
                           ┌────────────────────────┐
                           │   Nginx Reverse Proxy  │
                           │  (Port 80 / 443 SSL)   │
                           └─────┬────────────┬─────┘
                     HTTP / API  │            │ WebSockets (WSS)
                                 ▼            ▼
                   ┌──────────────────────────────────────┐
                   │       CodeCollab Express Backend     │
                   │  - Auth (JWT / bcrypt / Passport)    │
                   │  - REST APIs (Rooms / Versions / Code│
                   │  - Socket.IO Collaboration Server    │
                   │  - In-Memory Yjs Doc Manager         │
                   └───────┬──────────────┬───────────────┘
                           │              │
             PostgreSQL ORM│              │Redis Pub/Sub
                           ▼              ▼
                   ┌──────────────┐ ┌──────────────┐
                   │  PostgreSQL  │ │    Redis     │
                   │ (Persistence)│ │ (Scalability)│
                   └──────────────┘ └──────────────┘
                           │
                           ▼ (Judge0 API)
                   ┌──────────────┐
                   │    Judge0    │
                   │ Code Sandbox │
                   └──────────────┘
```

---

## 🗄 Database Entity-Relationship (ER) Diagram

```text
  +------------------+         +----------------------+         +--------------------+
  |      User        |         |      RoomMember      |         |        Room        |
  +------------------+         +----------------------+         +--------------------+
  | id (PK)          |<---+    | id (PK)              |    +--->| id (PK)            |
  | email (Unique)   |    +----| userId (FK)          |    |    | name               |
  | password (Hash)  |         | roomId (FK)          |----+    | language           |
  | name             |         | role (OWNER/MEMBER)  |         | currentCode        |
  | githubId         |         | joinedAt             |         | ownerId (FK)-------+
  | avatarUrl        |         +----------------------+         | createdAt          |
  | createdAt        |                                          | updatedAt          |
  +------------------+                                          +--------------------+
          |                                                                |
          | Creates                                                        | Has Snapshots
          v                                                                v
  +----------------------------------------------------------------------------------+
  |                                   CodeSnapshot                                   |
  +----------------------------------------------------------------------------------+
  | id (PK)                                                                          |
  | roomId (FK) ---------------------------------------------------------------------+
  | createdById (FK) ----------------------------------------------------------------+
  | versionNumber (Int)                                                              |
  | code (Text)                                                                      |
  | language (VarChar)                                                               |
  | createdAt (Timestamp)                                                            |
  +----------------------------------------------------------------------------------+
```

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 (Vite, TypeScript)
- **Editor**: Monaco Editor (`@monaco-editor/react`, `y-monaco`)
- **CRDT / Real-time**: `yjs`, `y-protocols`, `socket.io-client`
- **Styling**: Tailwind CSS, Lucide React
- **Notifications & UI**: `react-hot-toast`

### Backend
- **Runtime**: Node.js & Express (TypeScript)
- **Real-Time Engine**: Socket.IO, `@socket.io/redis-adapter`, `yjs`
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Cache & Pub/Sub**: Redis
- **Security**: JWT, bcryptjs, Helmet, CORS, Cookie-Parser, Zod validation
- **Execution**: Judge0 REST API (with high-fidelity sandboxed fallback)

### DevOps & Infrastructure
- Docker & Docker Compose
- Nginx Reverse Proxy (SPA routing, WebSocket proxying, SSL ready)
- GitHub Actions CI (`.github/workflows/ci.yml`)

---

## 🔌 API Documentation

All routes except `/health` and `/auth/*` require authentication via JWT cookie or `Authorization: Bearer <token>`.

### Authentication Endpoints
- `POST /auth/register` — Register a new user (`email`, `password`, `name`).
- `POST /auth/login` — Log in with credentials and receive JWT.
- `GET  /auth/me` — Retrieve the current authenticated user.
- `POST /auth/logout` — Clear session / JWT cookie.
- `GET  /auth/github` — Initiate GitHub OAuth login.

### Room Endpoints
- `GET    /api/rooms` — List all rooms user is a member of.
- `POST   /api/rooms` — Create a new room (`name`, `language`).
- `GET    /api/rooms/:roomId` — Fetch room metadata and permissions.
- `PATCH  /api/rooms/:roomId` — Update room name or language.
- `DELETE /api/rooms/:roomId` — Delete room (owner only).
- `GET    /api/rooms/:roomId/members` — List members in room.
- `POST   /api/rooms/:roomId/join` — Join a room by ID.
- `POST   /api/rooms/:roomId/leave` — Leave a room.
- `GET    /api/rooms/:roomId/code` — Fetch current saved code.
- `PUT    /api/rooms/:roomId/code` — Save updated code.

### Code Execution Endpoint
- `POST /api/rooms/:roomId/execute` — Execute code snippet via Judge0 sandbox.
  - Body: `{ "code": "print('hello')", "language": "python" }`
  - Returns: `{ stdout, stderr, compile_output, status, time, memory }`

### Version History & Snapshot Endpoints
- `GET  /api/rooms/:roomId/versions` — List historical snapshots.
- `POST /api/rooms/:roomId/snapshots` — Create snapshot (auto-deduplicated).
- `GET  /api/rooms/:roomId/versions/compare?fromId=<id>&toId=<id>` — Compare two snapshots and retrieve diff metadata.
- `POST /api/rooms/:roomId/versions/:versionId/restore` — Restore snapshot to active room code and synchronize live Yjs document.

---

## 💻 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+

### 1. Clone & Configure Environment
```bash
git clone https://github.com/wolfyy-art/real_code_collaborate.git
cd real_code_collaborate

# Copy environment variables
cp .env.example .env
cp .env.example backend/.env
```

### 2. Configure Environment (`.env`)
```ini
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/collab_editor"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secure-random-jwt-secret-at-least-32-chars"
FRONTEND_URL="http://localhost:5173"
# Optional external credentials:
JUDGE0_API_KEY=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

### 3. Install Dependencies & Initialize Database
```bash
# Backend
cd backend
npm install
npx prisma migrate deploy
npm run build

# Frontend
cd ../frontend
npm install
npm run build
```

### 4. Start Development Servers
**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🐳 Docker & Deployment Guide

Run the complete multi-tier system with one command:
```bash
docker compose up --build -d
```

### Service Map:
- **Nginx (Gateway)**: `http://localhost:80`
- **Frontend (SPA)**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

### Stopping the Services:
```bash
docker compose down -v
```

---

## 🧪 Automated Testing & Verification

CodeCollab comes with comprehensive end-to-end and phase audit test suites:

### Run Phase 9 Master Test Suite:
```bash
node tests/test_phase9_master.mjs
```

### Verified Test Cases (100% Pass Rate):
1. **Infrastructure & Health Checks**
   - `[PASS]` Health endpoint returns 200 OK (`/health`)
2. **Authentication & Authorization**
   - `[PASS]` Register user Alice (`/auth/register`)
   - `[PASS]` Duplicate registration rejected with 409
   - `[PASS]` Invalid password rejected with 401
   - `[PASS]` Login user Alice returns valid JWT (`/auth/login`)
   - `[PASS]` Register user Bob
3. **Room Management & Memberships**
   - `[PASS]` Alice creates room (`POST /api/rooms`)
   - `[PASS]` Bob joins room (`POST /api/rooms/:roomId/join`)
   - `[PASS]` Room membership contains Alice and Bob
4. **Code Execution (Judge0 Integration & Safe Fallback)**
   - `[PASS]` Python execution succeeds with stdout
   - `[PASS]` JavaScript execution succeeds with stdout
   - `[PASS]` Java execution succeeds with stdout
   - `[PASS]` Compilation/syntax error handled gracefully
5. **Persistence, Version History & Deduplication**
   - `[PASS]` Create initial snapshot v1
   - `[PASS]` Duplicate snapshot prevented (`unchanged: true`, HTTP 200)
   - `[PASS]` Create snapshot v2
   - `[PASS]` Compare versions returns diff metadata
   - `[PASS]` Restore v1 updates current room code and updates in-memory Yjs doc
6. **Real-Time Collaboration & Sockets (Redis Scalable)**
   - `[PASS]` Yjs document sync update received by collaborating socket
   - `[PASS]` Cursor/presence awareness update received by peer socket

---

## ⚠️ Known Limitations & Future Enhancements

- **Judge0 API Key**: Real-time sandboxing connects out-of-the-box when `JUDGE0_API_KEY` is provided in `.env`. When not provided, CodeCollab seamlessly uses a high-fidelity local execution simulator.
- **GitHub OAuth**: Requires GitHub OAuth app registration (`GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`) to test third-party social logins. Direct email/password auth is fully functional without third-party credentials.
- **Integrated Terminal / Stdin**: Currently execution supports standard batch code execution with stdout/stderr; interactive stdin streaming (e.g., `input()`) can be added via Judge0 WebSocket runner.
- **Audio/Video Collaboration**: Can be easily integrated in future phases using WebRTC mesh or LiveKit.

---

## 📜 License
MIT License. Built for collaborative developers everywhere.

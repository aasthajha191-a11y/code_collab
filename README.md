# Real-Time Collaborative Code Editor (CodeCollab)

A full-stack, real-time collaborative code editor built with React, Monaco Editor, Node.js, Socket.IO, Yjs CRDTs, PostgreSQL, and Redis.

## Features

- ⚡ **Real-Time Code Collaboration**: Conflict-free concurrent editing powered by Yjs (CRDT) and Socket.IO.
- 💻 **Monaco Code Editor**: VS Code-like editing experience with syntax highlighting, auto-completion, line numbers, and multi-language support.
- 👥 **Live Presence & Cursors**: See active collaborators in the room with avatars and awareness indicators.
- 🔒 **Authentication**: JWT-based auth and GitHub OAuth integration via Passport.js.
- 📁 **Room Management**: Create public/private collaboration rooms, customize language modes, and manage room access.
- 🕒 **Version History**: Save and inspect room snapshots and version history.
- 🚀 **Code Execution (Judge0 Integration)**: Execute snippets in multiple programming languages directly in the browser.
- 🐳 **Docker & Production Ready**: Docker Compose setup for PostgreSQL, Redis, Express Backend, React Frontend, and Nginx reverse proxy.

---

## Tech Stack

### Frontend
- **Framework**: React 18 (Vite, TypeScript)
- **Editor**: Monaco Editor (`@monaco-editor/react`, `y-monaco`)
- **Real-time / CRDT**: `yjs`, `y-protocols`, `socket.io-client`
- **Styling**: Tailwind CSS, Lucide React
- **Routing & State**: React Router v6, Context API

### Backend
- **Runtime**: Node.js & Express (TypeScript)
- **WebSockets / CRDT**: Socket.IO, `@socket.io/redis-adapter`, `yjs`
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Cache & Pub/Sub**: Redis
- **Auth**: JWT, bcryptjs, Passport GitHub OAuth2
- **Validation**: Zod

### DevOps & Infrastructure
- Docker & Docker Compose
- Nginx reverse proxy
- GitHub Actions CI

---

## Project Structure

```text
├── backend/
│   ├── prisma/             # Database schema and migrations
│   ├── src/
│   │   ├── collaboration/  # Yjs document managers and CRDT logic
│   │   ├── config/         # Environment and Redis configurations
│   │   ├── controllers/    # Route controllers (auth, rooms, code execution, versions)
│   │   ├── database/       # Prisma client instance
│   │   ├── middleware/     # Auth, error handling, validation middleware
│   │   ├── routes/         # Express API routes
│   │   ├── sockets/        # Real-time Socket.IO and awareness handlers
│   │   └── index.ts        # Server entry point
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # Navbar, Modal, Avatar, LanguageSelector, etc.
│   │   ├── context/        # Auth and application state
│   │   ├── hooks/          # useRoom, useRooms custom hooks
│   │   ├── pages/          # Landing, Dashboard, Editor, Login pages
│   │   ├── services/       # Axios API client
│   │   └── App.tsx
│   └── Dockerfile
├── nginx/
│   └── nginx.conf          # Reverse proxy configuration
├── docker-compose.yml       # Docker deployment specification
└── .env.example            # Environment variables template
```

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL & Redis (or Docker)

### 1. Clone the repository
```bash
git clone https://github.com/wolfyy-art/real_code_collaborate.git
cd real_code_collaborate
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` (and `backend/.env`):
```bash
cp .env.example .env
cp .env.example backend/.env
```

Edit `.env` to configure your database connection string, Redis URL, JWT secret, and optional Judge0 / GitHub OAuth keys.

### 3. Running with Docker Compose (Recommended)
```bash
docker compose up --build
```
- Frontend will be available at: `http://localhost:5173` (or `http://localhost:80` via Nginx)
- Backend API will be available at: `http://localhost:4000`

### 4. Running Locally

#### Backend:
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## License

MIT

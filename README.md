# TaskFlow – Team Task Manager

A full-stack project & task management app with role-based access control.

## Features

- **Authentication** – Signup/Login with JWT. First user becomes Admin automatically.
- **Role-Based Access** – Admin sees all projects/users; Members see only their projects.
- **Projects** – Create, color-code, invite members, track progress.
- **Tasks** – Kanban board & list view, priority levels, due dates, assignees, comments.
- **Dashboard** – Personal overview of active tasks, stats, and recent activity.
- **Team Management** – Admin can view all users (Admin-only page).

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Backend  | Node.js + Express |
| Database | SQLite via sql.js (zero native deps) |
| Auth     | JWT + bcryptjs |
| Frontend | React + Vite |
| Routing  | React Router v6 |
| HTTP     | Axios |
| Deploy   | Railway (single service, full-stack) |

---

## Local Development

### 1. Clone & Install

```bash
git clone <your-repo>
cd taskflow

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Run (two terminals)

**Terminal 1 – Backend:**
```bash
cd backend
node server.js
# Runs on http://localhost:3001
```

**Terminal 2 – Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173 (proxies /api to :3001)
```

### 3. Open http://localhost:5173

- Sign up (first account = Admin)
- Create projects, add tasks, invite members

---

## Deploy to Railway

### Option A: One-click via Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init        # Create new project
railway up          # Deploy
```

### Option B: GitHub Deploy (Recommended)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway auto-detects `nixpacks.toml` and builds both frontend + backend

### Environment Variables (set in Railway dashboard)

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | any random 32+ char string |
| `PORT` | `3001` (Railway sets this automatically) |

> **Database note:** sql.js saves the SQLite DB to disk. For persistent storage on Railway, add a **Volume** mounted at `/data` and set `DB_PATH=/data/taskflow.db`.

### Adding a Volume for Persistence

1. In Railway dashboard → your service → **Volumes**
2. Add volume, mount path: `/data`
3. Set env var: `DB_PATH=/data/taskflow.db`
4. Redeploy

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/users` | List all users (auth required) |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List my projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Project details + stats |
| PUT | `/api/projects/:id` | Update project (admin) |
| DELETE | `/api/projects/:id` | Delete project (admin) |
| POST | `/api/projects/:id/members` | Add member |
| DELETE | `/api/projects/:id/members/:uid` | Remove member |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/:id/tasks` | List tasks (filter by status/priority) |
| POST | `/api/projects/:id/tasks` | Create task |
| GET | `/api/tasks/:id` | Task detail + comments |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/comments` | Add comment |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Stats + active tasks + recent activity |

---

## Project Structure

```
taskflow/
├── backend/
│   ├── server.js          # Express app entry
│   ├── database.js        # sql.js SQLite wrapper
│   ├── middleware/
│   │   └── auth.js        # JWT + RBAC middleware
│   └── routes/
│       ├── auth.js        # Auth endpoints
│       ├── projects.js    # Project CRUD + members
│       └── tasks.js       # Task CRUD + comments + dashboard
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Routes
│   │   ├── context/       # Auth context
│   │   ├── pages/         # Dashboard, Projects, ProjectDetail, Team, Auth
│   │   ├── components/    # Layout, TaskModal
│   │   └── utils/         # API client, helpers
│   └── vite.config.js
├── railway.json
├── nixpacks.toml
└── README.md
```

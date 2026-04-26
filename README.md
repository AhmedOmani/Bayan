# Bayan (بيان)

Full-stack Arabic homework & assessment platform built with Go, React, and PostgreSQL.

**Bayan** is an educational platform designed for Arabic language teachers to create, distribute, and auto-grade homework assignments. Students receive instant, per-question explanations for incorrect answers — turning every mistake into a learning moment.

## Features

- **MCQ Assignment Builder** — Variable choices per question with per-question explanations
- **Instant Auto-Grading** — Students see results and explanations immediately on submission
- **Multi-Grade Management** — Grade-based assignment targeting and student organization
- **Role-Based Access** — Teacher admin panel + student quiz interface in a single app
- **Arabic-First** — Full RTL layout, Arabic typography (IBM Plex Sans Arabic, Cairo, Noto Naskh)
- **Premium UI** — Dark mode, glassmorphism, Desert Gold design system

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go (chi router) |
| Frontend | React, Vite, Shadcn/ui, Phosphor Icons |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Deployment | Hetzner VPS, Caddy, systemd |

## Getting Started

### Prerequisites

- Go 1.22+
- PostgreSQL 15+
- Node.js 20+

### Setup

```bash
# create database
createdb bayan

# copy env file
cp .env.example .env

# run the server (auto-runs migrations)
go run main.go

# setup frontend
cd web
npm install
npm run dev
```

Default teacher credentials are printed to the console on first run.

## Project Structure

```
.
├── main.go              # entry point
├── config/              # environment config
├── db/                  # database connection + migrations
├── handlers/            # HTTP handlers
├── middleware/           # auth + CORS middleware
├── models/              # data structures
├── helpers/             # JSON utilities
├── migrations/          # SQL migration files
└── web/                 # React frontend
```

## License

MIT

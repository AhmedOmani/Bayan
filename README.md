# بيان | Bayan

A full-stack educational platform built with **Go** and **React**, designed for teachers and students to manage assignments, take quizzes, and track academic progress in Arabic.

## Features

### Teacher Dashboard
- Manage classes and grades
- Create assignments with multiple-choice questions
- Set deadlines and publish when ready
- Review student submissions with full paper view
- Track student enrollment and approval workflow

### Student Portal
- Self-registration with grade selection
- View and take published assignments
- Real-time quiz experience with progress tracking
- Detailed results with explanations and score breakdown

### Security
- HTTP-only cookie-based authentication
- Separate session management for teachers and students
- JWT tokens with role-based access control

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go, Chi Router |
| Database | PostgreSQL |
| Frontend | React, Vite |
| Auth | JWT, bcrypt, HTTP-only Cookies |

## Project Structure

```
Bayan/
├── backend/
│   ├── config/       # env configuration
│   ├── db/           # database connection & migrations
│   ├── handlers/     # route handlers
│   ├── helpers/      # json & error utilities
│   ├── middleware/    # auth, cors, role guards
│   ├── models/       # data models
│   ├── migrations/   # SQL schema
│   └── main.go       # entry point & routing
└── frontend/
    ├── src/
    │   ├── components/   # layout components
    │   ├── context/      # toast notification system
    │   ├── pages/        # all page components
    │   └── api.js        # API client
    └── index.html
```

## Getting Started

### Prerequisites
- Go 1.21+
- Node.js 18+
- PostgreSQL 15+

### Setup

1. Clone the repository
```bash
git clone https://github.com/AhmedOmani/Bayan.git
cd Bayan
```

2. Configure the backend
```bash
cd backend
cp .env.example .env
# edit .env with your database credentials
```

3. Start the backend
```bash
go run main.go
```

4. Start the frontend
```bash
cd frontend
npm install
npm run dev
```

5. Open `http://localhost:5173`

### Default Credentials
- **Teacher**: admin@bayan.com / admin123

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/teacher/login | Teacher login |
| POST | /api/auth/student/register | Student registration |
| POST | /api/auth/student/login | Student login |

### Grades & Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/grades | List all grades |
| POST | /api/grades | Create a grade |
| GET | /api/students | List all students |
| PATCH | /api/students/:id/approve | Approve a student |

### Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/assignments | Create assignment with questions |
| GET | /api/assignments | List assignments (role-aware) |
| GET | /api/assignments/:id | Get assignment detail |
| POST | /api/assignments/:id/publish | Publish a draft |
| POST | /api/assignments/:id/submit | Submit answers (auto-graded) |
| GET | /api/assignments/:id/submissions | List submissions |
| GET | /api/submissions/:id | Get full submission detail |

## License

MIT

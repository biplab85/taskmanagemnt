# SKLENTR Task Management System

A premium, modern task management system inspired by Asana and Trello. Built with **React + TypeScript + Tailwind CSS + shadcn/ui** for the frontend and **Laravel REST API** for the backend.

## Features

### Core
- **Kanban Board** with full drag & drop (5 columns: Backlog, To Do, In Progress, Review, Complete)
- **Task CRUD** with rich text editor (Tiptap) for descriptions
- **File Attachments** with image preview, multi-file upload, file type validation
- **Comments** on tasks with real-time updates
- **Dashboard** with stats cards, completion progress ring, and activity feed

### User Experience
- **Dark Mode / Light Mode** toggle with localStorage persistence
- **Smooth animations** and transitions throughout
- **Responsive design** with premium spacing and typography
- **Custom scrollbars** and backdrop blur effects

### User Management
- **JWT Authentication** (login, register, logout, token refresh)
- **Role-based access** (Admin can manage all users/tasks, Users see only their own)
- **User Profile page** with avatar upload, personal info editing
- **User Status** indicators (Working, Busy, In Meeting, Vacation, Offline)
- **Admin User Management** panel with full CRUD

### Additional
- **Notifications** system with unread count and mark-all-read
- **Activity Logs** tracking task creation, updates, and status changes
- **Search & Filters** on Kanban board (text search, priority filter, assignee filter)
- **Figma Link** support in task attachments

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v4, shadcn/ui |
| Rich Text | Tiptap |
| Drag & Drop | @dnd-kit |
| Backend | Laravel 12, PHP 8.2 |
| Auth | JWT (php-open-source-saver/jwt-auth) |
| Database | MySQL 8.4 |
| Dev Server | WampServer |

## Quick Start

### Prerequisites
- PHP 8.2+ with MySQL
- Node.js 18+
- WampServer (or any MySQL server)

### 1. Database Setup
```sql
-- Import the schema
mysql -u root < database.sql
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
php ../composer.phar install

# Configure environment
cp .env.example .env
# Edit .env: DB_DATABASE=taskmanagemnt, DB_USERNAME=root, DB_PASSWORD=

# Generate keys
php artisan key:generate
php artisan jwt:secret

# Create storage link
php artisan storage:link

# Seed with dummy data
php artisan db:seed

# Start server
php artisan serve
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 4. Access
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api

### Default Accounts
| Email | Password | Role |
|-------|----------|------|
| admin@sklentr.com | admin123 | Admin |
| sarah@sklentr.com | password123 | User |
| marcus@sklentr.com | password123 | User |
| emily@sklentr.com | password123 | User |
| david@sklentr.com | password123 | User |
| olivia@sklentr.com | password123 | User |

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/register | No | Register new user |
| POST | /api/login | No | Login |
| POST | /api/logout | Yes | Logout |
| GET | /api/user | Yes | Get current user |
| POST | /api/refresh | Yes | Refresh JWT token |

### Profile
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PUT | /api/profile | Yes | Update profile |
| POST | /api/profile/avatar | Yes | Upload avatar |

### Tasks
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/tasks | Yes | List tasks (filtered by role) |
| POST | /api/tasks | Yes | Create task |
| GET | /api/tasks/:id | Yes | Get task detail |
| PUT | /api/tasks/:id | Yes | Update task |
| DELETE | /api/tasks/:id | Yes | Delete task |
| PUT | /api/tasks-reorder | Yes | Reorder tasks (drag & drop) |

### Comments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/tasks/:id/comments | Yes | Add comment |
| DELETE | /api/comments/:id | Yes | Delete comment |

### Attachments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/tasks/:id/attachments | Yes | Upload files |
| DELETE | /api/attachments/:id | Yes | Delete attachment |

### Notifications
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/notifications | Yes | List notifications |
| GET | /api/notifications/unread-count | Yes | Get unread count |
| PUT | /api/notifications/:id/read | Yes | Mark as read |
| PUT | /api/notifications/read-all | Yes | Mark all as read |

### Users (Admin Only)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/users | Admin | List users |
| POST | /api/users | Admin | Create user |
| GET | /api/users/:id | Admin | Get user |
| PUT | /api/users/:id | Admin | Update user |
| DELETE | /api/users/:id | Admin | Delete user |

## Project Structure

```
taskmanagemnt/
├── backend/                  # Laravel REST API
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   ├── Models/
│   │   └── Http/Middleware/
│   ├── routes/api.php
│   └── database/seeders/
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── api/              # Axios instance
│   │   ├── components/       # UI components
│   │   │   ├── auth/
│   │   │   ├── kanban/
│   │   │   ├── layout/
│   │   │   ├── shared/
│   │   │   ├── tasks/
│   │   │   ├── ui/           # shadcn components
│   │   │   └── users/
│   │   ├── context/          # Auth + Theme providers
│   │   ├── pages/
│   │   └── types/
│   └── index.html
├── database.sql
└── README.md
```

## License

Private - SKLENTR

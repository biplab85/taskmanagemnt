# SKLENTR - Task Management System

## Skill & Feature Document (SFD)

---

### 1. Core Features

- User Registration, Login, Logout (JWT Authentication)
- User Management (Create, Edit, Update, Delete users — Admin only)
- Role-based Access Control (Admin, User)
- Task Creation, Update, Delete with Rich Text Descriptions (Tiptap)
- Drag & Drop Kanban Board (Backlog, To Do, In Progress, Review, Complete)
- Task Assignment to Users
- Search & Filter on Kanban Board (text search, priority filter, assignee filter)
- Notifications System with Unread Count
- Activity Logs Tracking All Changes
- Multi-file Attachment Support with Image Preview
- User Profile Page with Avatar Upload & Status Indicators
- Dark Mode / Light Mode Toggle with Persistence
- Dashboard with Stats, Progress Ring & Activity Feed

---

### 2. User Roles & Permissions

#### Admin
- View all tasks across all users
- Create, edit, delete any task
- Assign tasks to any user
- Manage users (full CRUD)
- Control permissions
- Access Admin Panel (User Management)

#### User
- View only assigned tasks
- Create new tasks
- Update own tasks
- Comment on tasks
- Upload attachments
- Manage own profile & avatar

---

### 3. Task Details

| Field           | Description                                          |
|-----------------|------------------------------------------------------|
| Title           | Task name                                            |
| Description     | Rich text description (Tiptap editor with formatting)|
| Priority        | Low, Medium, High, Urgent                            |
| Status          | Backlog, To Do, In Progress, Review, Complete        |
| Start Date      | Task start date                                      |
| End Date        | Task deadline                                        |
| Assigned User   | User responsible for the task                        |
| Position        | Sort order within Kanban column                      |
| Attachments     | Files & images linked to the task                    |
| Comments        | User comments with timestamps                        |
| Activity History| Log of all changes made to the task                  |

---

### 4. File Attachment Support

- Figma links (stored as attachment with figma_link field)
- Image files (PNG, JPG, JPEG, GIF, SVG, WebP) — with inline preview
- Documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX)
- Design files (PSD, AI, Sketch, Fig)
- Video files (MP4, MOV, AVI)
- Archives (ZIP, RAR, 7Z)
- Multiple files per task (batch upload)
- File size limit: 50MB per file
- Drag & drop upload zone

---

### 5. UI / UX Features

- **Dashboard** — Stats cards with gradient backgrounds, SVG completion progress ring, activity feed, recent tasks
- **Kanban Board** — Full drag & drop between columns using @dnd-kit with custom collision detection
- **Dark Mode / Light Mode** — Toggle with localStorage persistence, smooth transitions
- **Rich Text Editor** — Tiptap with toolbar (bold, italic, headings, lists, blockquote, links)
- **Smooth Animations** — fadeIn, slideInLeft, scaleIn CSS keyframe animations throughout
- **Responsive Design** — Mobile-friendly with premium spacing and typography
- **Custom Scrollbars** — Styled thin scrollbars matching the theme
- **Backdrop Blur Effects** — Glass-morphism on overlays and headers
- **User Status Indicators** — Colored dots (Working, Busy, In Meeting, Vacation, Offline)
- **Premium Card Design** — Rounded corners, shadows, hover effects

#### Pages
- Login / Register (with theme toggle and animated cards)
- Dashboard (stats, progress ring, activity feed)
- Kanban Board (drag & drop with search/filters)
- Task Modal (3 tabs: Details, Files, Comments)
- Profile Page (avatar upload, status selector, personal info)
- User Management (Admin only — table with CRUD actions)

---

### 6. Technology Stack

| Layer          | Technology                                              |
|----------------|---------------------------------------------------------|
| Frontend       | React 19, TypeScript, Vite 7, Tailwind CSS v4, shadcn/ui |
| Rich Text      | Tiptap (@tiptap/react, starter-kit, link, placeholder) |
| Drag & Drop    | @dnd-kit (core, sortable, utilities)                    |
| Icons          | Lucide React                                            |
| Toasts         | Sonner                                                  |
| Backend        | Laravel 12, PHP 8.2                                     |
| Authentication | JWT (php-open-source-saver/jwt-auth)                    |
| Database       | MySQL 8.4                                               |
| Dev Server     | WampServer                                              |

---

### 7. Database Design

```
Users          (id, name, email, password, role, can_view_all_tasks, avatar, status, remember_token, created_at, updated_at)
Tasks          (id, title, description, status, priority, assigned_to, created_by, start_date, end_date, position, created_at, updated_at)
Comments       (id, task_id, user_id, body, created_at, updated_at)
Attachments    (id, task_id, file_name, file_path, file_size, file_type, figma_link, created_at)
Permissions    (id, user_id, permission_name, created_at)
Notifications  (id, user_id, title, message, type, is_read, related_task_id, created_at)
Activity_Logs  (id, user_id, task_id, action, description, created_at)
```

#### User Status Values
- `working` — Currently working
- `busy` — Busy, do not disturb
- `in_meeting` — In a meeting
- `vacation` — On vacation
- `offline` — Offline (default)

---

### 8. API Endpoints

#### Auth
| Method | Endpoint                    | Auth  | Description           |
|--------|-----------------------------|-------|-----------------------|
| POST   | /api/register               | No    | Register new user     |
| POST   | /api/login                  | No    | User login            |
| POST   | /api/logout                 | Yes   | Logout                |
| GET    | /api/user                   | Yes   | Get current user      |
| POST   | /api/refresh                | Yes   | Refresh JWT token     |

#### Profile
| Method | Endpoint                    | Auth  | Description           |
|--------|-----------------------------|-------|-----------------------|
| PUT    | /api/profile                | Yes   | Update profile        |
| POST   | /api/profile/avatar         | Yes   | Upload avatar         |

#### Tasks
| Method | Endpoint                    | Auth  | Description           |
|--------|-----------------------------|-------|-----------------------|
| GET    | /api/tasks                  | Yes   | List tasks (filtered) |
| POST   | /api/tasks                  | Yes   | Create task           |
| GET    | /api/tasks/:id              | Yes   | Get task detail       |
| PUT    | /api/tasks/:id              | Yes   | Update task           |
| DELETE | /api/tasks/:id              | Yes   | Delete task           |
| PUT    | /api/tasks-reorder          | Yes   | Reorder tasks (D&D)   |

#### Comments
| Method | Endpoint                    | Auth  | Description           |
|--------|-----------------------------|-------|-----------------------|
| POST   | /api/tasks/:id/comments     | Yes   | Add comment           |
| DELETE | /api/comments/:id           | Yes   | Delete comment        |

#### Attachments
| Method | Endpoint                    | Auth  | Description           |
|--------|-----------------------------|-------|-----------------------|
| POST   | /api/tasks/:id/attachments  | Yes   | Upload files          |
| DELETE | /api/attachments/:id        | Yes   | Delete attachment     |

#### Notifications
| Method | Endpoint                         | Auth  | Description           |
|--------|----------------------------------|-------|-----------------------|
| GET    | /api/notifications               | Yes   | List notifications    |
| GET    | /api/notifications/unread-count  | Yes   | Get unread count      |
| PUT    | /api/notifications/:id/read      | Yes   | Mark as read          |
| PUT    | /api/notifications/read-all      | Yes   | Mark all as read      |

#### Activity Logs
| Method | Endpoint                    | Auth  | Description           |
|--------|-----------------------------|-------|-----------------------|
| GET    | /api/activity-logs          | Yes   | List activity logs    |
| GET    | /api/tasks/:id/activity     | Yes   | Task activity logs    |

#### Users (Admin Only)
| Method | Endpoint                    | Auth  | Description           |
|--------|-----------------------------|-------|-----------------------|
| GET    | /api/users                  | Admin | List users            |
| POST   | /api/users                  | Admin | Create user           |
| GET    | /api/users/:id              | Admin | Get user              |
| PUT    | /api/users/:id              | Admin | Update user           |
| DELETE | /api/users/:id              | Admin | Delete user           |

---

### 9. Security Features

- Password hashing (bcrypt)
- JWT authentication with token refresh
- Role-based authorization (admin middleware)
- API route protection (auth:api middleware)
- File upload validation (type & size — 50MB limit)
- Input validation & sanitization on all endpoints
- CORS configuration (allowed origins)
- Automatic 401 redirect on token expiration

---

### 10. Development Roadmap

#### Phase 1 - Foundation (Completed)
- Authentication (Register, Login, Logout, JWT)
- User Management (Admin CRUD)
- Task CRUD with Rich Text Editor
- Drag & Drop Kanban Board (@dnd-kit)
- File Upload with Image Preview

#### Phase 2 - Enhancement (Completed)
- Dark Mode / Light Mode Toggle
- User Profile Page with Avatar & Status
- Notifications System
- Activity Logs
- Search & Filters on Kanban Board
- Comments on Tasks
- Premium UI with Animations
- Database Seeder with Dummy Data

#### Phase 3 - Advanced (Planned)
- Chat / Messaging
- Reports & Analytics
- Teams & Workspaces
- Calendar View
- List View

---

### 11. Color Palette

#### Primary Colors (from brand logo)

| Name            | Hex       | RGB              | Usage                              |
|-----------------|-----------|------------------|------------------------------------|
| Brand Orange    | `#F5A623` | rgb(245, 166, 35)| Primary buttons, headings, accents |
| Brand Green     | `#2ECC71` | rgb(46, 204, 113)| Success states, CTA, highlights    |

#### UI Colors

| Name            | Hex       | RGB               | Usage                              |
|-----------------|-----------|-------------------|------------------------------------|
| Dark BG         | `#0F172A` | rgb(15, 23, 42)   | Sidebar, dark mode background      |
| Card BG         | `#1E293B` | rgb(30, 41, 59)   | Cards, panels (dark mode)          |
| Light BG        | `#F8FAFC` | rgb(248, 250, 252)| Page background (light mode)       |
| White           | `#FFFFFF` | rgb(255, 255, 255)| Cards, modals (light mode)         |

#### Text Colors

| Name            | Hex       | RGB               | Usage                              |
|-----------------|-----------|-------------------|------------------------------------|
| Text Primary    | `#0F172A` | rgb(15, 23, 42)   | Headings, body text (light mode)   |
| Text Secondary  | `#64748B` | rgb(100, 116, 139)| Subtitles, labels, placeholders    |
| Text Light      | `#F1F5F9` | rgb(241, 245, 249)| Body text (dark mode)              |

#### Status / Priority Colors

| Name            | Hex       | RGB               | Usage                              |
|-----------------|-----------|-------------------|------------------------------------|
| Backlog         | `#94A3B8` | rgb(148, 163, 184)| Backlog column                     |
| To Do           | `#3B82F6` | rgb(59, 130, 246) | To Do column                       |
| In Progress     | `#F5A623` | rgb(245, 166, 35) | In Progress column (brand orange)  |
| Review          | `#A855F7` | rgb(168, 85, 247) | Review column                      |
| Complete        | `#2ECC71` | rgb(46, 204, 113) | Complete column (brand green)      |

#### Priority Badge Colors

| Name            | Hex       | RGB               | Usage                              |
|-----------------|-----------|-------------------|------------------------------------|
| Low             | `#22D3EE` | rgb(34, 211, 238) | Low priority badge                 |
| Medium          | `#F5A623` | rgb(245, 166, 35) | Medium priority badge              |
| High            | `#F97316` | rgb(249, 115, 22) | High priority badge                |
| Urgent          | `#EF4444` | rgb(239, 68, 68)  | Urgent priority badge              |

#### User Status Colors

| Name            | Hex       | Usage                              |
|-----------------|-----------|------------------------------------|
| Working         | `#22c55e` | Green — actively working           |
| Busy            | `#ef4444` | Red — do not disturb               |
| In Meeting      | `#f59e0b` | Amber — in a meeting               |
| Vacation        | `#3b82f6` | Blue — on vacation                 |
| Offline         | `#94a3b8` | Gray — offline (default)           |

#### Tailwind CSS v4 Theme Reference

```css
@theme {
  --color-brand-50: #FFF8E1;
  --color-brand-100: #FFECB3;
  --color-brand-200: #FFE082;
  --color-brand-300: #FFD54F;
  --color-brand-400: #FFCA28;
  --color-brand-500: #F5A623;
  --color-brand-600: #E69500;
  --color-brand-700: #CC8400;
  --color-brand-800: #B37300;
  --color-brand-900: #8B5A00;
  --color-brand-950: #5C3D00;
}
```

---

### 12. Default Accounts (Seeded)

| Email                | Password    | Role  | Status     |
|----------------------|-------------|-------|------------|
| admin@sklentr.com    | admin123    | Admin | working    |
| sarah@sklentr.com    | password123 | User  | working    |
| marcus@sklentr.com   | password123 | User  | busy       |
| emily@sklentr.com    | password123 | User  | in_meeting |
| david@sklentr.com    | password123 | User  | vacation   |
| olivia@sklentr.com   | password123 | User  | offline    |

---

### 13. Required Skills

- HTML, CSS, JavaScript, TypeScript
- React.js (Hooks, Context API, React Router)
- Tailwind CSS v4 (with @theme blocks)
- shadcn/ui Component Library
- @dnd-kit (Drag & Drop)
- Tiptap (Rich Text Editor)
- Laravel REST API (Controllers, Middleware, Eloquent ORM)
- MySQL Database Design
- JWT Authentication
- Git & Version Control

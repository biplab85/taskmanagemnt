# SKLENTR Task Management System — Future Enhancement Plan

---

## 1. New Feature Ideas

### Task Management
- **Subtasks / Checklists** — Allow tasks to have nested subtasks with their own status and assignees, enabling breakdown of large tasks into smaller actionable items
- **Task Dependencies** — Define "blocked by" and "blocks" relationships between tasks so teams can visualize critical paths and avoid working on blocked items
- **Recurring Tasks** — Allow tasks to auto-generate on a schedule (daily, weekly, monthly) for repetitive work like standups, reports, or maintenance
- **Task Templates** — Save common task configurations (title patterns, default assignees, priority, description) as reusable templates to speed up creation
- **Time Tracking** — Add start/stop timer per task with logged time entries, enabling workload analysis and billing
- **Task Labels / Tags** — User-defined colored labels (e.g., "bug", "feature", "design") for cross-cutting categorization beyond status and priority
- **Task Duplication** — One-click clone of an existing task with all its details (minus comments/attachments)
- **Bulk Actions** — Select multiple tasks and apply batch operations: change status, reassign, change priority, delete
- **Task Archiving** — Move completed tasks to an archive instead of permanent deletion, preserving history without cluttering active views

### Collaboration
- **@Mentions in Comments** — Tag users with `@name` in comments to notify them directly and link to their profile
- **Comment Reactions** — Quick emoji reactions on comments (thumbs up, heart, etc.) to reduce noise from "agreed" replies
- **Comment Editing** — Allow users to edit their own comments within a time window, with an "edited" indicator
- **Real-Time Updates (WebSockets)** — Push task changes, new comments, and notifications to all connected users instantly instead of polling every 15 seconds
- **Task Watchers** — Allow users to "watch" tasks they aren't assigned to, receiving notifications on updates
- **Shared Task Filters** — Save and share filter presets (e.g., "My Urgent Tasks", "Overdue This Week") across the team

### User & Team Management
- **Teams / Groups** — Organize users into teams (e.g., "Frontend", "Design") and assign tasks to entire teams
- **Role-Based Permissions (RBAC)** — Expand beyond admin/user to support custom roles (e.g., Project Manager, Viewer, Contributor) with granular permissions — the `Permission` model already exists but is unused
- **User Onboarding Flow** — Guided wizard for new users to complete their profile, set preferences, and understand the tool
- **User Deactivation** — Soft-disable accounts instead of hard deletion, preserving task history and audit trails

---

## 2. UI / UX Enhancement Suggestions

### Navigation & Layout
- **Global Search (Cmd+K)** — A spotlight-style search bar that searches across tasks, users, comments, and attachments from anywhere in the app
- **Breadcrumbs** — Show navigation context (e.g., Dashboard > Kanban > Task #42) for easier orientation
- **Keyboard Shortcuts** — Power-user shortcuts for common actions: `N` for new task, `F` for filter, arrow keys for kanban navigation
- **Mobile Responsive Kanban** — The board view is difficult on small screens; consider a swipeable single-column mobile layout
- **Drag-and-Drop Between Views** — Allow changing task priority or assignee via drag in List/Table views, not just Board view

### Task Interaction
- **Inline Task Editing on Board** — Quick-edit title and priority directly on the card without opening the modal
- **Due Date Visual Indicators** — Color-code or add warning icons for tasks approaching their deadline (yellow for <2 days, red for overdue)
- **Task Progress Indicator** — If subtasks are added, show a mini progress bar on the card (e.g., "3/5 done")
- **Empty State Illustrations** — Replace blank areas (no tasks, no notifications, no activity) with helpful illustrations and calls-to-action
- **Skeleton Loading States** — Use shimmer/skeleton placeholders instead of spinners for smoother perceived loading

### Profile & Settings
- **Profile Banner Sync** — Currently banner customization is localStorage-only; persist it to the server so it follows the user across devices
- **Avatar Cropping** — Add an image crop/resize tool when uploading avatars instead of using raw uploads
- **Settings Export/Import** — Allow exporting app settings (theme, font, brand color) as JSON for backup or sharing across instances

---

## 3. Performance & Scalability Improvements

### API & Data
- **Pagination** — Neither tasks, users, activity logs, nor notifications use pagination. As data grows, these endpoints will become slow. Add cursor-based or offset pagination with infinite scroll on the frontend
- **Database Indexing** — Add indexes on frequently queried columns: `tasks.status`, `tasks.priority`, `tasks.created_by`, `task_user.user_id`, `notifications.user_id + is_read`, `activity_logs.task_id`
- **API Response Caching** — Cache expensive queries (dashboard stats, user lists) with short TTLs using Laravel's cache system
- **Lazy Loading Relations** — Several endpoints eager-load relationships that aren't always needed. Use conditional `?include=comments,attachments` query parameters
- **Debounced Search** — The frontend debounces search input, but the backend processes every request. Add server-side request throttling for search endpoints
- **Consolidate Notification Polling** — The Sidebar and Header both poll `/notifications/unread-count` independently every 15 seconds (2 duplicate calls). Consolidate into a single shared poll or move to WebSockets
- **File Storage Migration** — Move from local `public` disk to cloud storage (S3, R2, etc.) for production scalability, CDN delivery, and backup resilience

### Frontend
- **React Error Boundaries** — No error boundaries exist. Add them around major sections (Kanban, Dashboard, Profile) to prevent full-page crashes from component errors
- **Virtual Scrolling** — For large task lists (Table view, List view), use virtualized rendering (e.g., `@tanstack/virtual`) to handle thousands of tasks without DOM bloat
- **Code Splitting** — The Calendar, Table, Grid, and List views are all loaded even when only one is active. Lazy-load inactive view components
- **Image Optimization** — Use Next.js `<Image>` component for avatars and attachments to benefit from automatic resizing, lazy loading, and format optimization
- **Remove `force-dynamic`** — The root layout forces all pages to be dynamically rendered, disabling Next.js static optimization entirely. Pages like Login and the app shell could benefit from static generation

---

## 4. Security & Admin Feature Ideas

### Authentication & Authorization
- **Rate Limiting on Login** — No brute-force protection exists on the login endpoint. Add progressive delays or lockout after failed attempts
- **Task-Level Authorization** — Currently any authenticated user can update or delete ANY task. Implement ownership/assignee checks so users can only modify tasks they created or are assigned to
- **Attachment Deletion Authorization** — Any user can delete any attachment. Restrict to the uploader or an admin
- **Impersonation Audit Trail** — Admin impersonation creates a real JWT with no distinguishing markers. Add an audit log entry, session flag, and visible "Impersonating [User]" banner with a "Return to Admin" button
- **Two-Factor Authentication (2FA)** — Add optional TOTP-based 2FA for admin accounts or all users
- **Session Management** — Allow users to view active sessions and revoke tokens from other devices
- **Password Policy Enforcement** — Enforce minimum complexity (length, special chars) on all password fields, not just the profile change flow
- **Email Verification** — The `email_verified_at` column exists but is never used. Implement verification on account creation

### Data Safety
- **Soft Deletes** — Tasks, users, comments, and attachments all use hard deletes with no recovery. Implement Laravel's `SoftDeletes` trait for a "trash" system with 30-day recovery
- **XSS Sanitization** — Task descriptions (Tiptap HTML) are rendered via `dangerouslySetInnerHTML` in multiple components with no sanitization. Add a library like DOMPurify to sanitize HTML before rendering
- **CORS Production Configuration** — Currently only `localhost:5173` is whitelisted. Add environment-based CORS origin configuration for staging/production
- **Audit Log for Admin Actions** — Log all admin operations (user creation/deletion, role changes, impersonation, column changes) separately from task activity logs
- **Input Validation Hardening** — Move inline `Validator::make()` calls to dedicated Form Request classes for consistency and reusability
- **JWT Secret Rotation** — Implement a mechanism for rotating the JWT secret without invalidating all sessions simultaneously

---

## 5. Reporting & Analytics Ideas

### Dashboards & Charts
- **Task Completion Trends** — Line chart showing tasks completed over time (daily/weekly/monthly) to visualize team velocity
- **Status Distribution Chart** — Pie or donut chart showing current task breakdown by status
- **Priority Distribution** — Bar chart showing task count per priority level, highlighting if urgent tasks are piling up
- **Team Workload View** — Bar chart showing tasks assigned per user, helping managers balance workload and spot bottlenecks
- **Overdue Tasks Report** — Dedicated view listing all tasks past their due date, sorted by how overdue they are
- **Average Cycle Time** — Track how long tasks spend in each status column (e.g., average time in "In Progress" before moving to "Review")
- **User Activity Heatmap** — Calendar heatmap (like GitHub contributions) showing each user's daily activity intensity

### Export & Sharing
- **Export to CSV/PDF** — Export task lists, filtered views, or reports as CSV for spreadsheets or PDF for stakeholder sharing
- **Scheduled Reports** — Automatic weekly/monthly email summaries with key metrics (tasks completed, overdue count, team activity)
- **Printable Task View** — Print-friendly layout for individual tasks or task lists for offline reference

---

## 6. Productivity & Business Value Ideas

### Workflow Automation
- **Auto-Assignment Rules** — Define rules like "all urgent tasks go to [user]" or "tasks with label 'design' auto-assign to Design team"
- **Status Change Triggers** — Automate actions on status transitions: e.g., moving to "Complete" sends a summary notification, moving to "Review" assigns the reviewer
- **Due Date Reminders** — Automated notifications at configurable intervals before a task's due date (1 day, 3 days, 1 week)
- **Overdue Escalation** — Auto-escalate overdue tasks by increasing priority or notifying the admin

### Integrations
- **Email Notifications** — Currently notifications are in-app only. Add email delivery (configurable per-user) for critical events using Laravel's Mail/Queue system
- **Slack / Discord Webhooks** — Post task updates to team channels for visibility without opening the app
- **Calendar Sync (iCal)** — Export task due dates as an iCal feed that users can subscribe to in Google Calendar or Outlook
- **File Preview** — Preview common attachment types (images, PDFs) inline instead of requiring download

### Project Organization
- **Projects / Workspaces** — Group tasks under projects, each with its own kanban board, members, and settings — enabling multi-project management
- **Milestones** — Group tasks into milestones with target dates and progress tracking for release planning
- **Custom Fields** — Allow admins to define custom task fields (dropdown, text, number, date) per project for domain-specific tracking
- **Custom Priority Levels** — Allow admins to define custom priority levels beyond the fixed 4, similar to how kanban columns are already customizable

---

## 7. Technical Debt to Address Before Scaling

These are not feature requests but foundational items to resolve before building new features:

- **Missing database migrations** — Core tables (tasks, comments, attachments, notifications, activity_logs, permissions) have no Laravel migration files, making fresh installs impossible via `php artisan migrate`
- **Stale database seeder** — References the removed `assigned_to` column and would fail on a fresh database
- **CommentController bug** — References `$task->assigned_to` (removed) instead of `$task->assignees`, causing comment notifications to not reach assignees
- **Unused code cleanup** — `Permission` model (no routes/controller), `AppLayout` component (replaced by protected layout), `TaskDetail` component (replaced by TaskDrawer), `next-themes` package (replaced by custom ThemeContext), hardcoded `TASK_STATUSES` constant (replaced by KanbanColumnsContext)

---

*This document is intended as a roadmap discussion starter. Each item should be evaluated for business priority, user impact, and development effort before implementation.*

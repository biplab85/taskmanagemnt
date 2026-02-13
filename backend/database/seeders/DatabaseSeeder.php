<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Task;
use App\Models\Comment;
use App\Models\ActivityLog;
use App\Models\Notification;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create users (admin already exists from SQL seed)
        $users = [];

        // Check if admin exists, if not create
        $admin = User::where('email', 'admin@sklentr.com')->first();
        if (!$admin) {
            $admin = User::create([
                'name' => 'Admin',
                'email' => 'admin@sklentr.com',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'can_view_all_tasks' => true,
                'status' => 'working',
            ]);
        } else {
            $admin->update(['status' => 'working']);
        }
        $users[] = $admin;

        $dummyUsers = [
            ['name' => 'Sarah Chen', 'email' => 'sarah@sklentr.com', 'status' => 'working'],
            ['name' => 'Marcus Johnson', 'email' => 'marcus@sklentr.com', 'status' => 'busy'],
            ['name' => 'Emily Rodriguez', 'email' => 'emily@sklentr.com', 'status' => 'in_meeting'],
            ['name' => 'David Kim', 'email' => 'david@sklentr.com', 'status' => 'working'],
            ['name' => 'Olivia Patel', 'email' => 'olivia@sklentr.com', 'status' => 'vacation'],
        ];

        foreach ($dummyUsers as $userData) {
            $user = User::firstOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => Hash::make('password123'),
                    'role' => 'user',
                    'can_view_all_tasks' => false,
                    'status' => $userData['status'],
                ]
            );
            $users[] = $user;
        }

        $allUserIds = collect($users)->pluck('id')->toArray();

        // Create tasks across all statuses
        $tasks = [
            // Backlog
            ['title' => 'Research competitor pricing models', 'description' => '<p>Analyze pricing strategies of top 5 competitors and create a comparison matrix.</p><ul><li>Identify key competitors</li><li>Document pricing tiers</li><li>Create comparison spreadsheet</li></ul>', 'status' => 'backlog', 'priority' => 'low', 'position' => 0],
            ['title' => 'Design email newsletter template', 'description' => '<p>Create a responsive email template for monthly newsletters with the new brand guidelines.</p>', 'status' => 'backlog', 'priority' => 'medium', 'position' => 1],
            ['title' => 'Set up CI/CD pipeline', 'description' => '<p>Configure GitHub Actions for automated testing and deployment.</p><ul><li>Unit tests</li><li>Integration tests</li><li>Auto-deploy to staging</li></ul>', 'status' => 'backlog', 'priority' => 'high', 'position' => 2],
            ['title' => 'Write API documentation', 'description' => '<p>Document all REST API endpoints using OpenAPI/Swagger specification.</p>', 'status' => 'backlog', 'priority' => 'medium', 'position' => 3],

            // To Do
            ['title' => 'Implement user onboarding flow', 'description' => '<p>Create a step-by-step onboarding wizard for new users including:</p><ul><li>Welcome screen</li><li>Profile setup</li><li>Team invitation</li><li>Quick tour</li></ul>', 'status' => 'todo', 'priority' => 'high', 'position' => 0],
            ['title' => 'Add export to CSV feature', 'description' => '<p>Allow users to export task lists and reports as CSV files.</p>', 'status' => 'todo', 'priority' => 'medium', 'position' => 1],
            ['title' => 'Create mobile responsive layouts', 'description' => '<p>Ensure all pages work properly on mobile devices (320px - 768px).</p>', 'status' => 'todo', 'priority' => 'urgent', 'position' => 2],
            ['title' => 'Set up error tracking with Sentry', 'description' => '<p>Integrate Sentry for real-time error monitoring in both frontend and backend.</p>', 'status' => 'todo', 'priority' => 'high', 'position' => 3],

            // In Progress
            ['title' => 'Build notification system', 'description' => '<p>Implement real-time notifications for task assignments, comments, and status changes.</p><ul><li>In-app notifications</li><li>Email notifications (optional)</li><li>Notification preferences</li></ul>', 'status' => 'in_progress', 'priority' => 'high', 'position' => 0],
            ['title' => 'Redesign dashboard analytics', 'description' => '<p>Create new dashboard with charts showing task completion rates, team productivity, and project timelines.</p>', 'status' => 'in_progress', 'priority' => 'medium', 'position' => 1],
            ['title' => 'Implement file preview system', 'description' => '<p>Add inline preview for images, PDFs, and other common file types in task attachments.</p>', 'status' => 'in_progress', 'priority' => 'medium', 'position' => 2],
            ['title' => 'Optimize database queries', 'description' => '<p>Profile and optimize slow database queries. Add proper indexing and eager loading.</p>', 'status' => 'in_progress', 'priority' => 'urgent', 'position' => 3],

            // Review
            ['title' => 'User authentication security audit', 'description' => '<p>Review JWT implementation, password hashing, and CORS configuration for security vulnerabilities.</p>', 'status' => 'review', 'priority' => 'urgent', 'position' => 0],
            ['title' => 'Landing page redesign', 'description' => '<p>New landing page with hero section, features showcase, testimonials, and CTA.</p>', 'status' => 'review', 'priority' => 'medium', 'position' => 1],
            ['title' => 'Team collaboration features', 'description' => '<p>Add @mentions in comments, shared task views, and team activity feeds.</p>', 'status' => 'review', 'priority' => 'high', 'position' => 2],

            // Complete
            ['title' => 'Set up project repository', 'description' => '<p>Initialize Git repository with proper branching strategy, README, and contributing guidelines.</p>', 'status' => 'complete', 'priority' => 'high', 'position' => 0],
            ['title' => 'Design system color palette', 'description' => '<p>Define brand colors, typography scale, and spacing system for the entire application.</p>', 'status' => 'complete', 'priority' => 'medium', 'position' => 1],
            ['title' => 'Database schema design', 'description' => '<p>Design and implement the complete database schema with proper relationships and indexes.</p>', 'status' => 'complete', 'priority' => 'high', 'position' => 2],
            ['title' => 'User registration and login', 'description' => '<p>Implement JWT-based authentication with registration, login, logout, and token refresh.</p>', 'status' => 'complete', 'priority' => 'urgent', 'position' => 3],
            ['title' => 'Basic CRUD operations for tasks', 'description' => '<p>Implement create, read, update, and delete operations for tasks with proper validation.</p>', 'status' => 'complete', 'priority' => 'high', 'position' => 4],
        ];

        foreach ($tasks as $i => $taskData) {
            $task = Task::create([
                'title' => $taskData['title'],
                'description' => $taskData['description'],
                'status' => $taskData['status'],
                'priority' => $taskData['priority'],
                'assigned_to' => $allUserIds[$i % count($allUserIds)],
                'created_by' => $admin->id,
                'position' => $taskData['position'],
                'start_date' => now()->subDays(rand(1, 30))->format('Y-m-d'),
                'end_date' => now()->addDays(rand(1, 30))->format('Y-m-d'),
            ]);

            // Add comments to some tasks
            if ($i % 3 === 0) {
                $commenter = $users[array_rand($users)];
                Comment::create([
                    'task_id' => $task->id,
                    'user_id' => $commenter->id,
                    'body' => 'Great progress on this! Let me know if you need any help.',
                ]);
                Comment::create([
                    'task_id' => $task->id,
                    'user_id' => $admin->id,
                    'body' => 'Thanks for the update. Please prioritize the core functionality first.',
                ]);
            }

            // Activity log
            ActivityLog::create([
                'user_id' => $admin->id,
                'task_id' => $task->id,
                'action' => 'created',
                'description' => 'Created task "' . $task->title . '"',
            ]);
        }

        // Create some notifications
        foreach ($users as $user) {
            if ($user->id === $admin->id) continue;
            Notification::create([
                'user_id' => $user->id,
                'title' => 'Welcome to SKLENTR!',
                'message' => 'Your account has been created. Start by exploring the dashboard.',
                'type' => 'info',
                'is_read' => false,
            ]);
            Notification::create([
                'user_id' => $user->id,
                'title' => 'Task Assigned',
                'message' => 'Admin assigned you a new task. Check your Kanban board.',
                'type' => 'task_assigned',
                'is_read' => false,
            ]);
        }
    }
}

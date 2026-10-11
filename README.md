# FocusLab

**Experiment with your focus.**

FocusLab is a calm,productivity app for students and self learners. Plan your day, run focus sessions, and watch a small garden grow as you build consistent habits. It is part task manager, part Pomodoro timer, and part personal lab where you can test what actually helps you concentrate.

**Live app:** https://myfocuslab.netlify.app

---

## Why FocusLab

Most productivity tools measure how much you do. FocusLab is built around how you work. Every session you finish adds to your streak, your XP and your garden, so progress feels visible even on slow days. Built in experiments let you compare session lengths using your own data, rather than trusting generic advice.

The core loop:

```
Create a task -> add it to Today -> start a focus session -> finish the timer
-> session is saved -> earn XP -> complete the task -> your garden grows
-> streaks, goals and insights update -> achievements unlock
```

## Features

### Focus Timer
- Pomodoro timer with focus, short break and long break modes
- Start, pause, resume, reset and skip controls
- Durations and long-break cycle are customizable in Settings
- Accurate even when the tab is in the background
- Link each session to a task, then rate how focused you felt (1 to 5)
- Sessions are saved only when the timer completes

### Task Management
- Create, edit, delete and complete tasks, stored securely per user
- Priority (low, medium, high), due date, estimated sessions and description
- "Today" planning with automatic roll-over of unfinished tasks
- Filters for active, today, completed and all tasks
- Live updates across tabs and devices

### XP, Streaks and Daily Goals

| Action | Reward |
| --- | --- |
| Completed focus session | +10 XP |
| Completed task (first time only) | +20 XP |
| Daily focus goal reached | +25 XP |

Streaks are calculated from your real completed sessions. Set your own daily focus goal in minutes.

### The Garden
Your plant grows with your total XP, from a seed to full bloom.

`Seed` -> `Sprout` -> `Growing Plant` -> `Mature Plant` -> `Bloom`

### The Lab
- **Garden:** your current stage, progress to the next one, and plants bloomed
- **Experiments:** compare 25 vs 50 minute sessions, or design your own test with a hypothesis, two session lengths and a written conclusion
- **Progress:** lifetime totals, completion rates, longest streak and a 30-day focus chart

### Insights and Achievements
- Weekly focus chart, time-of-day breakdown, task completion rate and average focus rating
- 14 achievements that unlock automatically, such as First Focus, Task Finisher, Consistent, Week Warrior and In Bloom

### Settings
- Profile and password management
- Timer and goal preferences
- Light and dark themes

### Admin Panel
A built-in control panel for platform oversight, visible only to administrators:
- Platform-wide statistics: users, total focus hours, active tasks and completed sessions
- User management: search, change roles and delete accounts
- Live activity log of signups, focus sessions, task completions, achievements and admin actions, with filtering and pagination
- Announcement banner that broadcasts a message to every signed-in user

## Design

FocusLab aims to feel clean, academic and calm. Cream and sage backgrounds, deep forest greens, an editorial serif for headings, and line icons throughout.The interface is fully responsive and supports a dark mode.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS and vanilla JavaScript (no framework) |
| Backend | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Security | Row Level Security (RLS) |
| Realtime | Supabase Realtime |
| Hosting | Netlify |
| Fonts and icons | Newsreader and Inter, inline SVG line icons |

The codebase is intentionally small and readable: plain files, no build step for the app, and a shared helper module (`js/app.js`) used by every page.

## Security and Privacy

Your data belongs to you, and the database enforces it.

- Row Level Security is enabled on every table. Users can only read and write their own tasks, sessions, goals, settings and achievements.
- Roles cannot be self-assigned. A database trigger blocks users from changing their own role.
- XP cannot be edited directly. It is added only through a server-side function with a per-call limit.
- Admin features are checked inside the database, so they are refused for non-admins even if the endpoints are called directly.
- Activity logs cannot be edited by anyone. Only admins can read all entries.
- Only the public anon key is used in the browser. No secret keys are exposed.

## Project Structure

```
focuslab/
├── index.html, login.html, signup.html     public pages
├── dashboard.html, timer.html, tasks.html  core app
├── lab.html, garden.html, experiments.html, progress.html
├── insights.html, achievements.html, settings.html
├── admin.html                              administrators only
├── css/                                    design tokens, layout and per-page styles
├── js/                                     one script per page plus shared helpers
├── assets/                                 logo
└── supabase/schema.sql                     tables, security policies and functions
```

## Database

Ten core tables: `profiles`, `tasks`, `focus_sessions`, `daily_goals`, `garden_progress`, `achievements`, `user_achievements`, `user_settings`, `experiments` and `activity_logs`, plus `announcements` for the admin banner. All use UUID keys with foreign-key relations and cascading deletes, so removing a user removes their data.


## Author

Built by **Sadhvi Shastry**.

## License

All rights reserved. Please contact the author before reusing the code or design.

# FocusLab

**Experiment with your focus.**

FocusLab is a productivity and focus-tracking web app: tasks, a Pomodoro timer, XP, streaks, a growing garden, focus experiments, insights, achievements, and an Admin Panel with an activity log.

- **Frontend:** plain HTML, CSS and vanilla JavaScript (no framework, no build step for the app itself)
- **Backend:** Supabase (PostgreSQL, Authentication, Row Level Security, Realtime)
- **Hosting:** Netlify (static site)

## How it works

```
Create task -> add to Today -> start focus session -> timer completes -> session saved
-> +10 XP -> complete task -> +20 XP -> garden grows -> streak / goals / insights update
-> achievements unlock
```

| Action | Reward |
| --- | --- |
| Completed focus session | +10 XP |
| Completed task (first time only) | +20 XP |
| Daily focus goal reached | +25 XP |

Garden stages by total XP: Seed (0), Sprout (50), Growing Plant (150), Mature Plant (300), Bloom (500).

## Project structure

```
focuslab/
├── index.html  login.html  signup.html
├── dashboard.html  timer.html  tasks.html
├── lab.html  garden.html  experiments.html  progress.html
├── insights.html  achievements.html  settings.html  admin.html
├── css/   style.css  responsive.css  auth.css  landing.css  dashboard.css
│          timer.css  tasks.css  lab.css  admin.css
├── js/    config.js  supabase.js  app.js  auth.js  dashboard.js  timer.js  tasks.js
│          lab.js  garden.js  experiments.js  progress.js  insights.js
│          achievements.js  settings.js  admin.js
├── assets/logo.svg
├── supabase/schema.sql
├── build.js          (writes js/config.js from Netlify environment variables)
├── netlify.toml
└── README.md
```

`js/app.js` holds the shared helpers (page shell/sidebar, XP, streaks, achievements, icons, plant drawings). Each page has its own small script.

## 1. Set up Supabase

1. Create a free project at <https://supabase.com>.
2. Open **SQL Editor -> New query**, paste the whole of `supabase/schema.sql`, and click **Run**. This creates all tables, security policies, helper functions, realtime settings and the achievement list.
3. Open **Project Settings -> API** and copy:
   - **Project URL** (this is `SUPABASE_URL`)
   - **anon public key** (this is `SUPABASE_ANON_KEY`)
4. Open **Authentication -> Providers -> Email**. While testing you can turn **Confirm email** off so new accounts can log in immediately. If you leave it on, new users must click the email link first.
5. Open **Authentication -> URL Configuration** and set **Site URL** to your Netlify address once you have it (also add `http://localhost:8000` for local testing).

> Only ever use the **anon** key in this project. Never put the `service_role` key in front-end code. The anon key is meant to be public: your data is protected by Row Level Security.

## 2. Run locally

Put your keys into `js/config.js`:

```js
window.FOCUSLAB_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key"
};
```

Then serve the folder with any static server, for example:

```bash
cd focuslab
python3 -m http.server 8000
# open http://localhost:8000
```

(Open it through `http://`, not by double-clicking the file, so login works.)

Do not commit your real keys if you prefer to keep them out of GitHub. The Netlify build below replaces the file for you, so you can commit the placeholder version.

## 3. Make yourself an admin

1. Sign up in the app with your own email.
2. In Supabase **SQL Editor**, run:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

3. Refresh the app. An **Admin Panel** link appears in the sidebar.

From the Admin Panel you can see platform stats, search users, change roles, delete users, read the global activity log, and publish a banner message that appears for every logged-in user.

## 4. Deploy to Netlify

1. Push the `focuslab` folder to a GitHub repository.
2. In Netlify choose **Add new site -> Import an existing project** and pick the repository.
3. Build settings are read from `netlify.toml`:
   - Build command: `node build.js`
   - Publish directory: `.`
4. Before deploying, open **Site configuration -> Environment variables** and add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
5. Click **Deploy**. During the build, `build.js` writes `js/config.js` from those variables. If either variable is missing, the build fails with a clear message.
6. Copy your Netlify URL into Supabase **Authentication -> URL Configuration -> Site URL**.

## Security model (Row Level Security)

All tables have RLS turned on, enforced by the database, not by the browser:

- **Private user data** (`tasks`, `focus_sessions`, `daily_goals`, `garden_progress`, `experiments`, `user_settings`, `user_achievements`): a user can only read and write rows where `user_id` is their own id.
- **`profiles`:** a user can read and update only their own row. A database trigger stops users from changing their own `role`, and from changing `xp` directly. XP is added only through the `add_xp()` function (max 50 per call).
- **`activity_logs`:** users can add and read their own events. Admins can read everything and delete entries. Nobody can edit entries.
- **`achievements`:** readable by everyone signed in, changeable only by admins.
- **`announcements`:** everyone reads the active one, only admins can create or change them.
- **Admin functions** (`admin_stats()`, `admin_delete_user()`) check `is_admin()` inside the database and refuse anyone else, even if they call the endpoint directly.

The schema was tested on PostgreSQL by simulating a normal user and an admin: a user could not promote themselves, edit their XP, read another user's tasks, write logs for someone else, call admin functions or change announcements, while an admin could do all of these.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Yellow "Supabase is not configured" bar | Fill in `js/config.js` (local) or the Netlify environment variables (deployed). |
| "Profile not found" after login | `schema.sql` was run after you signed up. Re-run the backfill part (section 6 of the file), or sign up again. |
| Cannot log in after signup | Email confirmation is on. Click the link in the email, or turn **Confirm email** off while testing. |
| Admin link missing | Run the `update public.profiles set role = 'admin' ...` query with the exact email you signed up with, then reload. |
| Tasks do not update live | Check the three `alter publication supabase_realtime add table ...` lines in `schema.sql` ran without error. |
| Re-running `schema.sql` errors | It is meant to run once on a fresh project. To reset, drop the `public` tables first. |

## Known limits

- The **Pro plan** on the landing page is a design placeholder: there is no payment system, and the free plan's "3 sessions/day" limit is not enforced. Remove or build these before launch.
- A focus session is saved only when the timer finishes. Reloading the page during a session resets that timer.
- "Today" tasks are those planned for today, plus unfinished ones planned for earlier days.

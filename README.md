# Collaborative Study Room Platform

A realtime study room platform for focused group study sessions. Users can sign up, create or join virtual rooms, chat with members, track online presence, run a synced Pomodoro timer, and review their study history from a personal dashboard.

[Live Demo](YOUR_DEPLOYED_URL)

## Features

- Email and password authentication with protected routes
- Supabase profile creation for each user
- Public and private study rooms
- Browse, create, join, leave, and invite users to rooms
- Shareable invite links with automatic room joining
- Realtime room chat powered by Supabase Realtime
- Online presence indicators for room members
- Synced Pomodoro timer with 25 minute work and 5 minute break cycles
- Creator-only timer controls for Start, Pause, and Stop
- Study session tracking with participants and durations
- Dashboard with total study hours, weekly sessions, rooms joined, and recent sessions
- Bonus room leaderboard ranking the top studiers by total study time

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- Supabase Auth
- Supabase PostgreSQL
- Supabase Realtime
- Vercel deployment target

## Setup

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the SQL in `supabase/schema.sql` inside your Supabase SQL Editor.
5. Start the development server:

```bash
npm run dev
```

6. Open `http://localhost:3000`.

## Screenshots

Screenshots for authentication, room management, realtime chat, synced Pomodoro sessions, dashboard analytics, and leaderboard views will be added here.

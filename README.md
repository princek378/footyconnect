# FootyConnect ⚽

A beautiful, modern football / soccer squad management web app.

**Features**
- Player signup & login
- Player profiles: height, weight, strong foot, position, playing style
- Admin panel to edit every player's info + promote admins
- Recent match stats (date, ratings, goals, assists)
- Squad list of all registered players
- Real-time group chat with **text + voice notes**
- Admin participates in the same chat
- Premium dark UI with glassmorphism, pitch-green accents, smooth animations

---

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** – fully custom design system
- **Supabase** (PostgreSQL + Auth + Realtime + Storage)

---

## 1. Local Setup

### Prerequisites
- Node.js 18+
- A free Supabase project (https://supabase.com)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Create your .env.local
cp .env.example .env.local
```

### Supabase Setup (required)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Wait for the project to be ready
3. Go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Paste them into `.env.local`

### Create the database tables

Go to **SQL Editor** in Supabase and run this entire script:

```sql
-- Players table
create table if not exists players (
  uid text primary key,
  email text not null,
  "displayName" text not null,
  height integer default 175,
  weight integer default 70,
  "strongFoot" text default 'Right',
  position text default 'MID',
  "playingStyle" text default 'All-Rounder',
  "isAdmin" boolean default false,
  "createdAt" bigint,
  "updatedAt" bigint
);

-- Matches table
create table if not exists matches (
  id text primary key,
  date text not null,
  opponent text not null,
  "homeScore" integer default 0,
  "awayScore" integer default 0,
  "isHome" boolean default true,
  "playerStats" jsonb default '[]',
  "createdAt" bigint
);

-- Messages table
create table if not exists messages (
  id text primary key,
  "senderId" text not null,
  "senderName" text not null,
  type text default 'text',
  content text not null,
  duration integer,
  "createdAt" bigint,
  "isAdmin" boolean default false
);

-- Enable Realtime for chat and live updates
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table messages;

-- Storage bucket for voice notes
insert into storage.buckets (id, name, public) values ('voice-notes', 'voice-notes', true);

-- Basic RLS policies (open for development – tighten for production)
alter table players enable row level security;
alter table matches enable row level security;
alter table messages enable row level security;

create policy "Allow all for authenticated users - players"
  on players for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Allow all for authenticated users - matches"
  on matches for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Allow all for authenticated users - messages"
  on messages for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Storage policy for voice notes
create policy "Allow authenticated uploads"
  on storage.objects for insert
  with check (bucket_id = 'voice-notes' and auth.role() = 'authenticated');

create policy "Allow public read of voice notes"
  on storage.objects for select
  using (bucket_id = 'voice-notes');
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Make yourself Admin

1. Sign up through the website
2. Go to Supabase → Table Editor → `players`
3. Find your row → set `isAdmin` to `true`
4. Refresh the app – the Admin tab will appear

---

## 2. Deploy to Vercel (Recommended)

### Option A – Via GitHub

```bash
git init
git add .
git commit -m "Initial FootyConnect"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/footyconnect.git
git push -u origin main
```

1. Go to [vercel.com](https://vercel.com) → New Project → Import the repo
2. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

### Option B – Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

---

## 3. Do you need Render?

**No.**  
Everything runs on Vercel + Supabase (serverless). No extra backend server is required.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing
│   ├── login / signup
│   ├── dashboard             # Player home + recent match
│   ├── profile               # Edit own profile
│   ├── players               # Squad list
│   ├── chat                  # Group chat + voice notes
│   └── admin                 # Admin panel
├── components/
│   ├── Navbar.tsx
│   └── AuthGuard.tsx
├── lib/
│   ├── supabase.ts
│   └── auth-context.tsx
└── types/
    └── index.ts
```

Enjoy building your digital squad! 🟢⚽

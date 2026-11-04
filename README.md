# CeylonHosting

E-commerce platform for game servers, mods, and technical services.

## Prerequisites

- Node.js 20 or later
- npm
- Supabase project (PostgreSQL & Storage)

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env.local
```

Fill in the required environment variables in `.env.local` (including Supabase credentials).

3. Set up Supabase Database:

Run the SQL script located in `supabase/schema.sql` in your Supabase SQL Editor.

4. Start development server:

```bash
npm run dev
```

The app will be available at http://localhost:4000.

## Scripts

- `npm run dev` - Run development server on port 4000
- `npm run build` - Build production bundle
- `npm run start` - Run production server on port 4000
- `npm run lint` - Run ESLint
- `npm run format` - Format files with Prettier

## Tech Stack

- Next.js (App Router, Turbopack)
- React
- TypeScript
- Supabase (PostgreSQL & Storage)
- Payments.lk

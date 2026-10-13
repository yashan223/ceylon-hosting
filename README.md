# CeylonHosting

E-commerce platform for game servers, mods, and technical services.

## Prerequisites

- Node.js 20 or later
- npm
- MongoDB or Docker

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env.local
```

Fill in the required environment variables in `.env.local`.

3. Start database (Docker):

```bash
npm run db:up
```

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
- `npm run db:up` - Start local MongoDB container
- `npm run db:down` - Stop local MongoDB container

## Tech Stack

- Next.js
- React
- TypeScript
- MongoDB
- Payments.lk

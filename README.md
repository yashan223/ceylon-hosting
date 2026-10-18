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
# or
docker compose up -d mongodb
```

4. Start development server:

```bash
npm run dev
```

The app will be available at http://localhost:4000.

## Database & Docker Commands

| Action | NPM Script | Docker Compose Command |
|---|---|---|
| **Start Database** | `npm run db:up` | `docker compose up -d mongodb` |
| **Stop Database** | `npm run db:down` | `docker compose stop mongodb` |
| **View Logs** | `npm run db:logs` | `docker compose logs -f mongodb` |
| **Check Status** | `npm run db:status` | `docker compose ps mongodb` |
| **Stop & Remove Containers** | — | `docker compose down` |

## Scripts

- `npm run dev` - Run development server on port 4000
- `npm run build` - Build production bundle
- `npm run start` - Run production server on port 4000
- `npm run lint` - Run ESLint
- `npm run format` - Format files with Prettier
- `npm run db:up` - Start local MongoDB container (`docker compose up -d mongodb`)
- `npm run db:down` - Stop local MongoDB container (`docker compose stop mongodb`)
- `npm run db:logs` - Stream MongoDB container logs (`docker compose logs -f mongodb`)
- `npm run db:status` - Check MongoDB container status (`docker compose ps mongodb`)

## Tech Stack

- Next.js
- React
- TypeScript
- MongoDB
- Payments.lk

---
title: Development Setup
category: guide
status: stable
---

# Development Setup

Get JuiceFuel running locally.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (via Supabase)
- `.env` file with DATABASE_URL configured

## Installation

```bash
# Clone repository (if needed)
git clone <repo-url>
cd juicefuel

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations (if needed)
npx prisma migrate dev
```

## Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Auth
AUTH_SECRET="generate-random-32-char-secret-here"
AUTH_ORIGIN="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

Generate AUTH_SECRET:
```bash
openssl rand -base64 32
```

## Development Server

```bash
npm run dev
```

Visit: http://localhost:3000 (or port shown in console)

## Seeding Test Data

```bash
# Run seed script
npx prisma db seed

# Or manually via tsx
npx tsx prisma/seed.ts
```

See [[seeding-test-data]] for what gets created.

## Running Tests

```bash
# Run all tests once
npm test -- --run

# Run tests in watch mode
npm test

# Run specific test file
npm test -- --run server/services/shoppingListService.test.ts
```

## Type Checking

```bash
# Check types
npm run typecheck

# Build (includes type checking)
npm run build
```

## Database Management

### View Database
```bash
# Open Prisma Studio
npx prisma studio
```

### Reset Database
```bash
# WARNING: Deletes all data
npx prisma migrate reset

# Then reseed
npx prisma db seed
```

### Create Migration
```bash
# After changing schema.prisma
npx prisma migrate dev --name your_migration_name
```

## Troubleshooting

### Port Already in Use
Server will automatically use next available port (3001, 3002, etc.)

### Database Connection Error
Check your `.env` file has correct `DATABASE_URL`.

### Prisma Client Not Generated
Run: `npx prisma generate`

### Tests Failing
Make sure you're running with `--run` flag: `npm test -- --run`

### TypeScript Errors
```bash
# Regenerate types
npx prisma generate

# Check for actual errors
npm run typecheck
```

## Next Steps

- [[api-testing]] - Test API endpoints
- [[seeding-test-data]] - Understand test data
- [[../architecture/system-overview]] - Learn the architecture

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm test                 # Run tests in watch mode
npm test -- --run        # Run tests once
npm run typecheck        # Check TypeScript types

# Database
npx prisma studio        # Open database UI
npx prisma generate      # Regenerate Prisma client
npx prisma migrate dev   # Run migrations
npx prisma db seed       # Seed test data

# Production Build
npm run build            # Build for production
npm run preview          # Preview production build
```

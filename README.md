# JuiceFuel

A modern meal planning and recipe management application built with Nuxt 3 and Supabase.

## What is JuiceFuel?

JuiceFuel helps households plan meals, manage recipes, and generate organized shopping lists. Key features:

- **Meal Planning**: Weekly planner with drag-and-drop meal slots
- **Recipe Management**: Create, organize, and share recipes across households
- **Smart Shopping Lists**: Auto-generated lists organized by supermarket sections (rubrics)
- **Multi-Household**: Support for families, roommates, and shared households
- **Tagging System**: Organize recipes by cuisine, diet, cooking technique, and more
- **Authentication**: Email/password and Google OAuth support

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (via Supabase)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed test data (optional)
npx prisma db seed
```

### Development Server

```bash
npm run dev
```

Visit http://localhost:3000

Default test users:
- **test@juicefuel.local** / password123
- **second@juicefuel.local** / password123

## Documentation

📚 **Full documentation is in [`/docs`](./docs/)**

### Quick Links
- [Development Setup](./docs/guides/development-setup.md) - Detailed setup instructions
- [Architecture Overview](./docs/architecture/system-overview.md) - System design and data flow
- [API Testing Guide](./docs/guides/api-testing.md) - Testing API endpoints
- [Seeding Test Data](./docs/guides/seeding-test-data.md) - Understanding test data

### Explore by Domain
- [Authentication](./docs/domains/authentication/) - User auth, sessions, OAuth
- [Households](./docs/domains/households/) - Multi-household management
- [Recipes](./docs/domains/recipes/) - Recipe library system
- [Meal Planner](./docs/domains/planner/) - Weekly meal planning
- [Shopping Lists](./docs/domains/shopping/) - Rubric-based organization
- [Ingredients](./docs/domains/ingredients/) - Ingredient taxonomy and search
- [Tags](./docs/domains/tags/) - Recipe tagging system

## Tech Stack

- **Frontend**: Nuxt 3, Vue 3, Tailwind CSS, Pinia
- **Backend**: Nitro (Nuxt server), Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Auth**: Session-based with bcrypt + Google OAuth
- **Type Safety**: TypeScript + Zod schemas

## Key Concepts

- **[Layered Architecture](./docs/architecture/layered-architecture.md)**: Clean separation (UI → API → Service → Repository → DB)
- **[Active Household Pattern](./docs/concepts/active-household-pattern.md)**: One household at a time for simplified UX
- **[Rubric-Based Organization](./docs/concepts/rubric-based-organization.md)**: Fixed shopping list categories
- **[Public/Private Libraries](./docs/concepts/public-private-libraries.md)**: Recipe sharing model

## Development

```bash
# Run tests
npm test -- --run

# Type check
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Status

JuiceFuel is an MVP-stage application ready for self-hosting. Core features are implemented and stable.

## License

[Add your license here]

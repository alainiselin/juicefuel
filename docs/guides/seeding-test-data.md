# JuiceFuel Quick Start

## Prerequisites

1. Node.js installed
2. PostgreSQL database (Supabase)
3. `.env` file with DATABASE_URL configured

## Installation & Setup

```bash
# Install dependencies (already done)
npm install

# Generate Prisma client
npx prisma generate

# Run migrations (if needed)
npx prisma migrate dev

# Seed test data (optional - see below)
```

## Run Development Server

```bash
npm run dev
```

Visit: http://localhost:3000 (or port shown in console)

## Run Tests

```bash
# Run tests once
npm test -- --run

# Run tests in watch mode
npm test
```

## Test Data Setup

To test the application, you need to create some test data in your database:

```sql
-- 1. Create a test household
INSERT INTO household (id, name) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Household');

-- 2. Create a recipe library
INSERT INTO recipe_library (id, household_id, name) 
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'My Recipes');

-- 3. Create a meal plan
INSERT INTO meal_plan (id, household_id) 
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111');

-- 4. Create some ingredients
INSERT INTO ingredient (id, name, default_unit) VALUES 
('44444444-4444-4444-4444-444444444444', 'Flour', 'G'),
('55555555-5555-5555-5555-555555555555', 'Sugar', 'G'),
('66666666-6666-6666-6666-666666666666', 'Eggs', 'PIECE'),
('77777777-7777-7777-7777-777777777777', 'Milk', 'ML'),
('88888888-8888-8888-8888-888888888888', 'Butter', 'G');
```

## Using the UI

1. **Home Page** (`/`): Navigate to different sections
2. **Recipes** (`/recipes`): 
   - Use recipe_library_id: `22222222-2222-2222-2222-222222222222`
   - Create recipes with ingredients
3. **Meal Plan** (`/plan`):
   - Use meal_plan_id: `33333333-3333-3333-3333-333333333333`
   - Set date range and load/add entries
4. **Shopping List** (`/shopping-list`):
   - Use same meal_plan_id and date range
   - View aggregated ingredients

## API Testing

See `IMPLEMENTATION.md` for detailed curl examples.

Quick test:
```bash
# Create a recipe
curl -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "recipe_library_id": "22222222-2222-2222-2222-222222222222",
    "title": "Test Recipe",
    "ingredients": []
  }'
```

## File Structure

```
spec/                       # Specifications
├── domain.md              # Domain model
├── schemas.ts             # Zod schemas
└── openapi.yaml           # API spec

server/
├── api/                   # Nitro API endpoints
│   ├── recipes/
│   ├── meal-plan/
│   └── shopping-list/
├── services/              # Business logic
├── repos/                 # Prisma queries
└── utils/                 # Utilities (Prisma client)

app/
├── composables/           # Composables
├── stores/                # Pinia stores
└── pages/                 # Vue pages
```

## Key Concepts

### Shopping List Aggregation
- Automatically aggregates ingredients from meal plan entries
- Groups by ingredient name + unit
- Sums quantities with same unit
- Different units remain separate lines

### Validation
- All API input validated with Zod
- Type-safe from API to UI
- Consistent error responses

### Architecture
- **Repos**: Database queries only
- **Services**: Business logic
- **API**: Validation + service calls
- **UI**: Pinia stores + pages

## Troubleshooting

### Port already in use
Server will automatically use next available port (3001, 3002, etc.)

### Database connection error
Check your `.env` file has correct `DATABASE_URL`

### Prisma client not generated
Run: `npx prisma generate`

### Tests failing
Make sure you're running with `--run` flag: `npm test -- --run`

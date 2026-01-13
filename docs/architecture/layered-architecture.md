---
title: Layered Architecture
category: architecture
status: stable
---

# Layered Architecture

JuiceFuel follows a clean layered architecture with strict separation of concerns.

## Architecture Layers

```
UI Layer (Vue/Pinia)
    ↓
API Layer (Nitro endpoints - validation only)
    ↓
Service Layer (Business logic)
    ↓
Repository Layer (Prisma queries)
    ↓
Database (Supabase Postgres)
```

## Layer Responsibilities

### UI Layer (Vue/Pinia)
- **Location**: `app/`
- **Purpose**: User interface, state management, composables
- **Tools**: Vue 3, Pinia, Nuxt
- **Rules**:
  - No direct database access
  - No business logic
  - Calls API endpoints via composables

### API Layer (Nitro)
- **Location**: `server/api/`
- **Purpose**: HTTP request handling, validation, auth
- **Tools**: Nitro, Zod
- **Rules**:
  - Validate all inputs with Zod schemas
  - Authenticate requests with `requireAuth()`
  - Call service layer methods
  - Return consistent error responses
  - No direct Prisma access

### Service Layer
- **Location**: `server/services/`
- **Purpose**: Business logic, orchestration, transactions
- **Tools**: Pure TypeScript
- **Rules**:
  - Implement core business rules
  - Coordinate multiple repository calls
  - Handle transactions
  - No direct Prisma access
  - Call repository layer only

### Repository Layer
- **Location**: `server/repos/`
- **Purpose**: Database queries, data access
- **Tools**: Prisma
- **Rules**:
  - Only Prisma queries (findMany, create, update, delete)
  - No business logic
  - Return raw database entities
  - Handle includes/relations

### Database Layer
- **Technology**: PostgreSQL via Supabase
- **Schema**: Defined in `prisma/schema.prisma`
- **Access**: Only through Prisma client

## Key Design Principles

### 1. Separation of Concerns
Each layer has one responsibility and depends only on the layer directly below it.

### 2. No Layer Skipping
- API endpoints cannot call repositories directly
- Services cannot access the database directly
- UI cannot call services directly

### 3. Type Safety Throughout
- Zod schemas validate all external input
- TypeScript types flow from database to UI
- No `any` types allowed

### 4. Service/Repository Pattern
**Repositories**: Database queries only
```typescript
// ✅ Good
async findByDateRange(mealPlanId: string, from: Date, to: Date) {
  return prisma.meal_slot.findMany({
    where: { meal_plan_id: mealPlanId, date: { gte: from, lte: to } }
  });
}

// ❌ Bad - contains business logic
async findByDateRange(mealPlanId: string, from: Date, to: Date) {
  const entries = await prisma.meal_slot.findMany({ /* ... */ });
  return entries.filter(e => e.recipe !== null); // Business logic!
}
```

**Services**: Business logic only
```typescript
// ✅ Good
async getEntries(mealPlanId: string, from: Date, to: Date) {
  const entries = await mealPlanRepo.findByDateRange(mealPlanId, from, to);
  return entries.filter(e => e.recipe !== null); // Business rule
}

// ❌ Bad - direct Prisma access
async getEntries(mealPlanId: string, from: Date, to: Date) {
  return prisma.meal_slot.findMany({ /* ... */ }); // Should use repo!
}
```

## Example Flow

### Creating a Recipe

```
1. User fills form in /recipes page (UI Layer)
   ↓
2. Form calls useApi().createRecipe() (Composable)
   ↓
3. POST /api/recipes endpoint receives request (API Layer)
   ↓
4. Endpoint validates body with Zod schema
   ↓
5. Endpoint calls recipeService.create() (Service Layer)
   ↓
6. Service applies business rules (e.g., user owns library)
   ↓
7. Service calls recipeRepo.create() (Repository Layer)
   ↓
8. Repository executes Prisma query
   ↓
9. Database persists data and returns result
   ↓
10. Result flows back up through layers to UI
```

## Error Handling

### Consistent Error Responses
All API endpoints return consistent error structures:

```typescript
// 400 Bad Request
{
  statusCode: 400,
  message: "Validation failed: title is required"
}

// 401 Unauthorized
{
  statusCode: 401,
  message: "Authentication required"
}

// 404 Not Found
{
  statusCode: 404,
  message: "Recipe not found"
}

// 500 Internal Server Error
{
  statusCode: 500,
  message: "Internal server error"
}
```

### Error Handling Pattern
```typescript
export default defineEventHandler(async (event) => {
  try {
    // Validate
    const body = await readBody(event);
    const validated = RecipeCreateSchema.parse(body);
    
    // Authorize
    const userId = await requireAuth(event);
    
    // Execute
    const recipe = await recipeService.create(validated, userId);
    
    // Return
    return recipe;
  } catch (error) {
    if (error instanceof ZodError) {
      throw createError({ statusCode: 400, message: error.message });
    }
    throw error;
  }
});
```

## Benefits

### ✅ Testability
- Each layer can be tested independently
- Services can be tested without database
- Pure functions are easy to test

### ✅ Maintainability
- Clear boundaries reduce coupling
- Changes in one layer don't cascade
- Easy to locate bugs

### ✅ Scalability
- Layers can be optimized independently
- Repository layer can be cached
- Services can be extracted to microservices

### ✅ Type Safety
- TypeScript catches errors at compile time
- Zod validates at runtime
- No surprises in production

## Related Documentation

- [[system-overview]] - Component hierarchy and data flow
- [[type-safety]] - Zod schemas and TypeScript approach
- [[../guides/api-testing]] - Testing API endpoints

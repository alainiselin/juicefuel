---
title: Type Safety
category: architecture
status: stable
---

# Type Safety in JuiceFuel

JuiceFuel enforces type safety throughout the entire stack using TypeScript and Zod schemas.

## Philosophy

**No `any` types allowed.** Every piece of data has a well-defined type from database to UI.

## Type Flow

```
Database Schema (Prisma)
    ↓ (prisma generate)
Prisma Types
    ↓ (used by repos)
Repository Return Types
    ↓ (used by services)
Service Return Types
    ↓ (validated by Zod)
API Response Types
    ↓ (consumed by)
Frontend Types (shared schemas)
```

## Zod Schemas

### Purpose
- **Runtime validation** of external input
- **Type inference** for TypeScript
- **Single source of truth** for API contracts

### Location
All schemas are defined in `spec/schemas.ts`.

### Example Schema
```typescript
import { z } from 'zod';

export const RecipeCreateSchema = z.object({
  recipe_library_id: z.string().uuid(),
  title: z.string().min(1),
  source_url: z.string().url().optional(),
  instructions_markdown: z.string().optional(),
  ingredients: z.array(z.object({
    ingredient_id: z.string().uuid(),
    quantity: z.number().positive().nullable(),
    unit: z.enum(['G', 'KG', 'ML', 'L', 'TBSP', 'TSP', 'CUP', 'PIECE']).nullable(),
    note: z.string().optional()
  })).optional()
});

export type RecipeCreate = z.infer<typeof RecipeCreateSchema>;
```

### Type Inference
Zod schemas automatically generate TypeScript types:
```typescript
// Schema defines validation rules
const schema = z.object({ name: z.string(), age: z.number() });

// Type is inferred automatically
type Person = z.infer<typeof schema>;
// Equivalent to: { name: string; age: number }
```

## Validation Pattern

### API Endpoints
All endpoints validate input with Zod before processing:

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  // Parse and validate - throws if invalid
  const validated = RecipeCreateSchema.parse(body);
  
  // Now validated is strongly typed
  const recipe = await recipeService.create(validated);
  
  return recipe;
});
```

### Error Handling
Zod validation errors are caught and converted to 400 responses:

```typescript
try {
  const validated = schema.parse(input);
} catch (error) {
  if (error instanceof ZodError) {
    throw createError({
      statusCode: 400,
      message: `Validation failed: ${error.message}`
    });
  }
}
```

## Shared Types

### Frontend & Backend
Types are shared between frontend and backend via `spec/schemas.ts`:

```typescript
// Backend
import { RecipeCreate } from '~/spec/schemas';

export function createRecipe(data: RecipeCreate) { /* ... */ }

// Frontend
import { RecipeCreate } from '~/spec/schemas';

const recipe: RecipeCreate = {
  recipe_library_id: '...',
  title: 'My Recipe',
  // TypeScript ensures this matches the schema
};
```

### Benefits
- ✅ Single source of truth
- ✅ Changes propagate automatically
- ✅ Compile-time type checking
- ✅ Runtime validation

## Prisma Types

### Generated Types
Prisma generates TypeScript types from database schema:

```typescript
// prisma/schema.prisma
model Recipe {
  id                  String   @id @default(uuid())
  title               String
  recipe_library_id   String
  recipe_library      RecipeLibrary @relation(...)
}

// After `prisma generate`:
import { Recipe } from '@prisma/client';

const recipe: Recipe = {
  id: '...',
  title: 'My Recipe',
  recipe_library_id: '...'
};
```

### Includes
Prisma generates types for includes:

```typescript
import { Prisma } from '@prisma/client';

type RecipeWithIngredients = Prisma.RecipeGetPayload<{
  include: { ingredients: { include: { ingredient: true } } }
}>;

// Type-safe access to nested relations
const recipe: RecipeWithIngredients = await prisma.recipe.findUnique({
  where: { id },
  include: { ingredients: { include: { ingredient: true } } }
});

recipe.ingredients[0].ingredient.name; // ✅ Type-safe
```

## Enum Types

### Database Enums
Enums are defined in Prisma schema:

```prisma
enum Unit {
  G
  KG
  ML
  L
  TBSP
  TSP
  CUP
  PIECE
}

enum SlotType {
  BREAKFAST
  LUNCH
  DINNER
  SNACK
  OTHER
}
```

### Usage
Enums are imported and used throughout the codebase:

```typescript
import { Unit, SlotType } from '@prisma/client';

const quantity = { amount: 200, unit: Unit.G }; // ✅ Type-safe
const slot = SlotType.BREAKFAST; // ✅ Type-safe
```

## Frontend Type Safety

### Composables
API composables are fully typed:

```typescript
// app/composables/useApi.ts
export const useApi = () => {
  const createRecipe = async (data: RecipeCreate): Promise<Recipe> => {
    return $fetch('/api/recipes', {
      method: 'POST',
      body: data
    });
  };
  
  return { createRecipe };
};

// Usage
const { createRecipe } = useApi();
const recipe = await createRecipe({
  recipe_library_id: '...',
  title: 'My Recipe'
}); // ✅ Fully typed
```

### Pinia Stores
State management is typed:

```typescript
export const useRecipesStore = defineStore('recipes', () => {
  const recipes = ref<Recipe[]>([]);
  
  const fetchRecipes = async (): Promise<void> => {
    recipes.value = await useApi().getRecipes();
  };
  
  return { recipes, fetchRecipes };
});
```

## Type Guards

### Runtime Type Checking
For dynamic data, use type guards:

```typescript
function isRecipe(data: unknown): data is Recipe {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'title' in data
  );
}

const data = await fetch('/api/recipes/123');
if (isRecipe(data)) {
  console.log(data.title); // ✅ Type-safe
}
```

## Best Practices

### ✅ DO
- Define Zod schemas for all API inputs/outputs
- Use type inference (`z.infer<typeof Schema>`)
- Share types between frontend and backend
- Use Prisma-generated types in repositories
- Add type annotations to function parameters

### ❌ DON'T
- Use `any` (enable `noImplicitAny` in tsconfig)
- Cast types with `as` unless absolutely necessary
- Duplicate type definitions
- Skip validation on API boundaries
- Trust external data without validation

## Testing Type Safety

### Compile-Time Checks
```bash
# Type-check entire codebase
npm run typecheck

# Build (includes type checking)
npm run build
```

### Runtime Validation Tests
```typescript
import { RecipeCreateSchema } from '~/spec/schemas';

describe('RecipeCreateSchema', () => {
  it('validates correct input', () => {
    const valid = {
      recipe_library_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'My Recipe'
    };
    
    expect(() => RecipeCreateSchema.parse(valid)).not.toThrow();
  });
  
  it('rejects invalid input', () => {
    const invalid = { title: '' }; // Missing required field
    
    expect(() => RecipeCreateSchema.parse(invalid)).toThrow();
  });
});
```

## Related Documentation

- [[layered-architecture]] - How types flow through layers
- [[system-overview]] - Overall system design
- [[../guides/api-testing]] - Testing typed endpoints

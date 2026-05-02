import { z } from 'zod';

// Enums matching Prisma schema
export const UnitSchema = z.enum(['G', 'KG', 'ML', 'L', 'TBSP', 'TSP', 'CUP', 'PIECE', 'PACKAGE', 'OTHER']);
export type Unit = z.infer<typeof UnitSchema>;

export const SlotTypeSchema = z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER']);
export type SlotType = z.infer<typeof SlotTypeSchema>;

// Ingredient schemas
export const CreateIngredientSchema = z.object({
  name: z.string().min(1, 'Ingredient name required'),
  default_unit: UnitSchema.optional(),
});
export type CreateIngredientInput = z.infer<typeof CreateIngredientSchema>;

export const IngredientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  default_unit: UnitSchema.nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

// RecipeIngredient schemas
export const RecipeIngredientInputSchema = z.object({
  ingredient_id: z.string().uuid(),
  quantity: z.number().positive().optional(),
  unit: UnitSchema.optional(),
  note: z.string().optional(),
});
export type RecipeIngredientInput = z.infer<typeof RecipeIngredientInputSchema>;

export const RecipeIngredientSchema = z.object({
  ingredient_id: z.string().uuid(),
  quantity: z.number().nullable(),
  unit: UnitSchema.nullable(),
  note: z.string().nullable(),
  ingredient: IngredientSchema,
});
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;

// Tag schemas
export const TagSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  slug: z.string(),
  kind: z.string(),
  scope: z.string(),
  household_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
});
export type Tag = z.infer<typeof TagSchema>;

export const RecipeTagSchema = z.object({
  tag_id: z.string().uuid(),
  tag: TagSchema,
});
export type RecipeTag = z.infer<typeof RecipeTagSchema>;

// Recipe schemas
export const CreateRecipeSchema = z.object({
  recipe_library_id: z.string().uuid(),
  title: z.string().min(1, 'Recipe title required'),
  description: z.string().max(240).optional().or(z.literal('')).or(z.null()),
  source_url: z.string().url().optional().or(z.literal('')).or(z.null()),
  instructions_markdown: z.string().optional().or(z.null()),
  ingredients: z.array(RecipeIngredientInputSchema).default([]),
});
export type CreateRecipeInput = z.infer<typeof CreateRecipeSchema>;

export const UpdateRecipeSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().max(240).optional().or(z.null()),
  base_servings: z.number().int().positive().optional(),
  source_url: z.string().url().optional().or(z.literal('')).or(z.null()),
  instructions_markdown: z.string().optional().or(z.null()),
  prep_time_minutes: z.number().int().min(1).optional().or(z.null()),
  ingredients: z.array(RecipeIngredientInputSchema).optional(),
});
export type UpdateRecipeInput = z.infer<typeof UpdateRecipeSchema>;

export const RecipeSchema = z.object({
  id: z.string().uuid(),
  recipe_library_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable().optional(),
  base_servings: z.number().int().positive().nullable().optional(),
  source_url: z.string().nullable(),
  instructions_markdown: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  ingredients: z.array(RecipeIngredientSchema).default([]),
  tags: z.array(RecipeTagSchema).default([]).optional(),
});
export type Recipe = z.infer<typeof RecipeSchema>;

// MealPlanEntry (meal_slot) schemas
export const CreateMealPlanEntrySchema = z
  .object({
    meal_plan_id: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    slot: SlotTypeSchema,
    recipe_id: z.string().uuid().optional().nullable(),
    title: z.string().min(1).max(200).optional().nullable(),
  })
  .refine((d) => !!d.recipe_id || !!d.title, {
    message: 'Either recipe_id or title must be provided',
  });
export type CreateMealPlanEntryInput = z.infer<typeof CreateMealPlanEntrySchema>;

export const UpdateMealPlanEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slot: SlotTypeSchema.optional(),
  recipe_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200).optional().nullable(),
});
export type UpdateMealPlanEntryInput = z.infer<typeof UpdateMealPlanEntrySchema>;

export const MealPlanEntrySchema = z.object({
  id: z.string().uuid(),
  meal_plan_id: z.string().uuid(),
  date: z.string(),
  slot: SlotTypeSchema,
  recipe_id: z.string().uuid().nullable(),
  title: z.string().nullable(),
  recipe: RecipeSchema.optional().nullable(),
});
export type MealPlanEntry = z.infer<typeof MealPlanEntrySchema>;

// Shopping list schemas (aggregated, read-only)
export const ShoppingListItemSchema = z.object({
  ingredient_id: z.string().uuid(),
  ingredient_name: z.string(),
  total_quantity: z.number().nullable(),
  unit: UnitSchema.nullable(),
  recipes: z.array(z.string()),
});
export type ShoppingListItem = z.infer<typeof ShoppingListItemSchema>;

export const ShoppingListResponseSchema = z.object({
  from: z.string(),
  to: z.string(),
  items: z.array(ShoppingListItemSchema),
});
export type ShoppingListResponse = z.infer<typeof ShoppingListResponseSchema>;

// Shopping list CRUD schemas
export const ShoppingListStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']);
export type ShoppingListStatus = z.infer<typeof ShoppingListStatusSchema>;

export const ShoppingListItemDetailSchema = z.object({
  id: z.string().uuid(),
  shopping_list_id: z.string().uuid(),
  ingredient_id: z.string().uuid().nullable(),
  article_id: z.string().uuid().nullable(),
  quantity: z.number().nullable(),
  unit: UnitSchema.nullable(),
  note: z.string().nullable(),
  is_checked: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  ingredient: IngredientSchema.nullable().optional(),
  article: z.object({
    id: z.string().uuid(),
    name: z.string(),
    default_unit: UnitSchema.nullable(),
  }).nullable().optional(),
  tags: z.array(TagSchema).default([]),
});
export type ShoppingListItemDetail = z.infer<typeof ShoppingListItemDetailSchema>;

export const ShoppingListDetailSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
  title: z.string(),
  status: ShoppingListStatusSchema,
  store_hint: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  items: z.array(ShoppingListItemDetailSchema).default([]),
});
export type ShoppingListDetail = z.infer<typeof ShoppingListDetailSchema>;

export const CreateShoppingListSchema = z.object({
  household_id: z.string().uuid(),
  title: z.string().min(1),
  status: ShoppingListStatusSchema.optional(),
  store_hint: z.string().optional(),
});
export type CreateShoppingListInput = z.infer<typeof CreateShoppingListSchema>;

export const UpdateShoppingListSchema = z.object({
  title: z.string().min(1).optional(),
  status: ShoppingListStatusSchema.optional(),
  store_hint: z.string().optional().nullable(),
});
export type UpdateShoppingListInput = z.infer<typeof UpdateShoppingListSchema>;

export const CreateShoppingListItemSchema = z.object({
  shopping_list_id: z.string().uuid(),
  ingredient_id: z.string().uuid().optional(),
  article_id: z.string().uuid().optional(),
  quantity: z.number().positive().optional(),
  unit: UnitSchema.optional(),
}).refine(data => (data.ingredient_id && !data.article_id) || (!data.ingredient_id && data.article_id), {
  message: 'Exactly one of ingredient_id or article_id must be provided',
});
export type CreateShoppingListItemInput = z.infer<typeof CreateShoppingListItemSchema>;

export const UpdateShoppingListItemSchema = z.object({
  shopping_list_id: z.string().uuid().optional(),
  quantity: z.number().positive().optional().nullable(),
  unit: UnitSchema.optional().nullable(),
  note: z.string().optional().nullable(),
  is_checked: z.boolean().optional(),
  aisle: z.string().optional().nullable(),
});
export type UpdateShoppingListItemInput = z.infer<typeof UpdateShoppingListItemSchema>;

// Query schemas
export const RecipeQuerySchema = z.object({
  query: z.string().optional(),
  recipe_library_id: z.string().uuid().optional(),
});
export type RecipeQuery = z.infer<typeof RecipeQuerySchema>;

export const DateRangeQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_plan_id: z.string().uuid(),
});
export type DateRangeQuery = z.infer<typeof DateRangeQuerySchema>;

// Error response
export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

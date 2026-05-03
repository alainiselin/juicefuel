import { z } from 'zod';
import type { Unit } from '@prisma/client';
import { requireAuth } from '../../../utils/authHelpers';
import prisma from '../../../utils/prisma';
import { RecipeDraftSchema } from '../../../services/aiRecipeGenerator';

const NullableStringSchema = z.preprocess((value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}, z.string().nullable());

const NullableAmountSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}, z.number().nullable());

const RecipeDraftSaveSchema = RecipeDraftSchema.extend({
  description: z.string().trim().max(1000).transform(value => value.slice(0, 240)),
  ingredients: z.array(
    z.object({
      name: z.string().trim().min(1),
      amount: NullableAmountSchema,
      unit: NullableStringSchema,
      note: NullableStringSchema,
    })
  ).min(1),
  tags: z.object({
    CUISINE: z.array(z.string()).optional().default([]),
    FLAVOR: z.array(z.string()).optional().default([]),
    DIET: z.array(z.string()).optional().default([]),
    ALLERGEN: z.array(z.string()).optional().default([]),
    TECHNIQUE: z.array(z.string()).optional().default([]),
    TIME: z.array(z.string()).optional().default([]),
    COST: z.array(z.string()).optional().default([]),
  }),
});

const SaveDraftRequestSchema = z.object({
  household_id: z.string().min(1),
  recipe_library_id: z.string().min(1),
  draft: RecipeDraftSaveSchema,
  source_url: z.string().url().nullable().optional(),
});

function validationSummary(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid request data';

  const path = issue.path.length > 0 ? issue.path.join('.') : 'request';
  return `Invalid recipe save data: ${path} - ${issue.message}`;
}

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const body = await readBody(event);

  const validation = SaveDraftRequestSchema.safeParse(body);
  if (!validation.success) {
    console.warn('[API] AI recipe save validation failed', {
      issues: validation.error.issues.slice(0, 8).map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });

    throw createError({
      statusCode: 400,
      message: validationSummary(validation.error),
      data: validation.error.flatten(),
    });
  }

  const { household_id, recipe_library_id, draft, source_url } = validation.data;

  // Verify user is member of household
  const member = await prisma.household_member.findUnique({
    where: {
      household_id_user_id: {
        household_id,
        user_id: userId,
      },
    },
  });

  if (!member) {
    throw createError({
      statusCode: 403,
      message: 'Access denied to this household',
    });
  }

  // Verify recipe library belongs to household
  const library = await prisma.recipe_library.findUnique({
    where: { id: recipe_library_id },
  });

  if (!library || library.household_id !== household_id) {
    throw createError({
      statusCode: 403,
      message: 'Recipe library does not belong to this household',
    });
  }

  // Create or find ingredients
  const ingredientIds: Array<{
    ingredient_id: string;
    quantity: number | null;
    unit: Unit | null;
    note: string | null;
  }> = [];

  // Map AI units to Prisma enum values
  const unitMap: Record<string, Unit> = {
    'g': 'G',
    'kg': 'KG',
    'ml': 'ML',
    'l': 'L',
    'tbsp': 'TBSP',
    'tsp': 'TSP',
    'cup': 'CUP',
    'piece': 'PIECE',
    'package': 'PACKAGE',
  };

  for (const ing of draft.ingredients) {
    const normalizedName = ing.name.toLowerCase().trim();
    
    // Try to find existing ingredient by name or alias
    let ingredient = await prisma.ingredient.findFirst({
      where: {
        OR: [
          { name: normalizedName, household_id: null },
          { name: normalizedName, household_id },
          {
            aliases: {
              some: {
                name: normalizedName,
              },
            },
          },
        ],
      },
    });

    // If not found, create a new one scoped to household
    if (!ingredient) {
      ingredient = await prisma.ingredient.create({
        data: {
          name: ing.name,
          household_id,
          is_recipe_eligible: true,
          source: 'USER',
        },
      });
    }

    // Normalize unit to uppercase enum value
    let normalizedUnit = ing.unit ? unitMap[ing.unit.toLowerCase()] || null : null;

    ingredientIds.push({
      ingredient_id: ingredient.id,
      quantity: ing.amount,
      unit: normalizedUnit,
      note: ing.note,
    });
  }

  // Parse steps from draft (they're already in order)
  const stepsMarkdown = draft.steps
    .sort((a, b) => a.order - b.order)
    .map((step, idx) => `${idx + 1}. ${step.text}`)
    .join('\n\n');

  // Normalize and validate description
  const description = draft.description
    ? draft.description.trim().replace(/\n/g, ' ').slice(0, 240)
    : null;

  // Create recipe
  const recipe = await prisma.recipe.create({
    data: {
      recipe_library_id,
      title: draft.title,
      description,
      base_servings: draft.servings,
      prep_time_minutes: draft.times.total_min,
      instructions_markdown: `## Steps\n\n${stepsMarkdown}`,
      source_url: source_url ?? null,
      ingredients: {
        create: ingredientIds.map(ing => ({
          ingredient: {
            connect: { id: ing.ingredient_id },
          },
          quantity: ing.quantity,
          unit: ing.unit,
          note: ing.note,
        })),
      },
    },
    include: {
      ingredients: {
        include: {
          ingredient: true,
        },
      },
    },
  });

  // Resolve and attach tags
  const tagSlugs: string[] = [
    ...draft.tags.CUISINE,
    ...draft.tags.FLAVOR,
    ...draft.tags.DIET,
    ...draft.tags.ALLERGEN,
    ...draft.tags.TECHNIQUE,
    ...draft.tags.TIME,
    ...draft.tags.COST,
  ];

  if (tagSlugs.length > 0) {
    // Find existing tags (GLOBAL or HOUSEHOLD scoped)
    const existingTags = await prisma.tag.findMany({
      where: {
        slug: { in: tagSlugs },
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'HOUSEHOLD', household_id },
        ],
      },
    });

    // Attach tags to recipe (idempotent)
    for (const tag of existingTags) {
      await prisma.recipe_tag.upsert({
        where: {
          recipe_id_tag_id: {
            recipe_id: recipe.id,
            tag_id: tag.id,
          },
        },
        create: {
          recipe_id: recipe.id,
          tag_id: tag.id,
        },
        update: {},
      });
    }
  }

  // Fetch complete recipe with tags
  const completeRecipe = await prisma.recipe.findUnique({
    where: { id: recipe.id },
    include: {
      ingredients: {
        include: {
          ingredient: true,
        },
      },
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              slug: true,
              kind: true,
            },
          },
        },
      },
    },
  });

  console.log('[API] AI recipe saved', {
    recipeId: recipe.id,
    title: draft.title,
    userId,
    household_id,
  });

  setResponseStatus(event, 201);
  return completeRecipe;
});

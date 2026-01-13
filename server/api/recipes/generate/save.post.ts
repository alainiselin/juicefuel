import { z } from 'zod';
import { requireAuth } from '../../../utils/authHelpers';
import prisma from '../../../utils/prisma';
import { RecipeDraftSchema } from '../../../services/aiRecipeGenerator';

const SaveDraftRequestSchema = z.object({
  household_id: z.string().uuid(),
  recipe_library_id: z.string().uuid(),
  draft: RecipeDraftSchema,
});

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const body = await readBody(event);

  const validation = SaveDraftRequestSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request data',
      data: validation.error.flatten(),
    });
  }

  const { household_id, recipe_library_id, draft } = validation.data;

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
    unit: string | null;
    note: string | null;
  }> = [];

  // Map AI units to Prisma enum values
  const unitMap: Record<string, string> = {
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
      source_url: null,
      ingredients: {
        create: ingredientIds,
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

import prisma from '../../../../utils/prisma';
import { requireAuth } from '../../../../utils/authHelpers';
import { z } from 'zod';

const UpdateIngredientSchema = z.object({
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  note: z.string().optional().nullable(),
});

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const recipeId = getRouterParam(event, 'id');
  const recipeIngredientId = getRouterParam(event, 'recipeIngredientId');
  const body = await readBody(event);

  if (!recipeId || !recipeIngredientId) {
    throw createError({
      statusCode: 400,
      message: 'Recipe ID and ingredient ID required',
    });
  }

  const validation = UpdateIngredientSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid ingredient data',
      data: validation.error.flatten(),
    });
  }

  const [recipe_id, ingredient_id] = recipeIngredientId.split('-').reduce((acc, part, idx) => {
    if (idx < 5) acc[0] += (idx > 0 ? '-' : '') + part;
    else acc[1] += (idx > 5 ? '-' : '') + part;
    return acc;
  }, ['', '']);

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      recipe_library: {
        include: {
          household: {
            include: {
              members: {
                where: { user_id: userId },
              },
            },
          },
        },
      },
    },
  });

  if (!recipe || recipe.recipe_library.household.members.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    });
  }

  const updateData: any = {};
  if (validation.data.quantity !== undefined) updateData.quantity = validation.data.quantity;
  if (validation.data.unit !== undefined) updateData.unit = validation.data.unit;
  if (validation.data.note !== undefined) updateData.note = validation.data.note;

  const recipeIngredient = await prisma.recipe_ingredient.update({
    where: {
      recipe_id_ingredient_id: {
        recipe_id,
        ingredient_id,
      },
    },
    data: updateData,
    include: {
      ingredient: {
        select: {
          id: true,
          name: true,
          default_unit: true,
        },
      },
    },
  });

  return {
    id: recipeIngredient.recipe_id + '-' + recipeIngredient.ingredient_id,
    recipe_id: recipeIngredient.recipe_id,
    ingredient_id: recipeIngredient.ingredient_id,
    quantity: Number(recipeIngredient.quantity),
    unit: recipeIngredient.unit,
    note: recipeIngredient.note,
    ingredient: {
      id: recipeIngredient.ingredient.id,
      name: recipeIngredient.ingredient.name,
      canonical_name: recipeIngredient.ingredient.name,
      default_unit: recipeIngredient.ingredient.default_unit,
    },
  };
});

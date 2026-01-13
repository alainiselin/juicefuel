import prisma from '../../../../utils/prisma';
import { requireAuth } from '../../../../utils/authHelpers';
import { z } from 'zod';

const AddIngredientSchema = z.object({
  ingredient_id: z.string().uuid(),
  quantity: z.number().positive(),
  unit: z.string(),
  note: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const recipeId = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!recipeId) {
    throw createError({
      statusCode: 400,
      message: 'Recipe ID required',
    });
  }

  const validation = AddIngredientSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid ingredient data',
      data: validation.error.flatten(),
    });
  }

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

  const recipeIngredient = await prisma.recipe_ingredient.create({
    data: {
      recipe_id: recipeId,
      ingredient_id: validation.data.ingredient_id,
      quantity: validation.data.quantity,
      unit: validation.data.unit as any,
      note: validation.data.note || null,
    },
    include: {
      ingredient: {
        select: {
          id: true,
          name: true,
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
      canonical_name: recipeIngredient.ingredient.name,
    },
  };
});

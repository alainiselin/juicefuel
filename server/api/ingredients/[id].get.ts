import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Ingredient ID required',
    });
  }

  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
    include: {
      aliases: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!ingredient) {
    throw createError({
      statusCode: 404,
      message: 'Ingredient not found',
    });
  }

  return {
    id: ingredient.id,
    canonical_name: ingredient.name,
    name: ingredient.name,
    aliases: ingredient.aliases,
  };
});

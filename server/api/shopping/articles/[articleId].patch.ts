import prisma from '../../../utils/prisma';
import { requireAuth, getActiveHousehold } from '../../../utils/authHelpers';
import { z } from 'zod';

const UpdateArticleSchema = z.object({
  default_aisle: z.string().optional(),
  name: z.string().optional(),
});

/**
 * Update a shopping article (e.g., change its aisle/category)
 */
export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const household = await getActiveHousehold(event, userId);
  
  const articleId = getRouterParam(event, 'articleId');
  if (!articleId) {
    throw createError({
      statusCode: 400,
      message: 'Article ID required',
    });
  }

  const body = await readBody(event);
  const validation = UpdateArticleSchema.safeParse(body);
  
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid article data',
      data: validation.error.flatten(),
    });
  }

  // Check that article belongs to user's household
  const existing = await prisma.shopping_article.findUnique({
    where: { id: articleId },
  });

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Article not found',
    });
  }

  if (existing.household_id !== household.id) {
    throw createError({
      statusCode: 403,
      message: 'Cannot update article from another household',
    });
  }

  // Update article
  const article = await prisma.shopping_article.update({
    where: { id: articleId },
    data: {
      ...(validation.data.default_aisle && { default_aisle: validation.data.default_aisle }),
      ...(validation.data.name && { name: validation.data.name }),
    },
  });

  return {
    id: article.id,
    name: article.name,
    default_unit: article.default_unit,
    default_aisle: article.default_aisle,
  };
});

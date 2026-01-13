import prisma from '../../../utils/prisma';
import { requireAuth, getActiveHousehold } from '../../../utils/authHelpers';
import { z } from 'zod';

const CreateArticleSchema = z.object({
  name: z.string().min(1).max(200),
  defaultAisle: z.string().optional(),
});

/**
 * Create a household-scoped shopping article (non-food item like "bandaids")
 * These items are stored separately from ingredients to keep recipe search clean.
 */
export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const household = await getActiveHousehold(event, userId);
  
  const body = await readBody(event);
  const validation = CreateArticleSchema.safeParse(body);
  
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid article data',
      data: validation.error.flatten(),
    });
  }

  // Normalize name: trim, collapse spaces, lowercase
  const normalizedName = validation.data.name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

  if (!normalizedName) {
    throw createError({
      statusCode: 400,
      message: 'Article name cannot be empty',
    });
  }

  // Check if household already has this article (idempotent)
  const existing = await prisma.shopping_article.findUnique({
    where: {
      household_id_normalized_name: {
        household_id: household.id,
        normalized_name: normalizedName,
      },
    },
  });

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      default_unit: existing.default_unit,
      default_aisle: existing.default_aisle,
    };
  }

  // Create new article
  const article = await prisma.shopping_article.create({
    data: {
      household_id: household.id,
      name: normalizedName, // Store display name as normalized
      normalized_name: normalizedName,
      default_unit: 'PIECE',
      default_aisle: validation.data.defaultAisle || 'own-items',
    },
  });

  setResponseStatus(event, 201);
  return {
    id: article.id,
    name: article.name,
    default_unit: article.default_unit,
    default_aisle: article.default_aisle,
  };
});

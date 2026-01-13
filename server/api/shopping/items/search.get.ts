import prisma from '../../../utils/prisma';
import { requireAuth, getActiveHousehold } from '../../../utils/authHelpers';

/**
 * Combined search for shopping list: includes both INGREDIENTS (food) and ARTICLES (non-food)
 * This endpoint is specifically for shopping list context.
 * Recipe ingredient search should use /api/ingredients directly (food only).
 */
export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const household = await getActiveHousehold(event, userId);
  
  const query = getQuery(event);
  const searchQuery = (query.query as string)?.trim().toLowerCase() || '';
  const limit = Math.min(parseInt((query.limit as string) || '20'), 100);

  if (!searchQuery) {
    return [];
  }

  // Search ingredients (food items) - global only
  const ingredients = await prisma.ingredient.findMany({
    where: {
      household_id: null, // Only global ingredients
      name: {
        contains: searchQuery,
        mode: 'insensitive',
      },
    },
    select: { 
      id: true, 
      name: true, 
      default_unit: true,
      aisle: true,
    },
    take: limit,
  });

  // Search household-specific articles (non-food items)
  const articles = await prisma.shopping_article.findMany({
    where: {
      household_id: household.id,
      normalized_name: {
        contains: searchQuery,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      name: true,
      default_unit: true,
      default_aisle: true,
    },
    take: limit - ingredients.length,
  });

  // Combine results with type indicator
  const results = [
    ...ingredients.map(i => ({
      type: 'INGREDIENT' as const,
      id: i.id,
      name: i.name,
      default_unit: i.default_unit,
      aisle: i.aisle,
    })),
    ...articles.map(a => ({
      type: 'ARTICLE' as const,
      id: a.id,
      name: a.name,
      default_unit: a.default_unit,
      aisle: a.default_aisle,
    })),
  ];

  return results.slice(0, limit);
});

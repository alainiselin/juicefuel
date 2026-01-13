import prisma from '../../utils/prisma';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  
  const query = getQuery(event);
  const searchQuery = (query.query as string)?.trim().toLowerCase() || '';
  const limit = Math.min(parseInt((query.limit as string) || '20'), 100);
  const includeNonCore = query.include_non_core === 'true';
  const recipeOnly = query.recipe_only === 'true';

  if (!searchQuery) {
    return [];
  }

  // This endpoint is for INGREDIENTS only (food items)
  // Shopping articles (non-food) are searched via /api/shopping/items/search
  
  const whereCore = includeNonCore ? {} : { is_core: true };
  const whereRecipe = recipeOnly ? { is_recipe_eligible: true } : {};
  
  // Only search global ingredients (household_id = NULL)
  // Household-specific items should be in shopping_article, not ingredient
  const whereGlobal = { household_id: null };

  const nameStartsWith = await prisma.ingredient.findMany({
    where: {
      ...whereCore,
      ...whereRecipe,
      ...whereGlobal,
      name: {
        startsWith: searchQuery,
        mode: 'insensitive',
      },
    },
    select: { id: true, name: true, default_unit: true },
    take: limit,
  });

  if (nameStartsWith.length >= limit) {
    return nameStartsWith.map(i => ({ id: i.id, canonical_name: i.name, default_unit: i.default_unit }));
  }

  const aliasStartsWith = await prisma.ingredient_alias.findMany({
    where: {
      name: {
        startsWith: searchQuery,
        mode: 'insensitive',
      },
      ingredient: {
        ...whereCore,
        ...whereRecipe,
        ...whereGlobal,
      },
    },
    select: {
      ingredient: {
        select: { id: true, name: true, default_unit: true },
      },
    },
    take: limit - nameStartsWith.length,
  });

  const results = new Map<string, { id: string; name: string; default_unit: any }>();
  nameStartsWith.forEach(i => results.set(i.id, i));
  aliasStartsWith.forEach(a => results.set(a.ingredient.id, a.ingredient));

  if (results.size >= limit) {
    return Array.from(results.values()).map(i => ({ id: i.id, canonical_name: i.name, default_unit: i.default_unit })).slice(0, limit);
  }

  const nameContains = await prisma.ingredient.findMany({
    where: {
      ...whereCore,
      ...whereRecipe,
      ...whereGlobal,
      name: {
        contains: searchQuery,
        mode: 'insensitive',
      },
      NOT: {
        name: {
          startsWith: searchQuery,
          mode: 'insensitive',
        },
      },
    },
    select: { id: true, name: true, default_unit: true },
    take: limit - results.size,
  });

  nameContains.forEach(i => results.set(i.id, i));

  if (results.size >= limit) {
    return Array.from(results.values()).map(i => ({ id: i.id, canonical_name: i.name, default_unit: i.default_unit })).slice(0, limit);
  }

  const aliasContains = await prisma.ingredient_alias.findMany({
    where: {
      name: {
        contains: searchQuery,
        mode: 'insensitive',
      },
      NOT: {
        name: {
          startsWith: searchQuery,
          mode: 'insensitive',
        },
      },
      ingredient: {
        ...whereCore,
        ...whereRecipe,
        ...whereGlobal,
      },
    },
    select: {
      ingredient: {
        select: { id: true, name: true, default_unit: true },
      },
    },
    take: limit - results.size,
  });

  aliasContains.forEach(a => results.set(a.ingredient.id, a.ingredient));

  return Array.from(results.values()).map(i => ({ id: i.id, canonical_name: i.name, default_unit: i.default_unit })).slice(0, limit);
});

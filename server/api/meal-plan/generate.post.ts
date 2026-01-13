import { requireAuth } from '../../utils/authHelpers';
import prisma from '../../utils/prisma';
import { generateMealPlanSuggestion, type GeneratorInput, type RecipeCandidate } from '../../services/mealPlanGenerator';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  
  const body = await readBody(event);
  
  // Validate input
  const input: GeneratorInput = {
    days: body.days || 7,
    mealTypes: body.mealTypes || ['BREAKFAST', 'LUNCH', 'DINNER'],
    diet: body.diet || 'none',
    favoriteRatio: body.favoriteRatio ?? 30,
    proteinFilters: body.proteinFilters || [],
    effort: body.effort || 'any',
    libraryIds: body.libraryIds || [],
    avoidSameRecipe: body.avoidSameRecipe ?? true,
    avoidBackToBackCuisine: body.avoidBackToBackCuisine ?? false,
    avoidBackToBackProtein: body.avoidBackToBackProtein ?? false,
    seed: body.seed,
  };

  // Get user's active household
  const user = await prisma.user_profile.findUnique({
    where: { id: userId },
    include: {
      active_household: {
        include: {
          recipe_libraries: {
            include: {
              recipes: {
                include: {
                  tags: {
                    include: {
                      tag: true,
                    },
                  },
                  favorites: {
                    where: { user_id: userId },
                  },
                },
              },
            },
          },
          meal_plan: true,
        },
      },
    },
  });

  if (!user?.active_household) {
    throw createError({
      statusCode: 400,
      message: 'No active household',
    });
  }

  const household = user.active_household;
  const mealPlanId = household.meal_plan?.id;

  if (!mealPlanId) {
    throw createError({
      statusCode: 400,
      message: 'No meal plan found for household',
    });
  }

  // Get recent usage from meal plan (last 14 days)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const recentEntries = await prisma.meal_slot.findMany({
    where: {
      meal_plan_id: mealPlanId,
      date: {
        gte: fourteenDaysAgo,
      },
    },
    select: {
      recipe_id: true,
      date: true,
    },
  });

  // Build usage map: recipeId -> days since last use
  const usageMap = new Map<string, number>();
  const now = new Date();
  recentEntries.forEach(entry => {
    const daysSince = Math.floor((now.getTime() - entry.date.getTime()) / (1000 * 60 * 60 * 24));
    const existing = usageMap.get(entry.recipe_id);
    if (existing === undefined || daysSince < existing) {
      usageMap.set(entry.recipe_id, daysSince);
    }
  });

  // Build candidate list
  const recipes: RecipeCandidate[] = [];
  for (const library of household.recipe_libraries) {
    for (const recipe of library.recipes) {
      const tags = recipe.tags.map(rt => rt.tag.slug);
      recipes.push({
        id: recipe.id,
        title: recipe.title,
        prepTimeMinutes: recipe.prep_time_minutes,
        tags,
        isFavorite: recipe.favorites.length > 0,
        lastUsedDays: usageMap.get(recipe.id),
        libraryId: library.id,
      });
    }
  }

  if (recipes.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No recipes available in your library',
    });
  }

  try {
    const result = generateMealPlanSuggestion(input, recipes);
    return result;
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message || 'Failed to generate meal plan',
    });
  }
});

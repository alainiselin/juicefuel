import { mealPlanRepo } from '../repos/mealPlanRepo';
import type { ShoppingListItem } from '../../spec/schemas';
import { parseMealPlanDateKey } from '../utils/mealPlanDates';

export const shoppingListService = {
  async generateShoppingList(mealPlanId: string, from: string, to: string) {
    const fromDate = parseMealPlanDateKey(from);
    const toDate = parseMealPlanDateKey(to);

    const entries = await mealPlanRepo.findByDateRange(mealPlanId, fromDate, toDate);

    // Aggregate ingredients from all recipes
    const aggregated = aggregateIngredients(entries);

    return {
      from,
      to,
      items: aggregated,
    };
  },
};

// Pure function for aggregation logic - easily testable
export function aggregateIngredients(
  entries: Array<{
    recipe: {
      title: string;
      ingredients: Array<{
        ingredient: { id: string; name: string };
        quantity: number | null;
        unit: string | null;
      }>;
    } | null;
  }>
): ShoppingListItem[] {
  // Build aggregation map: key = "ingredient_id|unit"
  const map = new Map<
    string,
    {
      ingredient_id: string;
      ingredient_name: string;
      total_quantity: number | null;
      unit: string | null;
      recipes: Set<string>;
    }
  >();

  for (const entry of entries) {
    if (!entry.recipe) continue; // Title-only slots contribute no ingredients.
    const recipeTitle = entry.recipe.title;

    for (const ing of entry.recipe.ingredients) {
      const key = `${ing.ingredient.id}|${ing.unit ?? 'null'}`;

      if (!map.has(key)) {
        map.set(key, {
          ingredient_id: ing.ingredient.id,
          ingredient_name: ing.ingredient.name,
          total_quantity: null,
          unit: ing.unit,
          recipes: new Set(),
        });
      }

      const item = map.get(key)!;
      item.recipes.add(recipeTitle);

      // Sum quantities only if both current and new have numeric values
      if (ing.quantity !== null) {
        if (item.total_quantity === null) {
          item.total_quantity = ing.quantity;
        } else {
          item.total_quantity += ing.quantity;
        }
      }
    }
  }

  // Convert to array and sort
  return Array.from(map.values())
    .map((item) => ({
      ingredient_id: item.ingredient_id,
      ingredient_name: item.ingredient_name,
      total_quantity: item.total_quantity,
      unit: item.unit,
      recipes: Array.from(item.recipes).sort(),
    }))
    .sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name));
}

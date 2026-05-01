import type { ShoppingListItem } from '../../spec/schemas';
import { classifyUnit } from '../utils/unitNormalization';

/**
 * Aggregate ingredients across recipes for a shopping list.
 *
 * Two normalization rules apply:
 * 1. Within the same dimension family (mass / volume / count), units are converted
 *    to a canonical (G / ML / PIECE) so e.g. `4 tbsp + 150 ml` of olive oil collapses
 *    to a single `210 ml` entry. Cross-family merges (mass <-> volume) are not done
 *    because we don't carry per-ingredient densities.
 * 2. If, for the same ingredient, there's both a quantitied entry and a null-quantity
 *    entry (any unit/family), the null-quantity entry is dropped — it's a redundant
 *    "we need some" signal once a specific amount is on the list.
 *
 * Pure function — no DB or framework imports — so the test file imports it directly.
 */
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
  type Bucket = {
    ingredient_id: string;
    ingredient_name: string;
    total_quantity: number | null;
    unit: string | null;
    recipes: Set<string>;
  };

  // Key shape:
  //   "<ingredient_id>|fam:<family>"   for known families (mass / volume / count)
  //   "<ingredient_id>|raw:<unit>"     for un-classifiable units (PACKAGE, OTHER, null)
  const map = new Map<string, Bucket>();

  for (const entry of entries) {
    if (!entry.recipe) continue; // Title-only slots contribute no ingredients.
    const recipeTitle = entry.recipe.title;

    for (const ing of entry.recipe.ingredients) {
      const classification = classifyUnit(ing.unit);
      const key = classification
        ? `${ing.ingredient.id}|fam:${classification.family}`
        : `${ing.ingredient.id}|raw:${ing.unit ?? 'null'}`;

      if (!map.has(key)) {
        map.set(key, {
          ingredient_id: ing.ingredient.id,
          ingredient_name: ing.ingredient.name,
          total_quantity: null,
          unit: classification ? classification.canonical : ing.unit,
          recipes: new Set(),
        });
      }

      const bucket = map.get(key)!;
      bucket.recipes.add(recipeTitle);

      // Convert into the canonical unit for the family before summing.
      if (ing.quantity !== null) {
        const contribution = classification
          ? ing.quantity * classification.toCanonical
          : ing.quantity;
        bucket.total_quantity =
          bucket.total_quantity === null ? contribution : bucket.total_quantity + contribution;
      }
    }
  }

  // Drop redundant null-quantity buckets when a quantitied one exists for the same ingredient.
  const buckets = Array.from(map.values());
  const hasQuantitiedFor = new Set<string>();
  for (const b of buckets) {
    if (b.total_quantity !== null) hasQuantitiedFor.add(b.ingredient_id);
  }
  const kept = buckets.filter(
    (b) => b.total_quantity !== null || !hasQuantitiedFor.has(b.ingredient_id)
  );

  return kept
    .map((item) => ({
      ingredient_id: item.ingredient_id,
      ingredient_name: item.ingredient_name,
      total_quantity: item.total_quantity,
      unit: item.unit,
      recipes: Array.from(item.recipes).sort(),
    }))
    .sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name));
}

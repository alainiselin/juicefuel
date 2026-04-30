import { describe, it, expect } from 'vitest';

// Pure function for aggregation logic - easily testable
function aggregateIngredients(
  entries: Array<{
    recipe: {
      title: string;
      ingredients: Array<{
        ingredient: { id: string; name: string };
        quantity: number | null;
        unit: string | null;
      }>;
    };
  }>
): Array<{
  ingredient_id: string;
  ingredient_name: string;
  total_quantity: number | null;
  unit: string | null;
  recipes: string[];
}> {
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

describe('aggregateIngredients', () => {
  it('should aggregate same ingredient with same unit', () => {
    const flourId = '00000000-0000-0000-0000-000000000001';
    const entries = [
      {
        recipe: {
          title: 'Recipe A',
          ingredients: [
            {
              ingredient: { id: flourId, name: 'Flour' },
              quantity: 200,
              unit: 'G',
            },
          ],
        },
      },
      {
        recipe: {
          title: 'Recipe B',
          ingredients: [
            {
              ingredient: { id: flourId, name: 'Flour' },
              quantity: 300,
              unit: 'G',
            },
          ],
        },
      },
    ];

    const result = aggregateIngredients(entries);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ingredient_id: flourId,
      ingredient_name: 'Flour',
      total_quantity: 500,
      unit: 'G',
      recipes: ['Recipe A', 'Recipe B'],
    });
  });

  it('should NOT aggregate same ingredient with different units', () => {
    const milkId = '00000000-0000-0000-0000-000000000002';
    const entries = [
      {
        recipe: {
          title: 'Recipe A',
          ingredients: [
            {
              ingredient: { id: milkId, name: 'Milk' },
              quantity: 250,
              unit: 'ML',
            },
          ],
        },
      },
      {
        recipe: {
          title: 'Recipe B',
          ingredients: [
            {
              ingredient: { id: milkId, name: 'Milk' },
              quantity: 1,
              unit: 'L',
            },
          ],
        },
      },
    ];

    const result = aggregateIngredients(entries);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      ingredient_id: milkId,
      ingredient_name: 'Milk',
      total_quantity: 250,
      unit: 'ML',
      recipes: ['Recipe A'],
    });
    expect(result).toContainEqual({
      ingredient_id: milkId,
      ingredient_name: 'Milk',
      total_quantity: 1,
      unit: 'L',
      recipes: ['Recipe B'],
    });
  });

  it('should handle null quantities without summing', () => {
    const saltId = '00000000-0000-0000-0000-000000000003';
    const entries = [
      {
        recipe: {
          title: 'Recipe A',
          ingredients: [
            {
              ingredient: { id: saltId, name: 'Salt' },
              quantity: null,
              unit: 'TSP',
            },
          ],
        },
      },
      {
        recipe: {
          title: 'Recipe B',
          ingredients: [
            {
              ingredient: { id: saltId, name: 'Salt' },
              quantity: null,
              unit: 'TSP',
            },
          ],
        },
      },
    ];

    const result = aggregateIngredients(entries);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ingredient_id: saltId,
      ingredient_name: 'Salt',
      total_quantity: null,
      unit: 'TSP',
      recipes: ['Recipe A', 'Recipe B'],
    });
  });

  it('should handle mix of null and numeric quantities', () => {
    const pepperId = '00000000-0000-0000-0000-000000000004';
    const entries = [
      {
        recipe: {
          title: 'Recipe A',
          ingredients: [
            {
              ingredient: { id: pepperId, name: 'Pepper' },
              quantity: null,
              unit: 'TSP',
            },
          ],
        },
      },
      {
        recipe: {
          title: 'Recipe B',
          ingredients: [
            {
              ingredient: { id: pepperId, name: 'Pepper' },
              quantity: 2,
              unit: 'TSP',
            },
          ],
        },
      },
    ];

    const result = aggregateIngredients(entries);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ingredient_id: pepperId,
      ingredient_name: 'Pepper',
      total_quantity: 2,
      unit: 'TSP',
      recipes: ['Recipe A', 'Recipe B'],
    });
  });

  it('should handle null units separately', () => {
    const tomatoId = '00000000-0000-0000-0000-000000000005';
    const entries = [
      {
        recipe: {
          title: 'Recipe A',
          ingredients: [
            {
              ingredient: { id: tomatoId, name: 'Tomato' },
              quantity: 3,
              unit: null,
            },
          ],
        },
      },
      {
        recipe: {
          title: 'Recipe B',
          ingredients: [
            {
              ingredient: { id: tomatoId, name: 'Tomato' },
              quantity: 2,
              unit: 'PIECE',
            },
          ],
        },
      },
    ];

    const result = aggregateIngredients(entries);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      ingredient_id: tomatoId,
      ingredient_name: 'Tomato',
      total_quantity: 3,
      unit: null,
      recipes: ['Recipe A'],
    });
    expect(result).toContainEqual({
      ingredient_id: tomatoId,
      ingredient_name: 'Tomato',
      total_quantity: 2,
      unit: 'PIECE',
      recipes: ['Recipe B'],
    });
  });

  it('should return empty array for no entries', () => {
    const result = aggregateIngredients([]);
    expect(result).toEqual([]);
  });

  it('should track multiple recipes contributing to same ingredient', () => {
    const sugarId = '00000000-0000-0000-0000-000000000006';
    const entries = [
      {
        recipe: {
          title: 'Recipe A',
          ingredients: [
            {
              ingredient: { id: sugarId, name: 'Sugar' },
              quantity: 100,
              unit: 'G',
            },
          ],
        },
      },
      {
        recipe: {
          title: 'Recipe B',
          ingredients: [
            {
              ingredient: { id: sugarId, name: 'Sugar' },
              quantity: 50,
              unit: 'G',
            },
          ],
        },
      },
      {
        recipe: {
          title: 'Recipe C',
          ingredients: [
            {
              ingredient: { id: sugarId, name: 'Sugar' },
              quantity: 75,
              unit: 'G',
            },
          ],
        },
      },
    ];

    const result = aggregateIngredients(entries);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ingredient_id: sugarId,
      ingredient_name: 'Sugar',
      total_quantity: 225,
      unit: 'G',
      recipes: ['Recipe A', 'Recipe B', 'Recipe C'],
    });
  });
});

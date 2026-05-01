import { describe, it, expect } from 'vitest';
import { aggregateIngredients } from './aggregateIngredients';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

describe('aggregateIngredients', () => {
  it('aggregates same ingredient with same unit', () => {
    const flour = id(1);
    const result = aggregateIngredients([
      {
        recipe: {
          title: 'Recipe A',
          ingredients: [
            { ingredient: { id: flour, name: 'Flour' }, quantity: 200, unit: 'G' },
          ],
        },
      },
      {
        recipe: {
          title: 'Recipe B',
          ingredients: [
            { ingredient: { id: flour, name: 'Flour' }, quantity: 300, unit: 'G' },
          ],
        },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ingredient_id: flour,
      ingredient_name: 'Flour',
      total_quantity: 500,
      unit: 'G',
      recipes: ['Recipe A', 'Recipe B'],
    });
  });

  it('converts and sums different volume units to ml', () => {
    const oil = id(2);
    const result = aggregateIngredients([
      {
        recipe: {
          title: 'Salad',
          ingredients: [
            { ingredient: { id: oil, name: 'Olive oil' }, quantity: 4, unit: 'TBSP' },
          ],
        },
      },
      {
        recipe: {
          title: 'Pasta',
          ingredients: [
            { ingredient: { id: oil, name: 'Olive oil' }, quantity: 150, unit: 'ML' },
          ],
        },
      },
    ]);

    // 4 tbsp = 60 ml, plus 150 ml = 210 ml
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ingredient_id: oil,
      unit: 'ML',
      total_quantity: 210,
      recipes: ['Pasta', 'Salad'],
    });
  });

  it('converts and sums different mass units to grams', () => {
    const sugar = id(3);
    const result = aggregateIngredients([
      {
        recipe: {
          title: 'A',
          ingredients: [
            { ingredient: { id: sugar, name: 'Sugar' }, quantity: 0.25, unit: 'KG' },
          ],
        },
      },
      {
        recipe: {
          title: 'B',
          ingredients: [
            { ingredient: { id: sugar, name: 'Sugar' }, quantity: 100, unit: 'G' },
          ],
        },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ingredient_id: sugar,
      unit: 'G',
      total_quantity: 350,
    });
  });

  it('does NOT cross-merge mass and volume — keeps separate entries', () => {
    const salt = id(4);
    const result = aggregateIngredients([
      {
        recipe: {
          title: 'A',
          ingredients: [
            { ingredient: { id: salt, name: 'Salt' }, quantity: 5, unit: 'G' },
          ],
        },
      },
      {
        recipe: {
          title: 'B',
          ingredients: [
            { ingredient: { id: salt, name: 'Salt' }, quantity: 1, unit: 'TSP' },
          ],
        },
      },
    ]);

    expect(result).toHaveLength(2);
    const masses = result.filter((r) => r.unit === 'G');
    const volumes = result.filter((r) => r.unit === 'ML');
    expect(masses).toHaveLength(1);
    expect(masses[0].total_quantity).toBe(5);
    expect(volumes).toHaveLength(1);
    expect(volumes[0].total_quantity).toBe(5); // 1 tsp = 5 ml
  });

  it('drops null-quantity entries when a quantitied entry exists for the same ingredient', () => {
    const pepper = id(5);
    const result = aggregateIngredients([
      {
        recipe: {
          title: 'A',
          ingredients: [
            { ingredient: { id: pepper, name: 'Black pepper' }, quantity: null, unit: 'G' },
          ],
        },
      },
      {
        recipe: {
          title: 'B',
          ingredients: [
            { ingredient: { id: pepper, name: 'Black pepper' }, quantity: 1, unit: 'TSP' },
          ],
        },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      unit: 'ML', // canonical for the volume tsp
      total_quantity: 5,
    });
  });

  it('keeps a null-quantity entry when there is no quantitied counterpart', () => {
    const garlic = id(6);
    const result = aggregateIngredients([
      {
        recipe: {
          title: 'A',
          ingredients: [
            { ingredient: { id: garlic, name: 'Garlic' }, quantity: null, unit: 'PIECE' },
          ],
        },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ingredient_name: 'Garlic',
      total_quantity: null,
      unit: 'PIECE',
    });
  });

  it('does not normalize unclassified units (PACKAGE / OTHER) — keeps raw', () => {
    const noodles = id(7);
    const result = aggregateIngredients([
      {
        recipe: {
          title: 'A',
          ingredients: [
            { ingredient: { id: noodles, name: 'Noodles' }, quantity: 2, unit: 'PACKAGE' },
          ],
        },
      },
      {
        recipe: {
          title: 'B',
          ingredients: [
            { ingredient: { id: noodles, name: 'Noodles' }, quantity: 1, unit: 'PACKAGE' },
          ],
        },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      unit: 'PACKAGE',
      total_quantity: 3,
    });
  });

  it('skips title-only meal slots (no recipe)', () => {
    const result = aggregateIngredients([
      { recipe: null },
      {
        recipe: {
          title: 'Real recipe',
          ingredients: [
            { ingredient: { id: id(8), name: 'Butter' }, quantity: 50, unit: 'G' },
          ],
        },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].ingredient_name).toBe('Butter');
  });

  it('returns empty array for no entries', () => {
    expect(aggregateIngredients([])).toEqual([]);
  });
});

// Shared formatting utilities for ingredients
export function formatQuantity(quantity: number | null): string {
  if (quantity === null) return '';
  if (quantity % 1 === 0) return quantity.toString();
  return quantity.toFixed(2).replace(/\.?0+$/, '');
}

export function formatUnit(unit: string | null): string {
  if (!unit) return '';
  const unitMap: Record<string, string> = {
    G: 'g',
    KG: 'kg',
    ML: 'ml',
    L: 'L',
    TBSP: 'tbsp',
    TSP: 'tsp',
    CUP: 'cup',
    PIECE: 'piece',
    PACKAGE: 'package',
    OTHER: '',
  };
  return unitMap[unit] || unit.toLowerCase();
}

export function formatQuantityUnit(quantity: number | null, unit: string | null): string {
  const q = formatQuantity(quantity);
  const u = formatUnit(unit);
  if (!q && !u) return '';
  if (!q) return u;
  if (!u) return q;
  return `${q} ${u}`;
}

// Rubric definitions for shopping list
export const SHOPPING_RUBRICS = [
  { id: 'fruits-vegetables', name: 'Fruits & Vegetables', slug: 'fruits-vegetables' },
  { id: 'bread-pastries', name: 'Bread & Pastries', slug: 'bread-pastries' },
  { id: 'milk-cheese', name: 'Milk & Cheese', slug: 'milk-cheese' },
  { id: 'meat-fish', name: 'Meat & Fish', slug: 'meat-fish' },
  { id: 'ingredients-spices', name: 'Ingredients & Spices', slug: 'ingredients-spices' },
  { id: 'grain-products', name: 'Grain Products', slug: 'grain-products' },
  { id: 'frozen-convenience', name: 'Frozen & Convenience', slug: 'frozen-convenience' },
  { id: 'snacks-sweets', name: 'Snacks & Sweets', slug: 'snacks-sweets' },
  { id: 'beverages', name: 'Beverages', slug: 'beverages' },
  { id: 'household', name: 'Household', slug: 'household' },
  { id: 'care-health', name: 'Care & Health', slug: 'care-health' },
  { id: 'pet-supplies', name: 'Pet Supplies', slug: 'pet-supplies' },
  { id: 'home-garden', name: 'Home & Garden', slug: 'home-garden' },
  { id: 'own-items', name: 'Own Items', slug: 'own-items' },
] as const;

export type RubricId = typeof SHOPPING_RUBRICS[number]['id'];

export function getRubricForItem(tags: Array<{ kind?: string; slug: string }>): RubricId {
  // Find first AISLE tag
  const aisleTag = tags.find(t => t.kind === 'AISLE');
  if (aisleTag) {
    const rubric = SHOPPING_RUBRICS.find(r => r.slug === aisleTag.slug);
    if (rubric) return rubric.id;
  }
  // Fallback to Own Items
  return 'own-items';
}

import { z } from 'zod';
import prisma from '../../../utils/prisma';
import { mealPlanRepo } from '../../../repos/mealPlanRepo';
import { shoppingListRepo } from '../../../repos/shoppingListRepo';
import { aggregateIngredients } from '../../../services/shoppingListService';
import { requireAuth } from '../../../utils/authHelpers';
import { parseMealPlanDateKey } from '../../../utils/mealPlanDates';

const BodySchema = z.object({
  meal_plan_id: z.string().uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);

  const listId = getRouterParam(event, 'id');
  if (!listId) {
    throw createError({ statusCode: 400, message: 'Shopping list ID required' });
  }

  const body = await readBody(event);
  const validation = BodySchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.flatten(),
    });
  }
  const { meal_plan_id, from, to } = validation.data;

  // Verify user has access to the shopping list AND the meal plan via household membership.
  const shoppingList = await prisma.shopping_list.findUnique({
    where: { id: listId },
    include: {
      household: {
        include: {
          members: { where: { user_id: userId } },
        },
      },
    },
  });
  if (!shoppingList || shoppingList.household.members.length === 0) {
    throw createError({ statusCode: 403, message: 'Access denied to this shopping list' });
  }

  const mealPlan = await prisma.meal_plan.findUnique({
    where: { id: meal_plan_id },
    select: { id: true, household_id: true },
  });
  if (!mealPlan || mealPlan.household_id !== shoppingList.household_id) {
    throw createError({ statusCode: 403, message: 'Meal plan not in same household as list' });
  }

  // Fetch slots in range and aggregate.
  const fromDate = parseMealPlanDateKey(from);
  const toDate = parseMealPlanDateKey(to);
  const entries = await mealPlanRepo.findByDateRange(meal_plan_id, fromDate, toDate);

  // mealPlanRepo includes recipe.ingredients[*].ingredient with default_unit. Build a
  // lookup so we can resolve null units to the ingredient's default before matching.
  // Title-only slots have no recipe, so skip them.
  const defaultUnitById = new Map<string, string>();
  for (const slot of entries) {
    if (!slot.recipe) continue;
    for (const ing of slot.recipe.ingredients) {
      if (!defaultUnitById.has(ing.ingredient.id)) {
        defaultUnitById.set(ing.ingredient.id, ing.ingredient.default_unit ?? 'PIECE');
      }
    }
  }

  const aggregated = aggregateIngredients(
    entries.map((slot) => ({
      recipe: slot.recipe
        ? {
            title: slot.recipe.title,
            ingredients: slot.recipe.ingredients.map((ing) => ({
              ingredient: { id: ing.ingredient.id, name: ing.ingredient.name },
              quantity: ing.quantity === null ? null : Number(ing.quantity),
              unit: ing.unit,
            })),
          }
        : null,
    }))
  );

  // Load current list items so we can detect existing ingredients to merge into.
  const existingList = await shoppingListRepo.findById(listId);
  if (!existingList) {
    throw createError({ statusCode: 404, message: 'Shopping list not found' });
  }

  let added = 0;
  let merged = 0;

  for (const agg of aggregated) {
    const resolvedUnit = agg.unit ?? defaultUnitById.get(agg.ingredient_id) ?? 'PIECE';

    const match = existingList.items.find(
      (it) => it.ingredient_id === agg.ingredient_id && it.unit === resolvedUnit
    );

    if (match) {
      // Sum quantities; if existing has null and aggregate has a value, use the value.
      // If both are null, leave as-is (nothing to update).
      if (agg.total_quantity !== null) {
        const newQuantity = (match.quantity === null ? 0 : Number(match.quantity)) + agg.total_quantity;
        await shoppingListRepo.updateItem(match.id, { quantity: newQuantity });
        merged++;
      }
    } else {
      await shoppingListRepo.addItem({
        shopping_list_id: listId,
        ingredient_id: agg.ingredient_id,
        quantity: agg.total_quantity ?? undefined,
        unit: resolvedUnit,
      });
      added++;
    }
  }

  // Return the refreshed list using the same shape as GET /shopping-list/[id].
  const refreshed = await shoppingListRepo.findById(listId);
  if (!refreshed) {
    throw createError({ statusCode: 404, message: 'Shopping list not found' });
  }

  return {
    added,
    merged,
    list: serializeList(refreshed),
  };
});

type RefreshedList = NonNullable<Awaited<ReturnType<typeof shoppingListRepo.findById>>>;

function serializeList(list: RefreshedList) {
  return {
    id: list.id,
    household_id: list.household_id,
    title: list.title,
    status: list.status,
    store_hint: list.store_hint,
    created_at: list.created_at.toISOString(),
    updated_at: list.updated_at.toISOString(),
    items: list.items.map((item) => {
      const baseItem = {
        id: item.id,
        shopping_list_id: item.shopping_list_id,
        ingredient_id: item.ingredient_id,
        article_id: item.article_id,
        quantity: item.quantity === null ? null : Number(item.quantity),
        unit: item.unit,
        note: item.note,
        is_checked: item.is_checked,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
      };

      if (item.ingredient) {
        return {
          ...baseItem,
          ingredient: {
            id: item.ingredient.id,
            name: item.ingredient.name,
            default_unit: item.ingredient.default_unit,
            created_at: item.ingredient.created_at.toISOString(),
            updated_at: item.ingredient.updated_at.toISOString(),
          },
          tags: [
            ...(item.ingredient.ingredient_tag || []).map((t) => ({
              id: t.tag.id,
              label: t.tag.name,
              slug: t.tag.slug,
              kind: t.tag.kind || '',
              scope: t.tag.scope || 'GLOBAL',
              household_id: t.tag.household_id,
              created_at: t.tag.created_at.toISOString(),
            })),
            ...item.shopping_list_item_tag.map((t) => ({
              id: t.tag.id,
              label: t.tag.name,
              slug: t.tag.slug,
              kind: t.tag.kind || '',
              scope: t.tag.scope || 'GLOBAL',
              household_id: t.tag.household_id,
              created_at: t.tag.created_at.toISOString(),
            })),
          ],
        };
      } else if (item.article) {
        return {
          ...baseItem,
          article: {
            id: item.article.id,
            name: item.article.name,
            default_unit: item.article.default_unit,
          },
          tags: [
            {
              id: `aisle-${item.article.default_aisle}`,
              label: item.article.default_aisle.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
              slug: item.article.default_aisle,
              kind: 'AISLE',
              scope: 'GLOBAL',
              household_id: null,
              created_at: item.article.created_at.toISOString(),
            },
            ...item.shopping_list_item_tag.map((t) => ({
              id: t.tag.id,
              label: t.tag.name,
              slug: t.tag.slug,
              kind: t.tag.kind || '',
              scope: t.tag.scope || 'GLOBAL',
              household_id: t.tag.household_id,
              created_at: t.tag.created_at.toISOString(),
            })),
          ],
        };
      }

      return baseItem;
    }),
  };
}

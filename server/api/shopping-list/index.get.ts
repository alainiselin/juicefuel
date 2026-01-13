import prisma from '../../utils/prisma';
import { shoppingListRepo } from '../../repos/shoppingListRepo';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);

  // Get user's active household
  const user = await prisma.user_profile.findUnique({
    where: { id: userId },
    select: { active_household_id: true },
  });

  if (!user?.active_household_id) {
    throw createError({
      statusCode: 404,
      message: 'No active household',
    });
  }
  
  const query = getQuery(event);
  const status = query.status as string | undefined;

  const lists = await shoppingListRepo.findByHouseholdId(user.active_household_id, status);

  return lists.map((list) => ({
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
        quantity: item.quantity,
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
            // Tags from ingredient
            ...(item.ingredient.ingredient_tag || []).map((t) => ({
              id: t.tag.id,
              label: t.tag.name,
              slug: t.tag.slug,
              kind: t.tag.kind || '',
              scope: t.tag.scope || 'GLOBAL',
              household_id: t.tag.household_id,
              created_at: t.tag.created_at.toISOString(),
            })),
            // Tags from shopping list item
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
            // Articles use their default_aisle as a pseudo-tag
            {
              id: `aisle-${item.article.default_aisle}`,
              label: item.article.default_aisle.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
              slug: item.article.default_aisle,
              kind: 'AISLE',
              scope: 'GLOBAL',
              household_id: null,
              created_at: item.article.created_at.toISOString(),
            },
            // Tags from shopping list item
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
  }));
});

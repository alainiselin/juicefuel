import { shoppingListRepo } from '../../repos/shoppingListRepo';
import { UpdateShoppingListSchema } from '../../../spec/schemas';
import { requireAuth } from '../../utils/authHelpers';

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Shopping list ID required',
    });
  }

  const body = await readBody(event);
  
  const validation = UpdateShoppingListSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid shopping list data',
      data: validation.error.flatten(),
    });
  }

  const list = await shoppingListRepo.update(id, validation.data);

  return {
    id: list.id,
    household_id: list.household_id,
    title: list.title,
    status: list.status,
    store_hint: list.store_hint,
    created_at: list.created_at.toISOString(),
    updated_at: list.updated_at.toISOString(),
    items: list.items.map((item) => ({
      id: item.id,
      shopping_list_id: item.shopping_list_id,
      ingredient_id: item.ingredient_id,
      quantity: item.quantity,
      unit: item.unit,
      is_checked: item.is_checked,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
      ingredient: {
        id: item.ingredient.id,
        name: item.ingredient.name,
        default_unit: item.ingredient.default_unit,
        created_at: item.ingredient.created_at.toISOString(),
        updated_at: item.ingredient.updated_at.toISOString(),
      },
      tags: item.shopping_list_item_tag.map((t) => ({
        id: t.tag.id,
        label: t.tag.name,
        slug: t.tag.slug,
        kind: t.tag.kind || '',
        scope: t.tag.scope || 'GLOBAL',
        household_id: t.tag.household_id,
        created_at: t.tag.created_at.toISOString(),
      })),
    })),
  };
});

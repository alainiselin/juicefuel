import { shoppingListRepo } from '../../repos/shoppingListRepo';
import { UpdateShoppingListItemSchema } from '../../../spec/schemas';
import { requireAuth } from '../../utils/authHelpers';
import prisma from '../../utils/prisma';

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  
  const itemId = getRouterParam(event, 'itemId');
  if (!itemId) {
    throw createError({
      statusCode: 400,
      message: 'Item ID required',
    });
  }

  const body = await readBody(event);
  
  const validation = UpdateShoppingListItemSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid item data',
      data: validation.error.flatten(),
    });
  }

  const currentItem = await prisma.shopping_list_item.findUnique({
    where: { id: itemId },
    include: {
      shopping_list: {
        include: {
          household: {
            include: {
              members: {
                where: { user_id: userId },
              },
            },
          },
        },
      },
    },
  });

  if (!currentItem || currentItem.shopping_list.household.members.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Shopping list item not found',
    });
  }

  const { aisle, ...itemData } = validation.data;

  if (itemData.shopping_list_id && itemData.shopping_list_id !== currentItem.shopping_list_id) {
    const targetList = await prisma.shopping_list.findUnique({
      where: { id: itemData.shopping_list_id },
      select: { household_id: true },
    });

    if (!targetList || targetList.household_id !== currentItem.shopping_list.household_id) {
      throw createError({
        statusCode: 404,
        message: 'Target shopping list not found',
      });
    }
  }

  if (aisle !== undefined) {
    await prisma.shopping_list_item_tag.deleteMany({
      where: {
        shopping_list_item_id: itemId,
        tag: { kind: 'AISLE' },
      },
    });

    if (aisle) {
      const aisleTag = await prisma.tag.findFirst({
        where: {
          slug: aisle,
          kind: 'AISLE',
          OR: [
            { scope: 'GLOBAL' },
            { scope: 'HOUSEHOLD', household_id: currentItem.shopping_list.household_id },
          ],
        },
      });

      if (!aisleTag) {
        throw createError({
          statusCode: 400,
          message: 'Aisle not found',
        });
      }

      await prisma.shopping_list_item_tag.create({
        data: {
          shopping_list_item_id: itemId,
          tag_id: aisleTag.id,
        },
      });
    }
  }

  const item: any = await shoppingListRepo.updateItem(itemId, itemData);

  const baseResponse = {
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
      ...baseResponse,
      ingredient: {
        id: item.ingredient.id,
        name: item.ingredient.name,
        default_unit: item.ingredient.default_unit,
        created_at: item.ingredient.created_at.toISOString(),
        updated_at: item.ingredient.updated_at.toISOString(),
      },
      tags: [
        // Shopping list item tags come first so item-level AISLE overrides win.
        ...item.shopping_list_item_tag.map((t: any) => ({
          id: t.tag.id,
          label: t.tag.name,
          slug: t.tag.slug,
          kind: t.tag.kind || '',
          scope: t.tag.scope || 'GLOBAL',
          household_id: t.tag.household_id,
          created_at: t.tag.created_at.toISOString(),
        })),
        // Include ingredient AISLE tags
        ...item.ingredient.ingredient_tag.map((it: any) => ({
          id: it.tag.id,
          label: it.tag.name,
          slug: it.tag.slug,
          kind: it.tag.kind || '',
          scope: it.tag.scope || 'GLOBAL',
          household_id: it.tag.household_id,
          created_at: it.tag.created_at.toISOString(),
        })),
      ],
    };
  } else if (item.article) {
    return {
      ...baseResponse,
      article: {
        id: item.article.id,
        name: item.article.name,
        default_unit: item.article.default_unit,
      },
      tags: [
        // Shopping list item tags come first so item-level AISLE overrides win.
        ...item.shopping_list_item_tag.map((t: any) => ({
          id: t.tag.id,
          label: t.tag.name,
          slug: t.tag.slug,
          kind: t.tag.kind || '',
          scope: t.tag.scope || 'GLOBAL',
          household_id: t.tag.household_id,
          created_at: t.tag.created_at.toISOString(),
        })),
        // Articles use their default_aisle as a pseudo-tag
        {
          id: `aisle-${item.article.default_aisle}`,
          label: item.article.default_aisle.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          slug: item.article.default_aisle,
          kind: 'AISLE',
          scope: 'GLOBAL',
          household_id: null,
          created_at: item.article.created_at.toISOString(),
        },
      ],
    };
  }

  throw createError({
    statusCode: 500,
    message: 'Item must have either ingredient or article',
  });
});

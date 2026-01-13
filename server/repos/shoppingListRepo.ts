import prisma from '../utils/prisma';

export const shoppingListRepo = {
  async findByHouseholdId(householdId: string, status?: string) {
    return prisma.shopping_list.findMany({
      where: {
        household_id: householdId,
        ...(status && { status }),
      },
      include: {
        items: {
          include: {
            ingredient: {
              include: {
                ingredient_tag: {
                  include: {
                    tag: true,
                  },
                },
              },
            },
            article: true,
            shopping_list_item_tag: {
              include: {
                tag: true,
              },
            },
          },
          orderBy: {
            created_at: 'asc',
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  },

  async findById(id: string) {
    return prisma.shopping_list.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            ingredient: {
              include: {
                ingredient_tag: {
                  include: {
                    tag: true,
                  },
                },
              },
            },
            article: true,
            shopping_list_item_tag: {
              include: {
                tag: true,
              },
            },
          },
          orderBy: {
            created_at: 'asc',
          },
        },
      },
    });
  },

  async create(data: {
    household_id: string;
    title: string;
    status?: string;
    store_hint?: string;
  }) {
    return prisma.shopping_list.create({
      data,
      include: {
        items: {
          include: {
            ingredient: true,
            shopping_list_item_tag: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });
  },

  async update(
    id: string,
    data: {
      title?: string;
      status?: string;
      store_hint?: string;
    }
  ) {
    return prisma.shopping_list.update({
      where: { id },
      data,
      include: {
        items: {
          include: {
            ingredient: true,
            shopping_list_item_tag: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });
  },

  async delete(id: string) {
    return prisma.shopping_list.delete({
      where: { id },
    });
  },

  async addItem(data: {
    shopping_list_id: string;
    ingredient_id?: string;
    article_id?: string;
    quantity?: number;
    unit?: string;
    note?: string;
  }) {
    // Exactly one of ingredient_id or article_id must be provided
    if ((!data.ingredient_id && !data.article_id) || (data.ingredient_id && data.article_id)) {
      throw new Error('Exactly one of ingredient_id or article_id must be provided');
    }

    let defaultUnit: string | null = 'PIECE';
    
    // Fetch default unit from ingredient or article
    if (data.ingredient_id) {
      const ingredient = await prisma.ingredient.findUnique({
        where: { id: data.ingredient_id },
        select: { default_unit: true },
      });
      defaultUnit = ingredient?.default_unit || 'PIECE';
    } else if (data.article_id) {
      const article = await prisma.shopping_article.findUnique({
        where: { id: data.article_id },
        select: { default_unit: true },
      });
      defaultUnit = article?.default_unit || 'PIECE';
    }
    
    const unit = data.unit || defaultUnit;
    
    return prisma.shopping_list_item.create({
      data: {
        shopping_list_id: data.shopping_list_id,
        ingredient_id: data.ingredient_id || null,
        article_id: data.article_id || null,
        quantity: data.quantity,
        unit: unit as any,
        note: data.note || null,
      },
      include: {
        ingredient: {
          include: {
            ingredient_tag: {
              include: {
                tag: true,
              },
            },
          },
        },
        article: true,
        shopping_list_item_tag: {
          include: {
            tag: true,
          },
        },
      },
    });
  },

  async updateItem(
    id: string,
    data: {
      quantity?: number;
      unit?: string;
      is_checked?: boolean;
      note?: string;
    }
  ) {
    return prisma.shopping_list_item.update({
      where: { id },
      data,
      include: {
        ingredient: {
          include: {
            ingredient_tag: {
              include: {
                tag: true,
              },
            },
          },
        },
        article: true,
        shopping_list_item_tag: {
          include: {
            tag: true,
          },
        },
      },
    });
  },

  async deleteItem(id: string) {
    return prisma.shopping_list_item.delete({
      where: { id },
    });
  },

  async addItemTag(shoppingListItemId: string, tagId: string) {
    return prisma.shopping_list_item_tag.create({
      data: {
        shopping_list_item_id: shoppingListItemId,
        tag_id: tagId,
      },
    });
  },

  async removeItemTag(shoppingListItemId: string, tagId: string) {
    return prisma.shopping_list_item_tag.delete({
      where: {
        shopping_list_item_id_tag_id: {
          shopping_list_item_id: shoppingListItemId,
          tag_id: tagId,
        },
      },
    });
  },
};

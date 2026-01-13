import prisma from '../utils/prisma';
import type { Prisma } from '@prisma/client';

export const recipeRepo = {
  async findMany(where?: Prisma.recipeWhereInput, tagIds?: string[]) {
    const baseWhere = where || {};
    
    // If filtering by tags (AND semantics), only return recipes with all tags
    if (tagIds && tagIds.length > 0) {
      return prisma.recipe.findMany({
        where: {
          ...baseWhere,
          tags: {
            some: {
              tag_id: { in: tagIds },
            },
          },
        },
        include: {
          ingredients: {
            include: {
              ingredient: true,
            },
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  kind: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }).then(recipes => {
        // Filter in memory for AND semantics (all tags must be present)
        return recipes.filter(recipe => {
          const recipeTags = recipe.tags.map(t => t.tag_id);
          return tagIds.every(tagId => recipeTags.includes(tagId));
        });
      });
    }

    return prisma.recipe.findMany({
      where: baseWhere,
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
                kind: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
                kind: true,
              },
            },
          },
        },
        recipe_library: {
          select: {
            id: true,
            name: true,
            household_id: true,
          },
        },
      },
    });
  },

  async create(data: {
    recipe_library_id: string;
    title: string;
    description?: string | null;
    source_url?: string | null;
    instructions_markdown?: string | null;
    ingredients?: Array<{
      ingredient_id: string;
      quantity?: number | null;
      unit?: string | null;
      note?: string | null;
    }>;
  }) {
    const { ingredients, ...recipeData } = data;
    
    return prisma.recipe.create({
      data: {
        ...recipeData,
        ingredients: ingredients
          ? {
              create: ingredients,
            }
          : undefined,
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });
  },

  async update(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      source_url?: string | null;
      instructions_markdown?: string | null;
      prep_time_minutes?: number | null;
      ingredients?: Array<{
        ingredient_id: string;
        quantity?: number | null;
        unit?: string | null;
        note?: string | null;
      }>;
    }
  ) {
    const { ingredients, ...recipeData } = data;

    // If ingredients provided, replace all
    if (ingredients !== undefined) {
      await prisma.recipe_ingredient.deleteMany({
        where: { recipe_id: id },
      });
    }

    return prisma.recipe.update({
      where: { id },
      data: {
        ...recipeData,
        ingredients:
          ingredients !== undefined
            ? {
                create: ingredients,
              }
            : undefined,
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });
  },

  async delete(id: string) {
    return prisma.recipe.delete({
      where: { id },
    });
  },

  async searchByTitle(query: string, recipeLibraryId?: string) {
    return prisma.recipe.findMany({
      where: {
        title: {
          contains: query,
          mode: 'insensitive',
        },
        recipe_library_id: recipeLibraryId,
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  },
};

import prisma from '../utils/prisma';
import type { Prisma } from '@prisma/client';

export const mealPlanRepo = {
  async findByDateRange(mealPlanId: string, from: Date, to: Date) {
    return prisma.meal_slot.findMany({
      where: {
        meal_plan_id: mealPlanId,
        date: {
          gte: from,
          lte: to,
        },
      },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { slot: 'asc' }],
    });
  },

  async findById(id: string) {
    return prisma.meal_slot.findUnique({
      where: { id },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });
  },

  async create(data: {
    meal_plan_id: string;
    date: Date;
    slot: string;
    recipe_id: string;
  }) {
    return prisma.meal_slot.create({
      data,
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
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
      date?: Date;
      slot?: string;
      recipe_id?: string;
    }
  ) {
    return prisma.meal_slot.update({
      where: { id },
      data,
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    });
  },

  async delete(id: string) {
    return prisma.meal_slot.delete({
      where: { id },
    });
  },
};

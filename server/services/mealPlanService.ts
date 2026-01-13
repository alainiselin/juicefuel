import { mealPlanRepo } from '../repos/mealPlanRepo';
import prisma from '../utils/prisma';
import type { CreateMealPlanEntryInput, UpdateMealPlanEntryInput } from '../../spec/schemas';

export const mealPlanService = {
  async getEntriesForUser(userId: string, mealPlanId: string, from: string, to: string) {
    // Verify user has access to this meal plan via household membership
    const mealPlan = await prisma.meal_plan.findUnique({
      where: { id: mealPlanId },
      include: {
        household: {
          include: {
            members: {
              where: { user_id: userId }
            }
          }
        }
      }
    });
    
    if (!mealPlan || mealPlan.household.members.length === 0) {
      throw createError({
        statusCode: 403,
        message: 'Access denied to this meal plan'
      });
    }
    
    return this.getEntries(mealPlanId, from, to);
  },

  async getEntries(mealPlanId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    return mealPlanRepo.findByDateRange(mealPlanId, fromDate, toDate);
  },

  async getEntry(id: string) {
    return mealPlanRepo.findById(id);
  },

  async createEntry(input: CreateMealPlanEntryInput) {
    return mealPlanRepo.create({
      meal_plan_id: input.meal_plan_id,
      date: new Date(input.date),
      slot: input.slot,
      recipe_id: input.recipe_id,
    });
  },

  async updateEntry(id: string, input: UpdateMealPlanEntryInput) {
    const existing = await mealPlanRepo.findById(id);
    if (!existing) {
      return null;
    }

    return mealPlanRepo.update(id, {
      date: input.date ? new Date(input.date) : undefined,
      slot: input.slot,
      recipe_id: input.recipe_id,
    });
  },

  async deleteEntry(id: string) {
    const existing = await mealPlanRepo.findById(id);
    if (!existing) {
      return false;
    }
    
    await mealPlanRepo.delete(id);
    return true;
  },
};

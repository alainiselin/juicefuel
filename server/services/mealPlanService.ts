import { mealPlanRepo } from '../repos/mealPlanRepo';
import prisma from '../utils/prisma';
import type { CreateMealPlanEntryInput, UpdateMealPlanEntryInput } from '../../spec/schemas';
import { parseMealPlanDateKey, serializeMealSlot, serializeMealSlots } from '../utils/mealPlanDates';

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
    const fromDate = parseMealPlanDateKey(from);
    const toDate = parseMealPlanDateKey(to);
    
    const entries = await mealPlanRepo.findByDateRange(mealPlanId, fromDate, toDate);
    return serializeMealSlots(entries);
  },

  async getEntry(id: string) {
    return mealPlanRepo.findById(id);
  },

  async createEntry(input: CreateMealPlanEntryInput) {
    return mealPlanRepo.create({
      meal_plan_id: input.meal_plan_id,
      date: parseMealPlanDateKey(input.date),
      slot: input.slot,
      recipe_id: input.recipe_id ?? null,
      title: input.title ?? null,
    }).then(serializeMealSlot);
  },

  async updateEntry(id: string, input: UpdateMealPlanEntryInput) {
    const existing = await mealPlanRepo.findById(id);
    if (!existing) {
      return null;
    }

    return mealPlanRepo.update(id, {
      date: input.date ? parseMealPlanDateKey(input.date) : undefined,
      slot: input.slot,
      recipe_id: input.recipe_id,
      title: input.title,
    }).then(serializeMealSlot);
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

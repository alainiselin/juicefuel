import { requireAuth } from '../../utils/authHelpers';
import prisma from '../../utils/prisma';
import type { SlotType } from '../../../spec/schemas';
import { formatMealPlanDateKey, parseMealPlanDateKey } from '../../utils/mealPlanDates';

interface ApplySlot {
  date: string;
  mealType: SlotType;
  recipeId: string;
}

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  
  const body = await readBody(event);
  const slots: ApplySlot[] = body.slots || [];
  const mealPlanId: string = body.mealPlanId;

  if (!mealPlanId || !slots.length) {
    throw createError({
      statusCode: 400,
      message: 'Missing mealPlanId or slots',
    });
  }

  // Verify user has access to this meal plan
  const mealPlan = await prisma.meal_plan.findUnique({
    where: { id: mealPlanId },
    include: {
      household: {
        include: {
          members: {
            where: { user_id: userId },
          },
        },
      },
    },
  });

  if (!mealPlan || mealPlan.household.members.length === 0) {
    throw createError({
      statusCode: 403,
      message: 'Access denied to this meal plan',
    });
  }

  // Apply slots - only fill empty slots to avoid overwriting existing entries
  const results = [];
  
  for (const slot of slots) {
    const date = parseMealPlanDateKey(slot.date);
    
    // Check if slot already has an entry
    const existing = await prisma.meal_slot.findUnique({
      where: {
        meal_plan_id_date_slot: {
          meal_plan_id: mealPlanId,
          date: date,
          slot: slot.mealType,
        },
      },
    });

    if (!existing) {
      // Create new entry
      const created = await prisma.meal_slot.create({
        data: {
          meal_plan_id: mealPlanId,
          date: date,
          slot: slot.mealType,
          recipe_id: slot.recipeId,
        },
        include: {
          recipe: {
            include: {
              tags: {
                include: {
                  tag: true,
                },
              },
              ingredients: {
                include: {
                  ingredient: true,
                },
              },
            },
          },
        },
      });
      
      results.push({
        id: created.id,
        meal_plan_id: created.meal_plan_id,
        date: formatMealPlanDateKey(created.date),
        slot: created.slot,
        recipe_id: created.recipe_id,
        recipe: created.recipe,
      });
    }
  }

  return {
    applied: results.length,
    skipped: slots.length - results.length,
    entries: results,
  };
});

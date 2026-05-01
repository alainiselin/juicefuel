import { mealPlanRepo } from '../repos/mealPlanRepo';
import { parseMealPlanDateKey } from '../utils/mealPlanDates';
import { aggregateIngredients } from './aggregateIngredients';

// Re-export so existing call-sites can keep importing from this module.
export { aggregateIngredients };

export const shoppingListService = {
  async generateShoppingList(mealPlanId: string, from: string, to: string) {
    const fromDate = parseMealPlanDateKey(from);
    const toDate = parseMealPlanDateKey(to);

    const entries = await mealPlanRepo.findByDateRange(mealPlanId, fromDate, toDate);

    return {
      from,
      to,
      items: aggregateIngredients(entries),
    };
  },
};

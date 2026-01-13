import type { SlotType } from '../../spec/schemas';

export interface GeneratorInput {
  days: number; // 1-14
  mealTypes: SlotType[]; // at least one of BREAKFAST, LUNCH, DINNER
  diet: 'none' | 'vegetarian' | 'vegan';
  favoriteRatio: number; // 0-100
  proteinFilters: string[]; // e.g., ['poultry', 'beef', 'fish', 'pork', 'game']
  effort: 'any' | 'quick' | 'normal' | 'project';
  libraryIds: string[]; // empty = all libraries
  avoidSameRecipe: boolean;
  avoidBackToBackCuisine: boolean;
  avoidBackToBackProtein: boolean;
  seed?: number; // for deterministic reroll
}

export interface RecipeCandidate {
  id: string;
  title: string;
  prepTimeMinutes?: number | null;
  tags: string[]; // tag slugs
  isFavorite: boolean;
  lastUsedDays?: number; // days since last use in planner, undefined if never used
  libraryId: string; // recipe_library_id
}

export interface GeneratedSlot {
  date: string; // ISO date string
  mealType: SlotType;
  recipeId: string;
}

export interface GenerationResult {
  suggestion: GeneratedSlot[];
  relaxedConstraints: string[]; // e.g., ['effort', 'protein', 'repeats']
}

interface WeightedRecipe {
  recipe: RecipeCandidate;
  weight: number;
}

export class MealPlanGenerator {
  private recipes: RecipeCandidate[];
  private input: GeneratorInput;
  private relaxedConstraints: string[] = [];
  private usedRecipes: Set<string> = new Set();
  private rng: () => number;

  constructor(recipes: RecipeCandidate[], input: GeneratorInput) {
    this.recipes = recipes;
    this.input = input;
    this.rng = this.createSeededRandom(input.seed ?? Date.now());
  }

  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }

  generate(): GenerationResult {
    const totalSlots = this.input.days * this.input.mealTypes.length;
    
    // Try generating with strict constraints
    let eligible = this.filterEligible(false, false, false);
    
    // Check if we have enough recipes (considering avoid repeats setting)
    const needsRelaxation = this.input.avoidSameRecipe 
      ? eligible.length < totalSlots 
      : eligible.length === 0;
    
    if (needsRelaxation) {
      return this.relaxAndRetry();
    }

    const suggestion = this.fillSlots(eligible, totalSlots);
    
    if (suggestion.length < totalSlots) {
      return this.relaxAndRetry();
    }

    return {
      suggestion,
      relaxedConstraints: this.relaxedConstraints,
    };
  }

  private relaxAndRetry(): GenerationResult {
    // Relax ladder: effort -> protein -> repeats
    const totalSlots = this.input.days * this.input.mealTypes.length;
    let eligible = this.filterEligible(false, false, false);
    const beforeRelaxCount = eligible.length;

    // Step 1: Relax effort if it's currently filtering
    if (this.input.effort !== 'any') {
      const relaxedEffort = this.filterEligible(true, false, false);
      if (relaxedEffort.length > beforeRelaxCount) {
        eligible = relaxedEffort;
        this.relaxedConstraints.push('effort');
      }
    }

    // Step 2: Relax protein if filters are active
    if (this.input.proteinFilters.length > 0 && this.input.diet === 'none') {
      const beforeProtein = eligible.length;
      const relaxedProtein = this.filterEligible(true, true, false);
      if (relaxedProtein.length > beforeProtein) {
        eligible = relaxedProtein;
        this.relaxedConstraints.push('protein');
      }
    }

    // Check if we need to allow repeats
    const needsRepeats = this.input.avoidSameRecipe && eligible.length < totalSlots;

    // Step 3: Allow repeats if necessary
    if (needsRepeats) {
      this.relaxedConstraints.push('repeats');
    }

    const suggestion = this.fillSlots(eligible, totalSlots);

    if (suggestion.length < totalSlots) {
      throw new Error('Unable to generate meal plan with available recipes');
    }

    return {
      suggestion,
      relaxedConstraints: this.relaxedConstraints,
    };
  }

  private filterEligible(
    ignoreEffort: boolean,
    ignoreProtein: boolean,
    allowRepeats: boolean
  ): RecipeCandidate[] {
    return this.recipes.filter(recipe => {
      // Library filter (if specific libraries selected)
      if (this.input.libraryIds.length > 0) {
        if (!this.input.libraryIds.includes(recipe.libraryId)) return false;
      }

      // Diet filter
      if (this.input.diet === 'vegan') {
        if (!recipe.tags.some(t => t === 'diet:vegan')) return false;
      } else if (this.input.diet === 'vegetarian') {
        if (!recipe.tags.some(t => t === 'diet:vegetarian' || t === 'diet:vegan')) return false;
      }

      // Protein filter (only if diet is none and filters selected)
      if (!ignoreProtein && this.input.diet === 'none' && this.input.proteinFilters.length > 0) {
        const hasMatchingProtein = this.input.proteinFilters.some(protein =>
          recipe.tags.includes(`protein:${protein}`)
        );
        if (!hasMatchingProtein) return false;
      }

      // Effort filter
      if (!ignoreEffort && this.input.effort !== 'any') {
        if (!this.matchesEffort(recipe)) return false;
      }

      return true;
    });
  }

  private matchesEffort(recipe: RecipeCandidate): boolean {
    const time = recipe.prepTimeMinutes;
    
    switch (this.input.effort) {
      case 'quick':
        return (time !== null && time !== undefined && time <= 20) || 
               recipe.tags.includes('time:quick');
      case 'normal':
        return (time !== null && time !== undefined && time > 20 && time <= 45) || 
               (!recipe.tags.includes('time:quick') && !recipe.tags.includes('time:weekend'));
      case 'project':
        return (time !== null && time !== undefined && time >= 46) || 
               recipe.tags.includes('time:weekend') || 
               recipe.tags.includes('technique:slow-cooked');
      default:
        return true;
    }
  }

  private fillSlots(eligible: RecipeCandidate[], totalSlots: number): GeneratedSlot[] {
    const slots: GeneratedSlot[] = [];
    const favSlots = Math.round(totalSlots * this.input.favoriteRatio / 100);
    
    const favorites = eligible.filter(r => r.isFavorite);
    const nonFavorites = eligible.filter(r => !r.isFavorite);

    // Fill favorites first
    for (let i = 0; i < favSlots && slots.length < totalSlots; i++) {
      const pool = favorites.length > 0 ? favorites : nonFavorites;
      const recipe = this.selectWeighted(pool, slots);
      if (!recipe) break;
      
      const slot = this.createSlotForRecipe(recipe, slots.length);
      slots.push(slot);
      
      if (this.input.avoidSameRecipe && !this.relaxedConstraints.includes('repeats')) {
        this.usedRecipes.add(recipe.id);
      }
    }

    // Fill remaining
    while (slots.length < totalSlots) {
      const pool = nonFavorites.length > 0 ? nonFavorites : favorites;
      const recipe = this.selectWeighted(pool, slots);
      if (!recipe) break;
      
      const slot = this.createSlotForRecipe(recipe, slots.length);
      slots.push(slot);
      
      if (this.input.avoidSameRecipe && !this.relaxedConstraints.includes('repeats')) {
        this.usedRecipes.add(recipe.id);
      }
    }

    return slots;
  }

  private selectWeighted(pool: RecipeCandidate[], existingSlots: GeneratedSlot[]): RecipeCandidate | null {
    const available = pool.filter(r => 
      !this.usedRecipes.has(r.id) || this.relaxedConstraints.includes('repeats')
    );

    if (available.length === 0) {
      // Allow repeats as fallback
      if (pool.length > 0) {
        return this.weightedSelect(pool.map(r => ({ recipe: r, weight: 1.0 })));
      }
      return null;
    }

    const weighted: WeightedRecipe[] = available.map(recipe => {
      let weight = 1.0;

      // Favorite boost
      if (recipe.isFavorite) {
        weight *= 3.0;
      }

      // Recent usage penalty
      if (recipe.lastUsedDays !== undefined) {
        if (recipe.lastUsedDays <= 3) {
          weight *= 0.15;
        } else if (recipe.lastUsedDays <= 14) {
          weight *= 0.3;
        }
      }

      // Back-to-back variety penalties
      if (existingSlots.length > 0) {
        const lastSlot = existingSlots[existingSlots.length - 1];
        const lastRecipe = this.recipes.find(r => r.id === lastSlot.recipeId);
        
        if (lastRecipe) {
          // Cuisine penalty
          if (this.input.avoidBackToBackCuisine) {
            const lastCuisine = lastRecipe.tags.find(t => t.startsWith('cuisine:'));
            const currentCuisine = recipe.tags.find(t => t.startsWith('cuisine:'));
            if (lastCuisine && currentCuisine && lastCuisine === currentCuisine) {
              weight *= 0.6;
            }
          }

          // Protein penalty
          if (this.input.avoidBackToBackProtein) {
            const lastProtein = lastRecipe.tags.find(t => t.startsWith('protein:'));
            const currentProtein = recipe.tags.find(t => t.startsWith('protein:'));
            if (lastProtein && currentProtein && lastProtein === currentProtein) {
              weight *= 0.7;
            }
          }
        }
      }

      return { recipe, weight };
    });

    return this.weightedSelect(weighted);
  }

  private weightedSelect(weighted: WeightedRecipe[]): RecipeCandidate | null {
    if (weighted.length === 0) return null;

    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let random = this.rng() * totalWeight;

    for (const item of weighted) {
      random -= item.weight;
      if (random <= 0) {
        return item.recipe;
      }
    }

    return weighted[weighted.length - 1].recipe;
  }

  private createSlotForRecipe(recipe: RecipeCandidate, slotIndex: number): GeneratedSlot {
    const mealsPerDay = this.input.mealTypes.length;
    const dayIndex = Math.floor(slotIndex / mealsPerDay);
    const mealIndex = slotIndex % mealsPerDay;

    const date = new Date();
    date.setDate(date.getDate() + dayIndex);
    const dateStr = date.toISOString().split('T')[0];

    return {
      date: dateStr,
      mealType: this.input.mealTypes[mealIndex],
      recipeId: recipe.id,
    };
  }
}

export function generateMealPlanSuggestion(
  input: GeneratorInput,
  recipes: RecipeCandidate[]
): GenerationResult {
  const generator = new MealPlanGenerator(recipes, input);
  return generator.generate();
}

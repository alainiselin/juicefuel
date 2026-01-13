import { describe, it, expect } from 'vitest';
import { generateMealPlanSuggestion, type GeneratorInput, type RecipeCandidate } from '../server/services/mealPlanGenerator';

describe('MealPlanGenerator', () => {
  const mockRecipes: RecipeCandidate[] = [
    {
      id: '1',
      title: 'Chicken Stir Fry',
      prepTimeMinutes: 25,
      tags: ['cuisine:asian', 'protein:poultry', 'time:quick'],
      isFavorite: true,
      lastUsedDays: undefined,
    },
    {
      id: '2',
      title: 'Beef Tacos',
      prepTimeMinutes: 30,
      tags: ['cuisine:mexican', 'protein:beef'],
      isFavorite: false,
      lastUsedDays: undefined,
    },
    {
      id: '3',
      title: 'Veggie Pasta',
      prepTimeMinutes: 20,
      tags: ['cuisine:italian', 'diet:vegetarian'],
      isFavorite: true,
      lastUsedDays: 2,
    },
    {
      id: '4',
      title: 'Tofu Curry',
      prepTimeMinutes: 35,
      tags: ['cuisine:indian', 'diet:vegan', 'protein:tofu'],
      isFavorite: false,
      lastUsedDays: undefined,
    },
    {
      id: '5',
      title: 'Grilled Salmon',
      prepTimeMinutes: 18,
      tags: ['cuisine:american', 'protein:fish', 'time:quick'],
      isFavorite: false,
      lastUsedDays: 10,
    },
  ];

  it('should generate a basic meal plan', () => {
    const input: GeneratorInput = {
      days: 3,
      mealTypes: ['LUNCH', 'DINNER'],
      diet: 'none',
      favoriteRatio: 50,
      proteinFilters: [],
      effort: 'any',
      avoidSameRecipe: true,
      avoidBackToBackCuisine: false,
      avoidBackToBackProtein: false,
      seed: 12345,
    };

    const result = generateMealPlanSuggestion(input, mockRecipes);

    expect(result.suggestion).toHaveLength(6); // 3 days * 2 meals
    
    // With 5 recipes and 6 slots, repeats will be needed
    expect(result.relaxedConstraints).toContain('repeats');
    
    // Check we got 6 filled slots
    const recipeIds = result.suggestion.map(s => s.recipeId);
    expect(recipeIds.length).toBe(6);
  });

  it('should respect vegetarian diet filter', () => {
    const input: GeneratorInput = {
      days: 2,
      mealTypes: ['DINNER'],
      diet: 'vegetarian',
      favoriteRatio: 0,
      proteinFilters: [],
      effort: 'any',
      avoidSameRecipe: true,
      avoidBackToBackCuisine: false,
      avoidBackToBackProtein: false,
      seed: 12345,
    };

    const result = generateMealPlanSuggestion(input, mockRecipes);

    expect(result.suggestion).toHaveLength(2);
    
    // Check only vegetarian/vegan recipes used
    const usedRecipes = result.suggestion.map(s => 
      mockRecipes.find(r => r.id === s.recipeId)
    );
    
    usedRecipes.forEach(recipe => {
      expect(recipe?.tags.some(t => t === 'diet:vegetarian' || t === 'diet:vegan')).toBe(true);
    });
  });

  it('should respect vegan diet filter', () => {
    const input: GeneratorInput = {
      days: 1,
      mealTypes: ['DINNER'],
      diet: 'vegan',
      favoriteRatio: 0,
      proteinFilters: [],
      effort: 'any',
      avoidSameRecipe: true,
      avoidBackToBackCuisine: false,
      avoidBackToBackProtein: false,
      seed: 12345,
    };

    const result = generateMealPlanSuggestion(input, mockRecipes);

    expect(result.suggestion).toHaveLength(1);
    
    const usedRecipe = mockRecipes.find(r => r.id === result.suggestion[0].recipeId);
    expect(usedRecipe?.tags).toContain('diet:vegan');
  });

  it('should apply protein filter', () => {
    const input: GeneratorInput = {
      days: 1,
      mealTypes: ['DINNER'],
      diet: 'none',
      favoriteRatio: 0,
      proteinFilters: ['fish'],
      effort: 'any',
      avoidSameRecipe: true,
      avoidBackToBackCuisine: false,
      avoidBackToBackProtein: false,
      seed: 12345,
    };

    const result = generateMealPlanSuggestion(input, mockRecipes);

    // Should only use fish recipe
    result.suggestion.forEach(slot => {
      const recipe = mockRecipes.find(r => r.id === slot.recipeId);
      expect(recipe?.tags).toContain('protein:fish');
    });
  });

  it('should respect quick effort filter', () => {
    const input: GeneratorInput = {
      days: 2,
      mealTypes: ['DINNER'],
      diet: 'none',
      favoriteRatio: 0,
      proteinFilters: [],
      effort: 'quick',
      avoidSameRecipe: true,
      avoidBackToBackCuisine: false,
      avoidBackToBackProtein: false,
      seed: 12345,
    };

    const result = generateMealPlanSuggestion(input, mockRecipes);

    result.suggestion.forEach(slot => {
      const recipe = mockRecipes.find(r => r.id === slot.recipeId);
      const isQuick = (recipe!.prepTimeMinutes! <= 20) || recipe!.tags.includes('time:quick');
      expect(isQuick).toBe(true);
    });
  });

  it('should relax constraints when necessary', () => {
    const limitedRecipes: RecipeCandidate[] = [
      {
        id: '1',
        title: 'Only Recipe',
        prepTimeMinutes: 60,
        tags: ['cuisine:french'],
        isFavorite: false,
        lastUsedDays: undefined,
      },
    ];

    const input: GeneratorInput = {
      days: 3,
      mealTypes: ['DINNER'],
      diet: 'none',
      favoriteRatio: 0,
      proteinFilters: [],
      effort: 'quick', // This will need relaxing
      avoidSameRecipe: true,
      avoidBackToBackCuisine: false,
      avoidBackToBackProtein: false,
      seed: 12345,
    };

    const result = generateMealPlanSuggestion(input, limitedRecipes);

    expect(result.suggestion).toHaveLength(3);
    expect(result.relaxedConstraints).toContain('effort');
    expect(result.relaxedConstraints).toContain('repeats');
  });

  it('should throw error if no recipes available', () => {
    const input: GeneratorInput = {
      days: 1,
      mealTypes: ['DINNER'],
      diet: 'vegan',
      favoriteRatio: 0,
      proteinFilters: [],
      effort: 'any',
      avoidSameRecipe: true,
      avoidBackToBackCuisine: false,
      avoidBackToBackProtein: false,
      seed: 12345,
    };

    const noVeganRecipes: RecipeCandidate[] = [
      {
        id: '1',
        title: 'Steak',
        prepTimeMinutes: 30,
        tags: ['protein:beef'],
        isFavorite: false,
        lastUsedDays: undefined,
      },
    ];

    expect(() => {
      generateMealPlanSuggestion(input, noVeganRecipes);
    }).toThrow();
  });

  it('should generate consistent results with same seed', () => {
    const input: GeneratorInput = {
      days: 2,
      mealTypes: ['LUNCH', 'DINNER'],
      diet: 'none',
      favoriteRatio: 50,
      proteinFilters: [],
      effort: 'any',
      avoidSameRecipe: true,
      avoidBackToBackCuisine: false,
      avoidBackToBackProtein: false,
      seed: 99999,
    };

    const result1 = generateMealPlanSuggestion(input, mockRecipes);
    const result2 = generateMealPlanSuggestion(input, mockRecipes);

    expect(result1.suggestion).toEqual(result2.suggestion);
  });

  it('should favor favorites when ratio is high', () => {
    const input: GeneratorInput = {
      days: 3,
      mealTypes: ['DINNER'],
      diet: 'none',
      favoriteRatio: 100,
      proteinFilters: [],
      effort: 'any',
      avoidSameRecipe: true,
      avoidBackToBackCuisine: false,
      avoidBackToBackProtein: false,
      seed: 12345,
    };

    const result = generateMealPlanSuggestion(input, mockRecipes);

    // Check that favorites are prioritized
    const usedRecipes = result.suggestion.map(s => 
      mockRecipes.find(r => r.id === s.recipeId)
    );
    
    const favoriteCount = usedRecipes.filter(r => r?.isFavorite).length;
    expect(favoriteCount).toBeGreaterThan(0);
  });
});

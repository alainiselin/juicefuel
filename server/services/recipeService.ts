import { recipeRepo } from '../repos/recipeRepo';
import prisma from '../utils/prisma';
import type { CreateRecipeInput, UpdateRecipeInput } from '../../spec/schemas';

export const recipeService = {
  async getUserAccessibleLibraryIds(userId: string): Promise<string[]> {
    // Get user's household libraries
    const households = await prisma.household_member.findMany({
      where: { user_id: userId },
      include: { household: { include: { recipe_libraries: true } } }
    });
    
    const householdLibraryIds = households.flatMap(h => 
      h.household.recipe_libraries.map(l => l.id)
    );

    // Get public library IDs
    const publicLibraries = await prisma.recipe_library.findMany({
      where: { is_public: true },
      select: { id: true },
    });

    const publicLibraryIds = publicLibraries.map(l => l.id);

    // Combine and dedupe
    return [...new Set([...householdLibraryIds, ...publicLibraryIds])];
  },

  async getUserRecipeLibraryIds(userId: string): Promise<string[]> {
    const households = await prisma.household_member.findMany({
      where: { user_id: userId },
      include: { household: { include: { recipe_libraries: true } } }
    });
    
    return households.flatMap(h => 
      h.household.recipe_libraries.map(l => l.id)
    );
  },

  async listRecipes(query?: string, recipeLibraryId?: string) {
    if (query) {
      return recipeRepo.searchByTitle(query, recipeLibraryId);
    }
    
    const where = recipeLibraryId ? { recipe_library_id: recipeLibraryId } : undefined;
    return recipeRepo.findMany(where);
  },

  async listRecipesForUser(userId: string, query?: string, libraryId?: string) {
    const libraryIds = await this.getUserAccessibleLibraryIds(userId);
    
    if (libraryIds.length === 0) {
      return [];
    }

    // If specific library requested, verify user has access
    if (libraryId) {
      if (!libraryIds.includes(libraryId)) {
        return []; // User doesn't have access to this library
      }
      
      if (query) {
        return recipeRepo.searchByTitle(query, libraryId);
      }
      
      return recipeRepo.findMany({
        recipe_library_id: libraryId
      });
    }
    
    // Otherwise return all accessible recipes
    if (query) {
      return recipeRepo.searchByTitle(query, undefined, libraryIds);
    }
    
    return recipeRepo.findMany({
      recipe_library_id: { in: libraryIds }
    });
  },

  async getRecipe(id: string) {
    return recipeRepo.findById(id);
  },

  async createRecipe(input: CreateRecipeInput) {
    // Normalize description - treat empty string as null
    const description = input.description && input.description.trim()
      ? input.description.trim().replace(/\n/g, ' ').slice(0, 240)
      : null;

    return recipeRepo.create({
      recipe_library_id: input.recipe_library_id,
      title: input.title,
      description,
      source_url: input.source_url || null,
      instructions_markdown: input.instructions_markdown || null,
      ingredients: input.ingredients?.map((ing) => ({
        ingredient_id: ing.ingredient_id,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? null,
        note: ing.note ?? null,
      })),
    });
  },

  async updateRecipe(id: string, input: UpdateRecipeInput) {
    const existing = await recipeRepo.findById(id);
    if (!existing) {
      return null;
    }

    const updateData: any = {};
    
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description && input.description.trim()
        ? input.description.trim().replace(/\n/g, ' ').slice(0, 240)
        : null;
    }
    
    if (input.source_url !== undefined) {
      updateData.source_url = input.source_url || null;
    }

    if (input.base_servings !== undefined) {
      updateData.base_servings = input.base_servings || null;
    }
    
    if (input.instructions_markdown !== undefined) {
      updateData.instructions_markdown = input.instructions_markdown || null;
    }
    
    if (input.prep_time_minutes !== undefined) {
      updateData.prep_time_minutes = input.prep_time_minutes || null;
    }
    
    if (input.ingredients !== undefined) {
      updateData.ingredients = input.ingredients.map((ing) => ({
        ingredient_id: ing.ingredient_id,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? null,
        note: ing.note ?? null,
      }));
    }

    return recipeRepo.update(id, updateData);
  },

  async deleteRecipe(id: string) {
    const existing = await recipeRepo.findById(id);
    if (!existing) {
      return false;
    }
    
    await recipeRepo.delete(id);
    return true;
  },
};

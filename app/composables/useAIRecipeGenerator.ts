export interface AIRecipeConstraints {
  diet_slugs?: string[];
  allergen_slugs?: string[];
  max_total_minutes?: number | null;
  skill_level?: 'easy' | 'medium' | 'hard' | null;
}

export interface GenerateRecipeRequest {
  household_id: string;
  query: string;
  servings?: number | null;
  constraints?: AIRecipeConstraints;
}

export interface GenerateRecipeFromUrlRequest {
  household_id: string;
  url: string;
  servings?: number | null;
}

export interface RecipeDraft {
  title: string;
  description: string;
  servings: number;
  times: {
    prep_min: number;
    cook_min: number;
    total_min: number;
  };
  ingredients: Array<{
    name: string;
    amount: number | null;
    unit: string | null;
    note: string | null;
  }>;
  steps: Array<{
    order: number;
    text: string;
  }>;
  tags: {
    CUISINE: string[];
    FLAVOR: string[];
    DIET: string[];
    ALLERGEN: string[];
    TECHNIQUE: string[];
    TIME: string[];
    COST: string[];
  };
  warnings?: string[];
  ai: {
    generated: true;
    model: string;
  };
}

export interface GenerateRecipeResponse {
  draft: RecipeDraft;
  source_url?: string;
  import?: {
    extraction_method: 'json-ld' | 'microdata' | 'html-metadata';
    title: string | null;
    ingredient_count: number;
    step_count: number;
  };
  meta: {
    model: string;
    prompt_version: string;
    input_tokens: number | null;
    output_tokens: number | null;
    total_tokens: number | null;
    estimated_cost_usd: number | null;
  };
}

export interface SaveDraftRequest {
  household_id: string;
  recipe_library_id: string;
  draft: RecipeDraft;
  source_url?: string | null;
}

export const useAIRecipeGenerator = () => {
  const generating = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  const lastGenerated = ref<GenerateRecipeResponse | null>(null);

  const generate = async (request: GenerateRecipeRequest): Promise<GenerateRecipeResponse | null> => {
    generating.value = true;
    error.value = null;

    try {
      const response = await $fetch<GenerateRecipeResponse>('/api/recipes/generate', {
        method: 'POST',
        body: request,
      });

      lastGenerated.value = response;
      return response;
    } catch (e: any) {
      console.error('Failed to generate recipe:', e);
      error.value = e.data?.message || e.message || 'Failed to generate recipe';
      return null;
    } finally {
      generating.value = false;
    }
  };

  const generateFromUrl = async (request: GenerateRecipeFromUrlRequest): Promise<GenerateRecipeResponse | null> => {
    generating.value = true;
    error.value = null;

    try {
      const response = await $fetch<GenerateRecipeResponse>('/api/recipes/generate/from-url', {
        method: 'POST',
        body: request,
      });

      lastGenerated.value = response;
      return response;
    } catch (e: any) {
      console.error('Failed to import recipe from URL:', e);
      error.value = e.data?.message || e.message || 'Failed to import recipe from URL';
      return null;
    } finally {
      generating.value = false;
    }
  };

  const save = async (request: SaveDraftRequest): Promise<any> => {
    saving.value = true;
    error.value = null;

    try {
      const recipe = await $fetch('/api/recipes/generate/save', {
        method: 'POST',
        body: request,
      });

      return recipe;
    } catch (e: any) {
      console.error('Failed to save recipe:', e);
      error.value = e.data?.message || e.message || 'Failed to save recipe';
      return null;
    } finally {
      saving.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    generating: readonly(generating),
    saving: readonly(saving),
    error: readonly(error),
    lastGenerated: readonly(lastGenerated),
    generate,
    generateFromUrl,
    save,
    clearError,
  };
};

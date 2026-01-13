import { recipeService } from '../../services/recipeService';
import { CreateRecipeSchema } from '../../../spec/schemas';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  const validation = CreateRecipeSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe data',
      data: validation.error.flatten(),
    });
  }

  const recipe = await recipeService.createRecipe(validation.data);

  setResponseStatus(event, 201);
  return recipe;
});

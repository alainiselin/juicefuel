import { z } from 'zod';
import { requireAuth } from '../../../utils/authHelpers';
import prisma from '../../../utils/prisma';
import { importRecipeFromUrl } from '../../../services/recipeUrlImporter';
import type { GenerateRecipeInput } from '../../../services/aiRecipeGenerator';

const GenerateFromUrlRequestSchema = z.object({
  household_id: z.string().uuid(),
  url: z.string().url().max(2000),
  servings: z.number().int().positive().nullable().optional(),
});

const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitCache.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitCache.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const body = await readBody(event);

  const validation = GenerateFromUrlRequestSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request data',
      data: validation.error.flatten(),
    });
  }

  const { household_id, url, servings } = validation.data;

  const member = await prisma.household_member.findUnique({
    where: {
      household_id_user_id: {
        household_id,
        user_id: userId,
      },
    },
  });

  if (!member) {
    throw createError({
      statusCode: 403,
      message: 'Access denied to this household',
    });
  }

  const userKey = `ai-recipe-url:user:${userId}`;
  const householdKey = `ai-recipe-url:household:${household_id}`;
  const dayMs = 24 * 60 * 60 * 1000;

  if (!checkRateLimit(userKey, 10, dayMs)) {
    throw createError({
      statusCode: 429,
      message: 'User URL import limit exceeded (10 per day)',
    });
  }

  if (!checkRateLimit(householdKey, 60, dayMs)) {
    throw createError({
      statusCode: 429,
      message: 'Household URL import limit exceeded (60 per day)',
    });
  }

  const tagKinds = ['CUISINE', 'FLAVOR', 'DIET', 'ALLERGEN', 'TECHNIQUE', 'TIME', 'COST'];
  const tags = await prisma.tag.findMany({
    where: {
      kind: { in: tagKinds },
      OR: [
        { scope: 'GLOBAL' },
        { scope: 'HOUSEHOLD', household_id },
      ],
    },
    select: {
      kind: true,
      slug: true,
    },
    orderBy: { name: 'asc' },
  });

  const tagAllowlist: GenerateRecipeInput['tagAllowlist'] = {
    CUISINE: [],
    FLAVOR: [],
    DIET: [],
    ALLERGEN: [],
    TECHNIQUE: [],
    TIME: [],
    COST: [],
  };

  for (const tag of tags) {
    const kind = tag.kind as keyof GenerateRecipeInput['tagAllowlist'] | null;
    if (kind && kind in tagAllowlist) {
      tagAllowlist[kind].push(tag.slug);
    }
  }

  try {
    const result = await importRecipeFromUrl({
      url,
      servings: servings ?? null,
      tagAllowlist,
    });

    console.log('[API] Recipe imported from URL', {
      userId,
      household_id,
      url: result.source_url,
      model: result.meta.model,
      tokens: result.meta.total_tokens,
      extractionMethod: result.import.extraction_method,
    });

    return result;
  } catch (error: any) {
    console.error('[AI Recipe URL Import] failed', {
      userId,
      household_id,
      url,
      status: error?.status,
      code: error?.code,
      message: error?.message,
    });

    const isMissingKey = error?.message === 'OPENAI_API_KEY environment variable is not set';
    const isModelConfig = error?.status === 404 || error?.code === 'model_not_found';
    const isRateLimited = error?.status === 429;
    const isImportProblem = typeof error?.message === 'string'
      && (
        error.message.includes('Recipe URL')
        || error.message.includes('recipe data')
        || error.message.includes('recipe page')
        || error.message.includes('Could not load')
      );

    throw createError({
      statusCode: isImportProblem ? 422 : isRateLimited ? 429 : 503,
      message: isMissingKey
        ? 'AI recipe import is not configured yet.'
        : isModelConfig
          ? 'AI recipe import is configured with an unavailable model.'
          : isRateLimited
            ? 'AI recipe import is temporarily rate limited. Please try again shortly.'
            : isImportProblem
              ? error.message
              : 'AI recipe import is temporarily unavailable. Please try again shortly.',
      data: {
        code: isMissingKey
          ? 'AI_NOT_CONFIGURED'
          : isModelConfig
            ? 'AI_MODEL_UNAVAILABLE'
            : isRateLimited
              ? 'AI_RATE_LIMITED'
              : isImportProblem
                ? 'RECIPE_IMPORT_UNAVAILABLE'
                : 'AI_PROVIDER_UNAVAILABLE',
      },
    });
  }
});

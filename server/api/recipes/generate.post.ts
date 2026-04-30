import { z } from 'zod';
import { requireAuth } from '../../utils/authHelpers';
import prisma from '../../utils/prisma';
import { generateRecipe } from '../../services/aiRecipeGenerator';
import type { GenerateRecipeInput } from '../../services/aiRecipeGenerator';

const GenerateRequestSchema = z.object({
  household_id: z.string().uuid(),
  query: z.string().min(1).max(500),
  servings: z.number().int().positive().nullable().optional(),
  constraints: z
    .object({
      diet_slugs: z.array(z.string()).optional(),
      allergen_slugs: z.array(z.string()).optional(),
      max_total_minutes: z.number().int().positive().nullable().optional(),
      skill_level: z.enum(['easy', 'medium', 'hard']).nullable().optional(),
    })
    .optional(),
});

// Rate limiting cache (in-memory for now)
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

  const validation = GenerateRequestSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request data',
      data: validation.error.flatten(),
    });
  }

  const { household_id, query, servings, constraints } = validation.data;

  console.log('[AI Recipe Gen] userId:', userId, 'household_id:', household_id);

  // Verify user is member of household
  const member = await prisma.household_member.findUnique({
    where: {
      household_id_user_id: {
        household_id,
        user_id: userId,
      },
    },
  });

  console.log('[AI Recipe Gen] member found:', !!member);

  if (!member) {
    throw createError({
      statusCode: 403,
      message: 'Access denied to this household',
    });
  }

  // Rate limiting
  const userKey = `ai-recipe:user:${userId}`;
  const householdKey = `ai-recipe:household:${household_id}`;
  const dayMs = 24 * 60 * 60 * 1000;

  if (!checkRateLimit(userKey, 10, dayMs)) {
    throw createError({
      statusCode: 429,
      message: 'User rate limit exceeded (10 per day)',
    });
  }

  if (!checkRateLimit(householdKey, 60, dayMs)) {
    throw createError({
      statusCode: 429,
      message: 'Household rate limit exceeded (60 per day)',
    });
  }

  // Fetch tag allowlist for household
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

  // Group tags by kind
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

  // Generate recipe
  let result;
  try {
    result = await generateRecipe({
      query,
      servings: servings ?? null,
      constraints: constraints ?? undefined,
      tagAllowlist,
    });
  } catch (error: any) {
    console.error('[AI Recipe Gen] generation failed', {
      userId,
      household_id,
      status: error?.status,
      code: error?.code,
      message: error?.message,
    });

    const isMissingKey = error?.message === 'OPENAI_API_KEY environment variable is not set';
    const isModelConfig = error?.status === 404 || error?.code === 'model_not_found';
    const isRateLimited = error?.status === 429;

    throw createError({
      statusCode: isRateLimited ? 429 : 503,
      message: isMissingKey
        ? 'AI recipe generation is not configured yet.'
        : isModelConfig
          ? 'AI recipe generation is configured with an unavailable model.'
          : isRateLimited
            ? 'AI recipe generation is temporarily rate limited. Please try again shortly.'
            : 'AI recipe generation is temporarily unavailable. Please try again shortly.',
      data: {
        code: isMissingKey
          ? 'AI_NOT_CONFIGURED'
          : isModelConfig
            ? 'AI_MODEL_UNAVAILABLE'
            : isRateLimited
              ? 'AI_RATE_LIMITED'
              : 'AI_PROVIDER_UNAVAILABLE',
      },
    });
  }

  // Log usage
  console.log('[API] Recipe generated', {
    userId,
    household_id,
    query,
    model: result.meta.model,
    tokens: result.meta.total_tokens,
    cost: result.meta.estimated_cost_usd,
  });

  return result;
});

import OpenAI from 'openai';
import { z } from 'zod';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Zod schema for AI-generated recipe draft
export const RecipeDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string().max(240),
  servings: z.number().int().positive(),
  times: z.object({
    prep_min: z.number().int().nonnegative(),
    cook_min: z.number().int().nonnegative(),
    total_min: z.number().int().positive(),
  }),
  ingredients: z.array(
    z.object({
      name: z.string(),
      amount: z.number().nullable(),
      unit: z.string().nullable(),
      note: z.string().nullable(),
    })
  ),
  steps: z.array(
    z.object({
      order: z.number().int().positive(),
      text: z.string(),
    })
  ),
  tags: z.object({
    CUISINE: z.array(z.string()).default([]),
    FLAVOR: z.array(z.string()).default([]),
    DIET: z.array(z.string()).default([]),
    ALLERGEN: z.array(z.string()).default([]),
    TECHNIQUE: z.array(z.string()).default([]),
    TIME: z.array(z.string()).default([]),
    COST: z.array(z.string()).default([]),
  }),
  warnings: z.array(z.string()).optional().default([]),
  ai: z.object({
    generated: z.literal(true),
    model: z.string(),
  }),
});

export type RecipeDraft = z.infer<typeof RecipeDraftSchema>;

export interface GenerateRecipeInput {
  query: string;
  servings?: number | null;
  constraints?: {
    diet_slugs?: string[];
    allergen_slugs?: string[];
    max_total_minutes?: number | null;
    skill_level?: 'easy' | 'medium' | 'hard' | null;
  };
  tagAllowlist: {
    CUISINE: string[];
    FLAVOR: string[];
    DIET: string[];
    ALLERGEN: string[];
    TECHNIQUE: string[];
    TIME: string[];
    COST: string[];
  };
}

export interface GenerateRecipeResult {
  draft: RecipeDraft;
  meta: {
    model: string;
    prompt_version: string;
    input_tokens: number | null;
    output_tokens: number | null;
    total_tokens: number | null;
    estimated_cost_usd: number | null;
  };
}

function buildSystemPrompt(input: GenerateRecipeInput, model: string): string {
  const { tagAllowlist, constraints } = input;
  
  let prompt = `You are a professional recipe generator. Generate a complete, detailed recipe in STRICT JSON format only.

CRITICAL RULES:
1. Output ONLY valid JSON. No markdown code blocks. No explanations. No extra text.
2. Follow the exact schema structure provided.
3. Use ONLY tags from the allowlist provided for each kind.
4. Ingredient names must be lowercase and normalized.
5. Steps must be numbered starting from 1 and be clear and actionable.
6. Times must be realistic (prep_min + cook_min should roughly equal total_min).

TAG ALLOWLISTS (use ONLY these slugs):
- CUISINE: ${tagAllowlist.CUISINE.slice(0, 30).join(', ')}
- FLAVOR: ${tagAllowlist.FLAVOR.slice(0, 20).join(', ')}
- DIET: ${tagAllowlist.DIET.slice(0, 15).join(', ')}
- ALLERGEN: ${tagAllowlist.ALLERGEN.slice(0, 15).join(', ')}
- TECHNIQUE: ${tagAllowlist.TECHNIQUE.slice(0, 20).join(', ')}
- TIME: ${tagAllowlist.TIME.slice(0, 10).join(', ')}
- COST: ${tagAllowlist.COST.slice(0, 10).join(', ')}

CONSTRAINTS:`;

  if (constraints?.diet_slugs && constraints.diet_slugs.length > 0) {
    prompt += `\n- Diet requirements: ${constraints.diet_slugs.join(', ')}`;
  }
  if (constraints?.allergen_slugs && constraints.allergen_slugs.length > 0) {
    prompt += `\n- Avoid allergens: ${constraints.allergen_slugs.join(', ')}`;
  }
  if (constraints?.max_total_minutes) {
    prompt += `\n- Maximum total time: ${constraints.max_total_minutes} minutes`;
  }
  if (constraints?.skill_level) {
    prompt += `\n- Skill level: ${constraints.skill_level}`;
  }

  prompt += `

UNITS ALLOWED: g, kg, ml, l, tbsp, tsp, cup, piece, package, or null

IMPORTANT - DESCRIPTION FIELD:
- Generate a concise, appealing description (max 240 characters, 1-2 sentences)
- Description should entice the reader and summarize the dish
- Do NOT include the description in the steps or instructions
- The description is separate from cooking steps

Output JSON structure:
{
  "title": "Recipe Name",
  "description": "A concise 1-2 sentence description of the dish (max 240 chars)",
  "servings": 2,
  "times": {
    "prep_min": 15,
    "cook_min": 30,
    "total_min": 45
  },
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": 200,
      "unit": "g",
      "note": "optional note"
    }
  ],
  "steps": [
    {
      "order": 1,
      "text": "Step instructions"
    }
  ],
  "tags": {
    "CUISINE": ["slug1"],
    "FLAVOR": ["slug2"],
    "DIET": [],
    "ALLERGEN": [],
    "TECHNIQUE": ["slug3"],
    "TIME": [],
    "COST": []
  },
  "warnings": [],
  "ai": {
    "generated": true,
    "model": "${model}"
  }
}`;

  return prompt;
}

function buildUserPrompt(input: GenerateRecipeInput): string {
  let prompt = `Generate a recipe for: ${input.query}`;
  
  if (input.servings) {
    prompt += `\nServings: ${input.servings}`;
  }
  
  prompt += '\n\nReturn ONLY the JSON object. No other text.';
  
  return prompt;
}

function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  // Pricing for gpt-4o-mini (as of 2024): $0.15 / 1M input, $0.60 / 1M output
  const inputCostPer1M = 0.15;
  const outputCostPer1M = 0.60;
  
  const inputCost = (inputTokens / 1_000_000) * inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * outputCostPer1M;
  
  return inputCost + outputCost;
}

export async function generateRecipe(
  input: GenerateRecipeInput
): Promise<GenerateRecipeResult> {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini-2025-04-14';
  const systemPrompt = buildSystemPrompt(input, model);
  const userPrompt = buildUserPrompt(input);

  console.log('[AI Recipe Generator] Starting generation', {
    query: input.query,
    model,
  });

  try {
    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    const usage = response.usage;
    const inputTokens = usage?.prompt_tokens ?? null;
    const outputTokens = usage?.completion_tokens ?? null;
    const totalTokens = usage?.total_tokens ?? null;
    const estimatedCost = inputTokens && outputTokens 
      ? estimateCost(inputTokens, outputTokens, model)
      : null;

    console.log('[AI Recipe Generator] Generation complete', {
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
    });

    // Parse and validate JSON
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('[AI Recipe Generator] JSON parse error', e);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate against schema
    const validation = RecipeDraftSchema.safeParse(parsed);
    
    if (!validation.success) {
      console.error('[AI Recipe Generator] Validation error', validation.error);
      
      // Retry once with repair prompt
      console.log('[AI Recipe Generator] Attempting repair with validation errors');
      
      const repairPrompt = `The previous JSON had validation errors:
${JSON.stringify(validation.error.format(), null, 2)}

Please output a CORRECTED JSON object that matches the schema. No explanations.`;

      const repairResponse = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content },
          { role: 'user', content: repairPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1800,
        response_format: { type: 'json_object' },
      });

      const repairedContent = repairResponse.choices[0]?.message?.content;
      if (!repairedContent) {
        throw new Error('No content from repair attempt');
      }

      const repairedParsed = JSON.parse(repairedContent);
      const repairedValidation = RecipeDraftSchema.safeParse(repairedParsed);
      
      if (!repairedValidation.success) {
        console.error('[AI Recipe Generator] Repair failed', repairedValidation.error);
        throw new Error('AI generated invalid recipe structure after repair');
      }

      // Update usage stats for repair attempt
      const repairUsage = repairResponse.usage;
      const totalInput = (inputTokens ?? 0) + (repairUsage?.prompt_tokens ?? 0);
      const totalOutput = (outputTokens ?? 0) + (repairUsage?.completion_tokens ?? 0);
      const totalAll = (totalTokens ?? 0) + (repairUsage?.total_tokens ?? 0);
      const finalCost = estimateCost(totalInput, totalOutput, model);

      return {
        draft: repairedValidation.data,
        meta: {
          model,
          prompt_version: '1.0',
          input_tokens: totalInput,
          output_tokens: totalOutput,
          total_tokens: totalAll,
          estimated_cost_usd: finalCost,
        },
      };
    }

    return {
      draft: validation.data,
      meta: {
        model,
        prompt_version: '1.0',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCost,
      },
    };
  } catch (error: any) {
    console.error('[AI Recipe Generator] Error', error);
    throw error;
  }
}

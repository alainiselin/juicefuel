import 'dotenv/config';
import OpenAI from 'openai';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { RecipeDraftSchema } from '../server/services/aiRecipeGenerator';

const ManifestEntrySchema = z.object({
  slug: z.string().min(1),
  source_title: z.string().min(1),
  title: z.string().min(1),
  query: z.string().min(1),
  cuisine: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

const StockRecipeFileSchema = z.object({
  slug: z.string(),
  source_title: z.string(),
  normalized_title: z.string(),
  query: z.string(),
  cuisine: z.array(z.string()),
  generated_at: z.string(),
  draft: RecipeDraftSchema,
});

type ManifestEntry = z.infer<typeof ManifestEntrySchema>;

const STOCK_DIR = join(process.cwd(), 'data', 'stock-recipes');
const GENERATED_DIR = join(STOCK_DIR, 'generated');
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini-2025-04-14';

const allowedUnits = ['g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'cup', 'piece', 'package', null] as const;
const flavorTags = [
  'spicy',
  'sweet',
  'sour',
  'salty',
  'umami',
  'smoky',
  'tangy',
  'refreshing',
  'rich',
  'savory',
  'mild',
  'herbal',
  'citrusy',
  'nutty',
  'creamy',
];
const timeTags = ['quick', 'weekday', 'weekend', 'make-ahead', 'slow-cooked'];
const costTags = ['cheap', 'budget', 'affordable', 'premium', 'expensive'];

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force'),
    only: args.find((arg) => arg.startsWith('--only='))?.split('=')[1],
  };
}

function loadManifest(): ManifestEntry[] {
  const manifest = JSON.parse(readFileSync(join(STOCK_DIR, 'manifest.json'), 'utf-8'));
  return z.array(ManifestEntrySchema).parse(manifest);
}

function outputPath(entry: ManifestEntry) {
  return join(GENERATED_DIR, `${entry.slug}.json`);
}

function extractJson(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('OpenAI response did not contain a JSON object');
  }

  return trimmed.slice(start, end + 1);
}

function buildPrompt(entry: ManifestEntry) {
  return `Generate one production-quality stock recipe as strict JSON.

Dish:
- Source title: ${entry.source_title}
- Normalized title to use exactly: ${entry.title}
- Cuisine hint slugs: ${entry.cuisine.join(', ') || 'none'}
- Recipe brief: ${entry.query}
${entry.notes ? `- Normalization note: ${entry.notes}` : ''}

Requirements:
- Use the normalized title exactly.
- Make the recipe practical for a home cook in Switzerland/Europe.
- Use metric quantities where possible.
- Ingredient names must be lowercase, singular/plural naturally, and not include quantities.
- Avoid duplicate ingredient names in the ingredient list.
- Use only these units: ${allowedUnits.filter(Boolean).join(', ')}, or null.
- Use 4 servings unless the dish is naturally a side/snack/dessert; then choose the most natural serving count.
- Description must be <= 240 characters.
- Steps must be specific, ordered, and complete.
- Tags:
  - CUISINE must use only these cuisine hint slugs when they are a real cuisine tag.
  - FLAVOR may use only: ${flavorTags.join(', ')}
  - TIME may use only: ${timeTags.join(', ')}
  - COST may use only: ${costTags.join(', ')}
  - DIET, ALLERGEN, and TECHNIQUE must be empty arrays for this stock import.

Return only this JSON object shape:
{
  "title": string,
  "description": string,
  "servings": number,
  "times": { "prep_min": number, "cook_min": number, "total_min": number },
  "ingredients": [{ "name": string, "amount": number|null, "unit": "g"|"kg"|"ml"|"l"|"tbsp"|"tsp"|"cup"|"piece"|"package"|null, "note": string|null }],
  "steps": [{ "order": number, "text": string }],
  "tags": {
    "CUISINE": string[],
    "FLAVOR": string[],
    "DIET": [],
    "ALLERGEN": [],
    "TECHNIQUE": [],
    "TIME": string[],
    "COST": string[]
  },
  "warnings": string[],
  "ai": { "generated": true, "model": "${MODEL}" }
}`;
}

async function generateDraft(client: OpenAI, entry: ManifestEntry) {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a careful recipe editor creating stock seed data. Output valid JSON only. Favor reliable, conventional recipes over novelty.',
      },
      { role: 'user', content: buildPrompt(entry) },
    ],
    temperature: 0.35,
    max_tokens: 2200,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned no content');
  }

  const parsed = JSON.parse(extractJson(content));
  const result = RecipeDraftSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Generated recipe failed schema validation: ${result.error.message}`);
  }

  return result.data;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required to generate stock recipes');
  }

  mkdirSync(GENERATED_DIR, { recursive: true });

  const args = parseArgs();
  const manifest = loadManifest().filter((entry) => !args.only || entry.slug === args.only);
  if (args.only && manifest.length === 0) {
    throw new Error(`No manifest entry found for --only=${args.only}`);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let generated = 0;
  let skipped = 0;

  for (const entry of manifest) {
    const path = outputPath(entry);
    if (!args.force && existsSync(path)) {
      console.log(`skip ${entry.slug}`);
      skipped++;
      continue;
    }

    console.log(`generate ${entry.slug}`);
    const draft = await generateDraft(client, entry);
    const payload = StockRecipeFileSchema.parse({
      slug: entry.slug,
      source_title: entry.source_title,
      normalized_title: entry.title,
      query: entry.query,
      cuisine: entry.cuisine,
      generated_at: new Date().toISOString(),
      draft,
    });

    writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
    generated++;
  }

  console.log(`Done. Generated: ${generated}. Skipped: ${skipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

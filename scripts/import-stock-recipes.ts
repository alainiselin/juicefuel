import 'dotenv/config';
import { PrismaClient, type Unit } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { RecipeDraftSchema } from '../server/services/aiRecipeGenerator';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const StockRecipeFileSchema = z.object({
  slug: z.string(),
  source_title: z.string(),
  normalized_title: z.string(),
  query: z.string(),
  cuisine: z.array(z.string()),
  generated_at: z.string(),
  draft: RecipeDraftSchema,
});

const unitMap: Record<string, Unit> = {
  g: 'G',
  kg: 'KG',
  ml: 'ML',
  l: 'L',
  tbsp: 'TBSP',
  tsp: 'TSP',
  cup: 'CUP',
  piece: 'PIECE',
  package: 'PACKAGE',
};

const GENERATED_DIR = join(process.cwd(), 'data', 'stock-recipes', 'generated');

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    libraryId:
      args.find((arg) => arg.startsWith('--library-id='))?.split('=')[1] ??
      process.env.STOCK_RECIPE_LIBRARY_ID,
    dryRun: args.includes('--dry-run'),
    only: args.find((arg) => arg.startsWith('--only='))?.split('=')[1],
  };
}

function normalizeIngredientName(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function stepsToMarkdown(steps: Array<{ order: number; text: string }>) {
  return steps
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((step, index) => `${index + 1}. ${step.text.trim()}`)
    .join('\n\n');
}

async function resolveLibrary(libraryId?: string) {
  if (libraryId) {
    const library = await prisma.recipe_library.findUnique({ where: { id: libraryId } });
    if (!library) {
      throw new Error(`Recipe library not found: ${libraryId}`);
    }
    if (!library.is_public) {
      console.warn(`Warning: target library "${library.name}" is not marked public.`);
    }
    return library;
  }

  const publicLibraries = await prisma.recipe_library.findMany({
    where: { is_public: true },
    orderBy: { created_at: 'asc' },
  });

  if (publicLibraries.length === 0) {
    throw new Error('No public recipe library found. Pass --library-id=<uuid> or set STOCK_RECIPE_LIBRARY_ID.');
  }
  if (publicLibraries.length > 1) {
    throw new Error(
      `Multiple public libraries found (${publicLibraries.map((library) => `${library.name}:${library.id}`).join(', ')}). Pass --library-id=<uuid>.`
    );
  }

  return publicLibraries[0];
}

async function findOrCreateIngredient(rawName: string) {
  const normalizedName = normalizeIngredientName(rawName);

  const existing = await prisma.ingredient.findFirst({
    where: {
      OR: [
        { name: normalizedName },
        { aliases: { some: { name: normalizedName } } },
      ],
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.ingredient.create({
    data: {
      name: normalizedName,
      household_id: null,
      is_recipe_eligible: true,
      source: 'USER',
    },
  });
}

async function recipeIngredientsForDraft(draft: z.infer<typeof RecipeDraftSchema>) {
  const byIngredientId = new Map<
    string,
    {
      ingredient_id: string;
      quantity?: number | null;
      unit?: Unit | null;
      note?: string | null;
    }
  >();

  for (const ingredientDraft of draft.ingredients) {
    const ingredient = await findOrCreateIngredient(ingredientDraft.name);
    if (byIngredientId.has(ingredient.id)) {
      continue;
    }

    byIngredientId.set(ingredient.id, {
      ingredient_id: ingredient.id,
      quantity: ingredientDraft.amount,
      unit: ingredientDraft.unit ? unitMap[ingredientDraft.unit.toLowerCase()] ?? null : null,
      note: ingredientDraft.note,
    });
  }

  return Array.from(byIngredientId.values());
}

async function attachTags(recipeId: string, draft: z.infer<typeof RecipeDraftSchema>, householdId: string) {
  const tagSlugs = [
    ...draft.tags.CUISINE,
    ...draft.tags.FLAVOR,
    ...draft.tags.DIET,
    ...draft.tags.ALLERGEN,
    ...draft.tags.TECHNIQUE,
    ...draft.tags.TIME,
    ...draft.tags.COST,
  ];

  const uniqueSlugs = Array.from(new Set(tagSlugs));
  const tags = uniqueSlugs.length
    ? await prisma.tag.findMany({
        where: {
          slug: { in: uniqueSlugs },
          OR: [{ scope: 'GLOBAL' }, { scope: 'HOUSEHOLD', household_id: householdId }],
        },
      })
    : [];

  await prisma.recipe_tag.deleteMany({ where: { recipe_id: recipeId } });

  for (const tag of tags) {
    await prisma.recipe_tag.create({
      data: {
        recipe_id: recipeId,
        tag_id: tag.id,
      },
    });
  }

  const missing = uniqueSlugs.filter((slug) => !tags.some((tag) => tag.slug === slug));
  if (missing.length > 0) {
    console.warn(`  missing tags skipped: ${missing.join(', ')}`);
  }
}

async function upsertStockRecipe(
  libraryId: string,
  householdId: string,
  payload: z.infer<typeof StockRecipeFileSchema>,
  dryRun: boolean
) {
  const { draft } = payload;
  const existing = await prisma.recipe.findFirst({
    where: {
      recipe_library_id: libraryId,
      title: draft.title,
    },
  });

  if (dryRun) {
    console.log(`${existing ? 'would update' : 'would create'} ${draft.title}`);
    return;
  }

  const ingredients = await recipeIngredientsForDraft(draft);
  const description = draft.description.trim().replace(/\n/g, ' ').slice(0, 240);
  const data = {
    title: draft.title,
    description,
    base_servings: draft.servings,
    prep_time_minutes: draft.times.total_min,
    instructions_markdown: `## Steps\n\n${stepsToMarkdown(draft.steps)}`,
    source_url: `stock-recipe:${payload.slug}`,
  };

  const recipe = existing
    ? await prisma.recipe.update({
        where: { id: existing.id },
        data: {
          ...data,
          ingredients: {
            deleteMany: {},
            create: ingredients,
          },
        },
      })
    : await prisma.recipe.create({
        data: {
          ...data,
          recipe_library_id: libraryId,
          ingredients: {
            create: ingredients,
          },
        },
      });

  await attachTags(recipe.id, draft, householdId);
  console.log(`${existing ? 'updated' : 'created'} ${draft.title}`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to import stock recipes');
  }

  const args = parseArgs();
  const library = await resolveLibrary(args.libraryId);
  const files = readdirSync(GENERATED_DIR)
    .filter((file) => file.endsWith('.json'))
    .filter((file) => !args.only || file === `${args.only}.json`)
    .sort();

  if (args.only && files.length === 0) {
    throw new Error(`No generated recipe found for --only=${args.only}`);
  }

  console.log(`Target library: ${library.name} (${library.id})`);
  console.log(`Recipes: ${files.length}${args.dryRun ? ' [dry run]' : ''}`);

  for (const file of files) {
    const payload = StockRecipeFileSchema.parse(JSON.parse(readFileSync(join(GENERATED_DIR, file), 'utf-8')));
    await upsertStockRecipe(library.id, library.household_id, payload, args.dryRun);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

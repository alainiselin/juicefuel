import { generateRecipeFromExtracted } from './aiRecipeGenerator';
import type { GenerateRecipeInput, GenerateRecipeResult } from './aiRecipeGenerator';

const MAX_HTML_BYTES = 2_000_000;
const FETCH_TIMEOUT_MS = 12_000;

export interface ExtractedRecipe {
  title?: string | null;
  description?: string | null;
  servings?: number | null;
  prep_min?: number | null;
  cook_min?: number | null;
  total_min?: number | null;
  ingredients: string[];
  steps: string[];
  extraction_method: 'json-ld' | 'html-metadata';
}

export interface ImportRecipeFromUrlInput {
  url: string;
  servings?: number | null;
  tagAllowlist: GenerateRecipeInput['tagAllowlist'];
}

export interface ImportRecipeFromUrlResult extends GenerateRecipeResult {
  source_url: string;
  import: {
    extraction_method: ExtractedRecipe['extraction_method'];
    title: string | null;
    ingredient_count: number;
    step_count: number;
  };
}

export function assertSafeRecipeUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Please enter a valid recipe URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Recipe URL must start with http:// or https://.');
  }

  const hostname = parsed.hostname.toLowerCase();
  const blockedHosts = new Set(['localhost', '0.0.0.0']);
  if (
    blockedHosts.has(hostname)
    || hostname.endsWith('.localhost')
    || hostname === '::1'
    || hostname.startsWith('127.')
    || hostname.startsWith('10.')
    || hostname.startsWith('192.168.')
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  ) {
    throw new Error('Recipe URL must be a public web page.');
  }

  return parsed.toString();
}

export async function importRecipeFromUrl(
  input: ImportRecipeFromUrlInput
): Promise<ImportRecipeFromUrlResult> {
  const url = assertSafeRecipeUrl(input.url);
  const html = await fetchRecipeHtml(url);
  const extracted = extractRecipeFromHtml(html);

  if (extracted.ingredients.length === 0 && extracted.steps.length === 0) {
    throw new Error('Could not find recipe data on this page.');
  }

  const result = await generateRecipeFromExtracted({
    url,
    servings: input.servings ?? null,
    extracted,
    tagAllowlist: input.tagAllowlist,
  });

  return {
    ...result,
    source_url: url,
    import: {
      extraction_method: extracted.extraction_method,
      title: extracted.title ?? null,
      ingredient_count: extracted.ingredients.length,
      step_count: extracted.steps.length,
    },
  };
}

async function fetchRecipeHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'JuiceFuelRecipeImporter/1.0 (+https://juicefuel.juicecrew.vip)',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Could not load recipe page (HTTP ${response.status}).`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error('Recipe URL must point to an HTML page.');
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_HTML_BYTES) {
      throw new Error('Recipe page is too large to import.');
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_HTML_BYTES) {
      throw new Error('Recipe page is too large to import.');
    }

    return new TextDecoder().decode(buffer);
  } finally {
    clearTimeout(timeout);
  }
}

export function extractRecipeFromHtml(html: string): ExtractedRecipe {
  const jsonLdRecipe = extractRecipeFromJsonLd(html);
  if (jsonLdRecipe) {
    return jsonLdRecipe;
  }

  return {
    title: firstText([
      readMetaContent(html, 'property', 'og:title'),
      readMetaContent(html, 'name', 'twitter:title'),
      readTitle(html),
    ]),
    description: firstText([
      readMetaContent(html, 'name', 'description'),
      readMetaContent(html, 'property', 'og:description'),
    ]),
    servings: null,
    prep_min: null,
    cook_min: null,
    total_min: null,
    ingredients: [],
    steps: [],
    extraction_method: 'html-metadata',
  };
}

function extractRecipeFromJsonLd(html: string): ExtractedRecipe | null {
  const scriptPattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches = html.matchAll(scriptPattern);

  for (const match of matches) {
    const rawJson = decodeHtmlEntities(stripHtmlComments(match[1]?.trim() ?? ''));
    if (!rawJson) continue;

    const parsed = safeJsonParse(rawJson);
    if (!parsed) continue;

    const node = findRecipeNode(parsed);
    if (!node) continue;

    const ingredients = toStringArray(node.recipeIngredient);
    const steps = extractInstructions(node.recipeInstructions);

    return {
      title: toText(node.name),
      description: toText(node.description),
      servings: parseServings(node.recipeYield ?? node.yield),
      prep_min: parseIsoDurationMinutes(toText(node.prepTime)),
      cook_min: parseIsoDurationMinutes(toText(node.cookTime)),
      total_min: parseIsoDurationMinutes(toText(node.totalTime)),
      ingredients,
      steps,
      extraction_method: 'json-ld',
    };
  }

  return null;
}

function findRecipeNode(value: unknown): Record<string, any> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const obj = value as Record<string, any>;
  if (hasType(obj, 'Recipe')) {
    return obj;
  }

  if (obj['@graph']) {
    const found = findRecipeNode(obj['@graph']);
    if (found) return found;
  }

  for (const key of ['mainEntity', 'about']) {
    const found = findRecipeNode(obj[key]);
    if (found) return found;
  }

  return null;
}

function hasType(obj: Record<string, any>, typeName: string): boolean {
  const type = obj['@type'];
  if (Array.isArray(type)) {
    return type.some(item => String(item).toLowerCase() === typeName.toLowerCase());
  }
  return typeof type === 'string' && type.toLowerCase() === typeName.toLowerCase();
}

function extractInstructions(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === 'string') return splitInstructionText(value);
  if (Array.isArray(value)) {
    return value.flatMap(extractInstructions).filter(Boolean);
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, any>;
    if (obj.itemListElement) {
      return extractInstructions(obj.itemListElement);
    }
    return splitInstructionText(toText(obj.text) ?? toText(obj.name) ?? '');
  }
  return [];
}

function splitInstructionText(text: string): string[] {
  return text
    .split(/\n+|\r+|(?:^|\s)(?=\d+\.\s+)/)
    .map(item => item.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
}

function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(toText).filter((item): item is string => Boolean(item));
  }
  const text = toText(value);
  return text ? [text] : [];
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') {
    return normalizeWhitespace(String(value));
  }
  if (Array.isArray(value)) {
    return firstText(value.map(toText));
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, any>;
    return toText(obj.text ?? obj.name ?? obj.value);
  }
  return null;
}

function parseServings(value: unknown): number | null {
  const text = toText(value);
  if (!text) return null;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function parseIsoDurationMinutes(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!match) return null;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  return days * 24 * 60 + hours * 60 + minutes + (seconds > 0 ? 1 : 0);
}

function readMetaContent(html: string, attr: 'name' | 'property', value: string): string | null {
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attr}=["']${escapeRegExp(value)}["'])(?=[^>]*\\bcontent=["']([^"']*)["'])[^>]*>`, 'i');
  const match = html.match(pattern);
  return match ? decodeHtmlEntities(normalizeWhitespace(match[1] ?? '')) : null;
}

function readTitle(html: string): string | null {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(normalizeWhitespace(stripTags(match[1] ?? ''))) : null;
}

function firstText(values: Array<string | null | undefined>): string | null {
  return values.find(value => value && value.trim().length > 0)?.trim() ?? null;
}

function safeJsonParse(rawJson: string): unknown | null {
  try {
    return JSON.parse(rawJson);
  } catch {
    return null;
  }
}

function stripHtmlComments(value: string): string {
  return value.replace(/<!--|-->/g, '');
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, ' ');
}

function normalizeWhitespace(value: string): string {
  return stripTags(value).replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

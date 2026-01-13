/**
 * Build tags seed JSON from all sources
 * 
 * Sources:
 * - Wikidata: cuisines, diets, techniques
 * - Open Food Facts: diets, allergens (whitelist only)
 * - Heuristic: flavors, time, cost
 * 
 * Output: tags.seed.json with normalized, deduplicated tags
 */

import { fetchCuisines } from './harvest/wikidata-cuisines';
import { fetchDiets } from './harvest/wikidata-diets';
import { fetchTechniques } from './harvest/wikidata-techniques';
import { parseOFFTaxonomy, downloadFile, TEMP_FILE } from './harvest/off-diet-allergen';
import { writeFileSync, unlinkSync } from 'fs';

interface Tag {
  category: string;
  canonical_name: string;
  slug: string;
  aliases: string[];
}

// Heuristic seeds for subjective categories
const FLAVOR_SEEDS = [
  'spicy', 'sweet', 'sour', 'bitter', 'salty', 'umami',
  'smoky', 'tangy', 'refreshing', 'rich', 'savory',
  'mild', 'herbal', 'citrusy', 'nutty', 'creamy'
];

const TIME_SEEDS = [
  'quick', 'weekday', 'weekend', 'make ahead', 'slow cooked'
];

const COST_SEEDS = [
  'cheap', 'budget', 'affordable', 'premium', 'expensive'
];

// Known aliases to merge
const ALIAS_MAP: Record<string, string[]> = {
  'vegan': ['plant based', 'plant-based'],
  'vegetarian': ['veggie'],
  'barbecue': ['bbq', 'barbeque'],
  'grilled': ['grilling'],
  'roasted': ['roasting'],
  'fried': ['frying', 'deep fried'],
  'italian': ['italian food'],
  'mexican': ['mexican food'],
  'chinese': ['chinese food'],
  'japanese': ['japanese food'],
  'indian': ['indian food'],
  'thai': ['thai food'],
  'gluten-free': ['gluten free', 'no gluten'],
  'dairy-free': ['dairy free', 'lactose free', 'no dairy'],
  'nut-free': ['nut free', 'no nuts'],
  'quick': ['fast', 'quick meal', '30 minutes'],
  'spicy': ['hot', 'fiery'],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[()]/g, '')
    .replace(/ cuisine$/, '')
    .replace(/ food$/, '')
    .replace(/ diet$/, '');
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function toTitleCase(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function createTag(category: string, canonical: string, additionalAliases: string[] = []): Tag {
  const normalized = normalize(canonical);
  const slug = toSlug(normalized);
  const canonicalName = toTitleCase(normalized);
  
  // Get known aliases
  const knownAliases = ALIAS_MAP[normalized] || [];
  
  // Combine and dedupe aliases
  const allAliases = [...knownAliases, ...additionalAliases]
    .map(a => normalize(a))
    .filter(a => a !== normalized)
    .filter((v, i, arr) => arr.indexOf(v) === i);
  
  return {
    category,
    canonical_name: canonicalName,
    slug,
    aliases: allAliases
  };
}

function dedupeAndScore(items: string[]): string[] {
  // Normalize and dedupe
  const normalized = items
    .map(item => normalize(item))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .filter(v => v.length >= 3 && v.length < 40);
  
  // Score based on length and simplicity
  const scored = normalized.map(item => {
    let score = 100;
    
    // Prefer shorter names
    score -= item.length;
    
    // Penalize commas and parentheses
    if (item.includes(',')) score -= 20;
    if (item.includes('(')) score -= 20;
    
    // Prefer food-like categories
    if (item.includes('vegetable') || item.includes('fruit') || 
        item.includes('meat') || item.includes('fish') ||
        item.includes('grain') || item.includes('dairy')) {
      score += 30;
    }
    
    // Penalize technical terms
    if (item.includes('traditional') || item.includes('style')) {
      score -= 15;
    }
    
    return { item, score };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  return scored.map(s => s.item);
}

async function main() {
  console.log('Building tags seed...\n');
  
  const tags: Tag[] = [];
  
  // CUISINE from Wikidata
  console.log('Fetching cuisines from Wikidata...');
  const wikidataCuisines = await fetchCuisines();
  const topCuisines = dedupeAndScore(wikidataCuisines).slice(0, 150);
  console.log(`Selected ${topCuisines.length} cuisines\n`);
  
  topCuisines.forEach(cuisine => {
    tags.push(createTag('CUISINE', cuisine));
  });
  
  // DIET from Wikidata + OFF
  console.log('Fetching diets from Wikidata...');
  const wikidataDiets = await fetchDiets();
  
  console.log('Downloading and parsing OFF taxonomy...');
  await downloadFile('https://static.openfoodfacts.org/data/taxonomies/ingredients.txt', TEMP_FILE);
  const { diets: offDiets } = await parseOFFTaxonomy();
  unlinkSync(TEMP_FILE);
  
  const allDiets = [...wikidataDiets, ...offDiets];
  const topDiets = dedupeAndScore(allDiets).slice(0, 40);
  console.log(`Selected ${topDiets.length} diets\n`);
  
  topDiets.forEach(diet => {
    tags.push(createTag('DIET', diet));
  });
  
  // TECHNIQUE from Wikidata
  console.log('Fetching techniques from Wikidata...');
  const wikidataTechniques = await fetchTechniques();
  const topTechniques = dedupeAndScore(wikidataTechniques).slice(0, 80);
  console.log(`Selected ${topTechniques.length} techniques\n`);
  
  topTechniques.forEach(technique => {
    tags.push(createTag('TECHNIQUE', technique));
  });
  
  // ALLERGEN from OFF
  console.log('Processing allergens from OFF...');
  await downloadFile('https://static.openfoodfacts.org/data/taxonomies/ingredients.txt', TEMP_FILE);
  const { allergens } = await parseOFFTaxonomy();
  unlinkSync(TEMP_FILE);
  
  const topAllergens = dedupeAndScore(allergens).slice(0, 20);
  console.log(`Selected ${topAllergens.length} allergens\n`);
  
  topAllergens.forEach(allergen => {
    tags.push(createTag('ALLERGEN', allergen));
  });
  
  // FLAVOR (heuristic)
  console.log(`Adding ${FLAVOR_SEEDS.length} flavor tags\n`);
  FLAVOR_SEEDS.forEach(flavor => {
    tags.push(createTag('FLAVOR', flavor));
  });
  
  // TIME (heuristic)
  console.log(`Adding ${TIME_SEEDS.length} time tags\n`);
  TIME_SEEDS.forEach(time => {
    tags.push(createTag('TIME', time));
  });
  
  // COST (heuristic)
  console.log(`Adding ${COST_SEEDS.length} cost tags\n`);
  COST_SEEDS.forEach(cost => {
    tags.push(createTag('COST', cost));
  });
  
  // Write output
  const outputPath = 'tags.seed.json';
  writeFileSync(outputPath, JSON.stringify(tags, null, 2), 'utf-8');
  
  console.log(`\n✅ Generated ${tags.length} tags`);
  console.log(`   - CUISINE: ${tags.filter(t => t.category === 'CUISINE').length}`);
  console.log(`   - DIET: ${tags.filter(t => t.category === 'DIET').length}`);
  console.log(`   - TECHNIQUE: ${tags.filter(t => t.category === 'TECHNIQUE').length}`);
  console.log(`   - ALLERGEN: ${tags.filter(t => t.category === 'ALLERGEN').length}`);
  console.log(`   - FLAVOR: ${tags.filter(t => t.category === 'FLAVOR').length}`);
  console.log(`   - TIME: ${tags.filter(t => t.category === 'TIME').length}`);
  console.log(`   - COST: ${tags.filter(t => t.category === 'COST').length}`);
  console.log(`\nOutput written to: ${outputPath}`);
}

main().catch(console.error);

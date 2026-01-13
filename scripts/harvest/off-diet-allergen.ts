/**
 * Harvest diet and allergen tags from Open Food Facts taxonomy
 * Uses OFF ingredients taxonomy
 * Extracts only diet-related and allergen-related terms
 * English only
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { get } from 'https';
import { createWriteStream, unlinkSync } from 'fs';

const TAXONOMY_URL = 'https://static.openfoodfacts.org/data/taxonomies/ingredients.txt';
const TEMP_FILE = '/tmp/off-ingredients.txt';

interface TaxonomyEntry {
  id: string;
  names: string[];
}

// Whitelist for diet-related terms
const DIET_KEYWORDS = [
  'vegan', 'vegetarian', 'paleo', 'keto', 'ketogenic',
  'plant based', 'plant-based', 'pescatarian', 'flexitarian',
  'raw food', 'whole food', 'organic'
];

// Whitelist for allergen-related terms
const ALLERGEN_KEYWORDS = [
  'gluten', 'dairy', 'lactose', 'nut', 'peanut', 'tree nut',
  'shellfish', 'fish', 'egg', 'soy', 'wheat', 'sesame',
  'sulfite', 'mustard', 'celery', 'lupin', 'mollusc'
];

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      unlinkSync(dest);
      reject(err);
    });
  });
}

async function parseOFFTaxonomy(): Promise<{ diets: string[], allergens: string[] }> {
  const diets = new Set<string>();
  const allergens = new Set<string>();

  const fileStream = createReadStream(TEMP_FILE);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let currentEntry: TaxonomyEntry | null = null;

  for await (const line of rl) {
    const trimmed = line.trim();
    
    // New entry
    if (trimmed.startsWith('en:')) {
      const id = trimmed.substring(3);
      currentEntry = { id, names: [id] };
    }
    
    // English name
    if (trimmed.startsWith('name:en:') && currentEntry) {
      const name = trimmed.substring(8).toLowerCase().trim();
      currentEntry.names.push(name);
    }
    
    // English synonym
    if (trimmed.startsWith('synonyms:en:') && currentEntry) {
      const synonyms = trimmed.substring(12).split(',').map(s => s.trim().toLowerCase());
      currentEntry.names.push(...synonyms);
    }
    
    // Empty line = end of entry
    if (trimmed === '' && currentEntry) {
      // Check all names for diet keywords
      for (const name of currentEntry.names) {
        for (const keyword of DIET_KEYWORDS) {
          if (name.includes(keyword)) {
            diets.add(keyword);
          }
        }
        
        for (const keyword of ALLERGEN_KEYWORDS) {
          if (name.includes(keyword) || name.includes(`${keyword}-free`) || name.includes(`no ${keyword}`)) {
            allergens.add(`${keyword}-free`);
          }
        }
      }
      
      currentEntry = null;
    }
  }

  return {
    diets: Array.from(diets),
    allergens: Array.from(allergens)
  };
}

export { parseOFFTaxonomy, downloadFile, TEMP_FILE };

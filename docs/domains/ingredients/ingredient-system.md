# Ingredient Management System

## Overview
Lightweight ingredient management system using Open Food Facts ingredients taxonomy (English only). Provides autocomplete/search API for ingredients with canonical names and aliases.

**Design Philosophy:** Keep the dataset small, human-friendly, and focused on "what a cook buys/cooks with". Avoid taxonomy bloat by filtering industrial/scientific entries and merging variants.

## Why We Avoid Granularity (The Paprika Problem)

OFF taxonomy contains thousands of ultra-specific entries:
- paprika (canonical)
- paprika powder
- smoked paprika
- sweet paprika
- hot paprika
- paprika extract
- paprika oleoresin
- ...

**Our Approach:**
- Keep ONE canonical: "paprika"
- Store variants as ALIASES that point to canonical
- User searches "paprika powder" → finds "paprika"
- Smaller dataset, better UX, same search quality

**Similar for:**
- Additives (E-numbers, emulsifiers)
- Industrial terms (stabilizers, thickeners)
- Ultra-specific variants (dried vs fresh vs ground)

## Database Schema

### `ingredient` table
- `id` (UUID): Primary key
- `name` (text): Display name (same as canonical_name)
- `canonical_name` (text, unique): Normalized English name
- `slug` (text, unique): URL-friendly identifier
- `off_id` (text, unique, nullable): Open Food Facts ingredient ID
- `source` (enum): 'OFF' or 'USER'
- `is_core` (boolean): Core ingredients vs expanded set
- `default_unit` (enum, nullable): Default unit of measurement
- Timestamps: `created_at`, `updated_at`

### `ingredient_alias` table
- `id` (UUID): Primary key
- `ingredient_id` (UUID): Foreign key to ingredient
- `name` (text, unique): Alias/synonym name
- `created_at`: Timestamp

## Data Filtering Rules

### A) Excluded Terms
Never import ingredients containing (case-insensitive):
- E-numbers: `^e\d+\b` (e.g., E100, E621)
- Keywords: additive, emulsifier, stabilizer, colour, color, preservative, thickener, raising agent, flavouring, flavoring, acidity regulator, acid

### B) Exact Excludes
Never import if name exactly matches:
- food, ingredients, miscellaneous, other, unknown

### C) Depth Limit
- Only import entries with taxonomy depth ≤ 2
- Depth calculated from path structure: `en:vegetables:root-vegetables:carrots` = depth 3
- Rationale: Depth 0-2 = general ingredients, Depth 3+ = over-specific

Example depths:
```
en:vegetables           → depth 1 ✓
en:vegetables:carrots   → depth 2 ✓
en:vegetables:carrots:baby-carrots → depth 3 ✗
```

### D) Variant Merging
Canonicalize by:
- Lowercasing
- Trimming whitespace
- Collapsing multiple spaces
- Removing punctuation (keep hyphens)
- Normalizing "&" → "and"

Strip variant suffixes (whole-word only):
- powder, ground, fresh, dried, whole, chopped

Merging logic:
- "paprika powder" → check if "paprika" exists
- If yes: add "paprika powder" as ALIAS of "paprika"
- If no: create new ingredient "paprika powder"

### E) Size Guardrail & Core Classification
**MAX_INGREDIENTS = 4000**
**CORE_TARGET = 1000**

If more candidates exist after filtering, score and keep best:

**Scoring heuristic:**
```
Base score: 1000
- Name length: -2 per character
- Punctuation: -50 per comma/parenthesis
+ Food categories: +100 if contains vegetable/fruit/herb/spice/grain/dairy/meat/fish/oil/nut/legume
- Stop-words: -200 if contains "other"/"various"
```

Sort by score descending, keep top MAX_INGREDIENTS (4000).

**Core vs Non-Core Classification:**
- Top CORE_TARGET ingredients (default 1000) are marked `is_core = true`
- Remaining imported ingredients (up to 3000) are marked `is_core = false`
- USER-created ingredients always marked `is_core = true`
- Core ingredients appear first in search/autocomplete by default

## Setup

### 1. Database Migration
Columns added:
- `ingredient.source` (enum: OFF, USER)
- `ingredient.is_core` (boolean, default true)
- Index on `is_core`

Already applied via direct SQL.

### 2. Import Ingredients from Open Food Facts

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://user:password@host:port/database"

# Run import script (filters and limits to 4000)
npm run import:ingredients
```

The import script:
- Downloads OFF ingredients taxonomy (~5MB)
- Filters by depth (≤2), excludes additives/industrial terms
- Scores and limits to MAX_INGREDIENTS (4000)
- Canonicalizes and merges variants
- Upserts ingredients (idempotent)
- Creates aliases for synonyms
- Takes ~2-5 minutes

**Import Stats Example:**
```
📥 Downloading OFF ingredients taxonomy...
📄 Parsing taxonomy with filters...
   MAX_INGREDIENTS: 4000
   CORE_TARGET: 1000
   Depth limit: <= 2
   Selected 4000 ingredients after filtering and scoring
💾 Upserting ingredients...

✅ Import complete!
   📊 Stats:
      Total selected:    4000
      Inserted:          3850
      Updated:           50
      Merged as aliases: 100
      Aliases created:   5200
      Skipped (USER):    5

   📈 Final Counts:
      Core (is_core=true):     1000
      Non-core (is_core=false): 3000
      Total OFF:                4000
      USER ingredients:         12
      Grand Total:              4012
```

## API Endpoints

### Search Ingredients
```bash
GET /api/ingredients?query=tom&limit=20&include_non_core=false
```

**Parameters:**
- `query` (required): Search term
- `limit` (optional): Max results (default: 20, max: 100)
- `include_non_core` (optional): Include non-core ingredients (default: false)

**Returns:**
```json
[
  {
    "id": "uuid",
    "canonical_name": "tomato"
  },
  {
    "id": "uuid",
    "canonical_name": "tomato paste"
  }
]
```

**Search Priority:**
1. Core ingredients only (is_core = true) by default
2. Canonical name starts with query
3. Alias starts with query
4. Canonical name contains query
5. Alias contains query

**Examples:**
```bash
# Basic search (core only)
curl -H "Cookie: session_token=TOKEN" \
  "http://localhost:3000/api/ingredients?query=tomat&limit=10"

# Include all ingredients
curl -H "Cookie: session_token=TOKEN" \
  "http://localhost:3000/api/ingredients?query=tomat&limit=10&include_non_core=true"
```

### Get Ingredient Details
```bash
GET /api/ingredients/:id
```

**Returns:**
```json
{
  "id": "uuid",
  "canonical_name": "tomato",
  "slug": "tomato",
  "off_id": "en:tomato",
  "aliases": [
    {
      "id": "uuid",
      "name": "tomatoes"
    },
    {
      "id": "uuid",
      "name": "fresh tomato"
    }
  ]
}
```

## Implementation Notes

### Canonicalization Logic
```
Input: "Paprika & Garlic Powder"
Steps:
1. Lowercase: "paprika & garlic powder"
2. Normalize &: "paprika and garlic powder"
3. Remove punctuation: "paprika and garlic powder"
4. Collapse spaces: "paprika and garlic powder"
5. Slug: "paprika-and-garlic-powder"
```

### Variant Detection
```
"paprika powder" → base: "paprika"
"ground cumin" → base: "cumin"
"fresh basil" → base: "basil"
"dried oregano" → base: "oregano"
```

Only last word checked. Multi-word ingredients preserved:
```
"olive oil" → no change (oil not a suffix, it's part of ingredient)
"olive oil powder" → base: "olive oil"
```

### Depth Calculation
```javascript
// Count colons in taxonomy path
"en:vegetables"                    → 1 colon  = depth 1
"en:vegetables:root-vegetables"    → 2 colons = depth 2
"en:vegetables:root-vegetables:carrots" → 3 colons = depth 3
```

### Performance
- Indexed fields: `canonical_name`, `slug`, `alias.name`, `is_core`
- Tiered search: starts-with first, then contains
- Limits enforced to prevent large result sets
- Results deduplicated by ingredient ID
- Core-only filter reduces search space by default

## Maintenance

### Re-import Data
```bash
# Update with latest OFF data
npm run import:ingredients
```
- Idempotent: Updates existing, inserts new
- Respects MAX_INGREDIENTS limit
- Preserves USER-created ingredients
- Merges variants automatically

### Adjust MAX_INGREDIENTS or CORE_TARGET
Edit `scripts/import-off-ingredients.ts`:
```typescript
const MAX_INGREDIENTS = 4000; // Total OFF ingredients to import
const CORE_TARGET = 1000;      // How many marked as core
```

### Check Import Status
```bash
# Count core ingredients
docker exec supabase_db_juicefuel psql -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM ingredient WHERE is_core = true AND source = 'OFF';"

# Count non-core ingredients  
docker exec supabase_db_juicefuel psql -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM ingredient WHERE is_core = false AND source = 'OFF';"

# Count OFF vs USER
docker exec supabase_db_juicefuel psql -U postgres -d postgres \
  -c "SELECT source, is_core, COUNT(*) FROM ingredient GROUP BY source, is_core ORDER BY source, is_core;"

# Count aliases
docker exec supabase_db_juicefuel psql -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM ingredient_alias;"

# Top scoring ingredients (shortest names, likely core)
docker exec supabase_db_juicefuel psql -U postgres -d postgres \
  -c "SELECT canonical_name, is_core FROM ingredient WHERE source = 'OFF' ORDER BY length(canonical_name) LIMIT 20;"
```

### Add Custom Ingredients
Custom ingredients automatically marked as USER source:
```sql
INSERT INTO ingredient (canonical_name, name, slug, source, is_core)
VALUES ('my ingredient', 'my ingredient', 'my-ingredient', 'USER', true);
```

## Troubleshooting

### Too many/few ingredients imported
Adjust MAX_INGREDIENTS constant or filtering rules in import script.

### Missing common ingredients
Check if excluded by filters. May need to adjust EXCLUDED_TERMS or depth limit.

### Variant not merging
Verify suffix in VARIANT_SUFFIXES list. Only whole-word suffixes stripped.

### Slow searches
Normal for "contains" queries. Use shorter/more specific search terms. Core-only filter (default) improves speed.

## Data Source
- Source: https://static.openfoodfacts.org/data/taxonomies/ingredients.txt
- Format: Custom taxonomy with language prefixes
- Size: ~5MB, 20k+ entries (we import ~4000 after filtering)
- Updates: Weekly on OFF; re-run import to refresh

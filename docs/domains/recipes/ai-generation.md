# AI Recipe Generation

## Overview
The AI Recipe Generation feature creates complete, structured recipe drafts using OpenAI. Drafts can be generated from either a natural language prompt or an existing recipe URL. Generated drafts include ingredients, cooking steps, timing, servings, tags, warnings, and AI provenance, then flow through one save endpoint so web and iOS use the same recipe creation path.

## Features
- Natural language recipe generation (e.g., "authentic pho", "quick weeknight pasta")
- URL-based recipe import from public recipe pages
- HTML recipe extraction from JSON-LD, microdata, and selected server-rendered recipe markup
- AI normalization of extracted recipes into the same app draft schema used by prompt generation
- Constraint support (diet, allergens, time limits, skill level)
- Tag integration with existing tagging system
- Rate limiting (10 per user/day, 60 per household/day)
- Automatic ingredient creation or matching
- JSON schema validation with automatic repair for AI generation and tolerant save validation for imported drafts
- Token usage and cost tracking
- Native iOS support for AI generation and URL import

## Environment Variables
Add to your `.env` file:
```
OPENAI_API_KEY=sk-...your-key-here...
```

The production model defaults to `gpt-4.1-mini-2025-04-14` unless `OPENAI_MODEL` is set.

## API Endpoints

### POST /api/recipes/generate
Generate a recipe draft from a prompt.

**Request:**
```json
{
  "household_id": "uuid",
  "query": "authentic pho",
  "servings": 4,
  "constraints": {
    "diet_slugs": ["vegetarian"],
    "allergen_slugs": ["gluten"],
    "max_total_minutes": 45,
    "skill_level": "medium"
  }
}
```

**Response:**
```json
{
  "draft": {
    "title": "Authentic Vegetarian Pho",
    "description": "A flavorful Vietnamese soup...",
    "servings": 4,
    "times": {
      "prep_min": 15,
      "cook_min": 30,
      "total_min": 45
    },
    "ingredients": [
      {
        "name": "rice noodles",
        "amount": 200,
        "unit": "g",
        "note": null
      }
    ],
    "steps": [
      {
        "order": 1,
        "text": "Bring a large pot of water to boil..."
      }
    ],
    "tags": {
      "CUISINE": ["vietnamese"],
      "FLAVOR": ["savory", "umami"],
      "DIET": ["vegetarian"],
      "ALLERGEN": [],
      "TECHNIQUE": ["boiling", "simmering"],
      "TIME": ["quick"],
      "COST": ["budget"]
    },
    "warnings": [],
    "ai": {
      "generated": true,
      "model": "gpt-4.1-mini-2025-04-14"
    }
  },
  "meta": {
    "model": "gpt-4.1-mini-2025-04-14",
    "prompt_version": "1.0",
    "input_tokens": 1234,
    "output_tokens": 567,
    "total_tokens": 1801,
    "estimated_cost_usd": 0.000523
  }
}
```

### POST /api/recipes/generate/from-url
Import a public recipe URL into the same recipe draft shape used by the prompt generator.

**Request:**
```json
{
  "household_id": "uuid",
  "url": "https://www.swissmilk.ch/de/rezepte-kochideen/rezepte/LM201005_18/spargel-cannelloni-mit-speck/",
  "servings": 4
}
```

**Response:**
```json
{
  "draft": { "...": "same RecipeDraft object as /api/recipes/generate" },
  "source_url": "https://www.swissmilk.ch/de/rezepte-kochideen/rezepte/LM201005_18/spargel-cannelloni-mit-speck/",
  "import": {
    "extraction_method": "json-ld",
    "title": "Spargel-Cannelloni mit Speck",
    "ingredient_count": 13,
    "step_count": 5
  },
  "meta": {
    "model": "gpt-4.1-mini-2025-04-14",
    "prompt_version": "url-import-1.0"
  }
}
```

The importer rejects private-network URLs and non-HTML responses. It currently works well with common structured recipe pages such as Swissmilk, Fooby, Indian Healthy Recipes, and Joshua Weissman.

### POST /api/recipes/generate/save
Save a generated draft as a real recipe.

**Request:**
```json
{
  "household_id": "uuid",
  "recipe_library_id": "uuid",
  "draft": { "...": "RecipeDraft object from generate or from-url endpoint" },
  "source_url": "https://example.com/original-recipe"
}
```

**Response:**
Recipe object with ID, ingredients, and tags attached.

The save endpoint is intentionally the single creation path for both prompt-generated and URL-imported drafts. It verifies household membership and writable recipe-library ownership, then creates or matches ingredients, attaches known tags, and stores the original URL when present.

## Rate Limits
- **Per user:** 10 generations per 24 hours
- **Per household:** 60 generations per 24 hours

Limits reset after 24 hours from first request.

## Testing with curl

### Generate a recipe:
```bash
curl -X POST http://localhost:3000/api/recipes/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "household_id": "your-household-uuid",
    "query": "quick chicken stir fry",
    "servings": 2,
    "constraints": {
      "max_total_minutes": 30
    }
  }'
```

### Save generated recipe:
```bash
curl -X POST http://localhost:3000/api/recipes/generate/save \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "household_id": "your-household-uuid",
    "recipe_library_id": "your-library-uuid",
    "draft": { ...paste draft from generate response... }
  }'
```

### Import from URL:
```bash
curl -X POST http://localhost:3000/api/recipes/generate/from-url \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "household_id": "your-household-uuid",
    "url": "https://www.indianhealthyrecipes.com/chana-masala/",
    "servings": 4
  }'
```

## Tag Integration
The system uses the existing unified tagging system:
- Tags are fetched from the `tag` table (GLOBAL + HOUSEHOLD scoped)
- AI is given an allowlist of valid tag slugs per kind
- Only existing tags are attached to saved recipes
- No new tags are automatically created

Supported tag kinds:
- CUISINE
- FLAVOR
- DIET
- ALLERGEN
- TECHNIQUE
- TIME
- COST

## Cost Estimation
Cost estimation is based on the configured OpenAI model. The server logs estimated input/output token cost for each generation. Typical prompt or URL imports are low-cost single requests, with an optional repair request only when schema validation fails.

## Implementation Notes
- OpenAI API key is server-side only (never exposed to client)
- JSON validation with automatic repair attempt on first failure
- Ingredients are matched to existing global ingredients or created as household-scoped
- Recipe steps are formatted as markdown
- URL imports store the original recipe page in `source_url`
- Token usage is logged to console (consider adding DB tracking table for analytics)
- iOS only shows writable household libraries in save pickers; public libraries are browseable/read-only

## Security
- Authentication required (requireAuth)
- Household membership verified
- Recipe library ownership verified
- Rate limiting enforced
- Input validation with Zod schemas
- Max query length: 500 characters
- URL import blocks localhost and private-network addresses

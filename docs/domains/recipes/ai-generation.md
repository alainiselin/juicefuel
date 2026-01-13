# AI Recipe Generation

## Overview
The AI Recipe Generation feature allows users to generate complete, structured recipes from natural language prompts using OpenAI's GPT-4o-mini model. Generated recipes include ingredients, cooking steps, timing, servings, and appropriate tags.

## Features
- Natural language recipe generation (e.g., "authentic pho", "quick weeknight pasta")
- Constraint support (diet, allergens, time limits, skill level)
- Tag integration with existing tagging system
- Rate limiting (10 per user/day, 60 per household/day)
- Automatic ingredient creation or matching
- JSON schema validation with automatic repair
- Token usage and cost tracking

## Environment Variables
Add to your `.env` file:
```
OPENAI_API_KEY=sk-...your-key-here...
```

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
      "model": "gpt-4o-mini"
    }
  },
  "meta": {
    "model": "gpt-4o-mini",
    "prompt_version": "1.0",
    "input_tokens": 1234,
    "output_tokens": 567,
    "total_tokens": 1801,
    "estimated_cost_usd": 0.000523
  }
}
```

### POST /api/recipes/generate/save
Save a generated draft as a real recipe.

**Request:**
```json
{
  "household_id": "uuid",
  "recipe_library_id": "uuid",
  "draft": { ...RecipeDraft object from generate endpoint... }
}
```

**Response:**
Recipe object with ID, ingredients, and tags attached.

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
Based on gpt-4o-mini pricing (as of 2024):
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens
- Typical recipe: ~1500-2000 total tokens
- Estimated cost per generation: $0.0005-0.001

## Implementation Notes
- OpenAI API key is server-side only (never exposed to client)
- JSON validation with automatic repair attempt on first failure
- Ingredients are matched to existing global ingredients or created as household-scoped
- Recipe steps are formatted as markdown
- AI provenance is stored in `source_url` field as "ai-generated:{model}"
- Token usage is logged to console (consider adding DB tracking table for analytics)

## Security
- Authentication required (requireAuth)
- Household membership verified
- Recipe library ownership verified
- Rate limiting enforced
- Input validation with Zod schemas
- Max query length: 500 characters

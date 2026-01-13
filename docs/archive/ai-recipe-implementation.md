# AI Recipe Generation - Implementation Complete

## What Was Implemented

### Backend (Server-side)
1. **AI Recipe Generator Service** (`server/services/aiRecipeGenerator.ts`)
   - OpenAI GPT-4o-mini integration
   - Structured JSON generation with strict validation
   - Tag allowlist integration (fetches from existing tag system)
   - Automatic retry with repair on validation failure
   - Token usage tracking and cost estimation

2. **API Endpoints**
   - `POST /api/recipes/generate` - Generate recipe draft from prompt
   - `POST /api/recipes/generate/save` - Save draft as real recipe
   - Full auth + household membership validation
   - Rate limiting (10 per user/day, 60 per household/day)

3. **Features**
   - Constraint support (diet, allergens, time, skill level)
   - Ingredient matching (global) or creation (household-scoped)
   - Tag resolution and attachment
   - AI provenance tracking in recipe metadata

### Frontend (Client-side)
1. **Composable** (`app/composables/useAIRecipeGenerator.ts`)
   - Type-safe interface
   - Loading states
   - Error handling

2. **UI Integration** (Recipes page)
   - "Generate with AI" button in header
   - Modal with:
     - Query input
     - Servings selector
     - Max time constraint
     - Preview of generated recipe
     - Save/Regenerate actions

### Documentation
- Full docs in `/docs/AI_RECIPE_GENERATION.md`
- Testing examples with curl
- Cost estimation info
- Rate limiting details

## Files Created/Modified

### Created:
- `server/services/aiRecipeGenerator.ts`
- `server/api/recipes/generate.post.ts`
- `server/api/recipes/generate/save.post.ts`
- `app/composables/useAIRecipeGenerator.ts`
- `docs/AI_RECIPE_GENERATION.md`
- `docs/AI_RECIPE_IMPLEMENTATION_SUMMARY.md` (this file)

### Modified:
- `app/pages/recipes/index.vue` - Added AI generation button and modal
- `package.json` - Added openai dependency

## Environment Setup

Add to `.env`:
```
OPENAI_API_KEY=sk-...your-key-here...
```

## Testing

### Via UI:
1. Go to `/recipes`
2. Select a library you own
3. Click "Generate with AI" (purple button)
4. Enter query (e.g., "quick chicken stir fry")
5. Optionally set servings and max time
6. Click "Generate Recipe"
7. Preview the result
8. Click "Save Recipe" to add to library

### Via curl:
```bash
# Generate
curl -X POST http://localhost:3000/api/recipes/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "household_id": "uuid",
    "query": "authentic pho",
    "servings": 4
  }'

# Save
curl -X POST http://localhost:3000/api/recipes/generate/save \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "household_id": "uuid",
    "recipe_library_id": "uuid",
    "draft": { ...draft from generate... }
  }'
```

## Rate Limits
- Per user: 10 generations per 24 hours
- Per household: 60 generations per 24 hours

## Cost per Generation
- Model: gpt-4o-mini
- Typical tokens: 1500-2000 total
- Estimated cost: $0.0005 - $0.001 per recipe
- Logged to console for monitoring

## Security Notes
- ✅ OpenAI API key is server-side only
- ✅ Authentication required on all endpoints
- ✅ Household membership verified
- ✅ Recipe library ownership checked
- ✅ Rate limiting enforced
- ✅ Input validation with Zod
- ✅ Max query length: 500 characters

## Tag Integration
- Uses existing unified tagging system
- Fetches GLOBAL + HOUSEHOLD tags as allowlist
- AI selects from allowlist only
- No automatic tag creation (uses existing tags)
- Supports: CUISINE, FLAVOR, DIET, ALLERGEN, TECHNIQUE, TIME, COST

## Ingredient Handling
- Matches existing global ingredients by normalized name
- Creates new household-scoped ingredients if not found
- All new ingredients marked as recipe-eligible
- Source marked as 'USER' for created ingredients

## Recipe Metadata
- Steps formatted as markdown
- Description + steps combined in instructions_markdown
- AI provenance stored in source_url as "ai-generated:{model}"
- Prep time set to total_min from AI response
- Base servings from AI response

## Next Steps (Optional)
- [ ] Add DB table for token usage analytics
- [ ] Add more constraint options (cuisine, specific ingredients)
- [ ] Allow editing draft before saving
- [ ] Add recipe image generation (DALL-E)
- [ ] Batch generation for meal planning
- [ ] Fine-tune prompts based on user feedback

## Known Limitations
- Rate limiting is in-memory (resets on server restart)
- No image generation yet
- Tags limited to existing allowlist
- No streaming responses (waits for full generation)

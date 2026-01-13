# Tagging UI Implementation

## Changes Made

### 1. New Components

**`app/components/TagInput.vue`**
- Reusable tag input component with autocomplete
- Supports creating new tags on-the-fly
- Debounced search with tag suggestions
- Filter by tag kinds (CUISINE, DIET, etc.)
- Visual tag chips with remove buttons

### 2. Recipe Edit Page (`app/pages/recipes/edit-[id].vue`)

**Added:**
- Tags section below basic information
- TagInput component integrated
- Real-time tag attach/detach via API
- Tags persist across page refreshes

**Features:**
- Search existing tags or create new ones
- Scoped to household context
- Immediate API persistence (attach/detach)
- Rollback on API errors

### 3. Recipe API Enhancement (`server/api/recipes/[id].get.ts`)

**Updated to include:**
- Recipe tags in response
- Tag details (id, name, slug, kind)
- Mapped from junction table (recipe_tag)

### 4. Meal Selection Modal (`app/components/planner/AddMealSlotDialog.vue`)

**Search Enhancement:**
- Now searches BOTH recipe titles AND tags
- Multi-term search (all terms must match)
- Example: "mexican vegan" matches recipes tagged with both
- Visual tag chips shown in recipe cards (max 3 + count)

**User Experience:**
- Clear placeholder: "Search by title or tags..."
- Help text: "Search works across all libraries and recipe tags"
- Tags displayed under each recipe in results

## Usage

### Adding Tags to a Recipe

1. Navigate to recipe edit page (`/recipes/:id/edit`)
2. Scroll to "Tags" section
3. Type to search existing tags or create new ones
4. Click tag to add (or press Enter when highlighted)
5. Tags save immediately via API

### Searching Recipes by Tags (Meal Planner)

1. Open "Add Meal" dialog in meal planner
2. Type tags in search box (e.g., "mexican vegan quick")
3. All matching recipes appear
4. Tags are visible on each recipe card

### Creating Custom Tags

- Type a new tag name in TagInput
- Click "+ Create [name]" option
- New tag is created and attached immediately
- Scoped to current household (HOUSEHOLD scope)

## Technical Details

### Tag Search Algorithm

**Meal Planner Search:**
```typescript
// Split query into terms
const searchTerms = query.split(/\s+/).filter(Boolean);

// Match if ALL terms are in title OR tags
recipes.filter(recipe => {
  const title = recipe.title.toLowerCase();
  const tags = recipe.tags.map(t => t.name.toLowerCase());
  const allText = [title, ...tags].join(' ');
  
  return searchTerms.every(term => allText.includes(term));
});
```

**Benefits:**
- Flexible multi-term search
- "mexican vegan" finds recipes with both tags
- Also matches partial title words
- Fast client-side filtering

### API Integration

**Tag Attach:**
```bash
POST /api/recipes/:id/tags
Body: { "tag_id": "uuid" }
```

**Tag Detach:**
```bash
DELETE /api/recipes/:id/tags/:tagId
```

**Tag Search (for autocomplete):**
```bash
GET /api/tags?query=mex&household_id=uuid&limit=10
```

### Component Props

**TagInput:**
```typescript
<TagInput
  v-model="recipeTags"              // Array<{ id, name, kind? }>
  :household-id="householdId"       // string (required)
  :kinds="['CUISINE', 'DIET']"      // string[] (optional filter)
  placeholder="Add tags..."         // string (optional)
  @tag-added="handleAdd"            // (tagId: string) => void
  @tag-removed="handleRemove"       // (tagId: string) => void
/>
```

## User Workflows

### Workflow 1: Tag a Recipe

1. Edit recipe → Tags section
2. Type "mexican"
3. Select "Mexican" from dropdown (or create if new)
4. Tag appears as chip
5. ✓ Saved to database immediately

### Workflow 2: Find Tagged Recipes

1. Open meal planner
2. Click "+ Add Meal"
3. Search: "mexican vegan"
4. See all recipes with both tags
5. Visual tags on each card

### Workflow 3: Organize Recipe Library

1. Tag recipes by cuisine, diet, time, etc.
2. Use consistent tags across household
3. Fast discovery when planning meals
4. Future: dedicated browse/filter UI

## Next Steps (Not Implemented)

### Planned Features:
- Recipe library page with tag filters
- Tag management UI (rename, merge, delete)
- Tag analytics (most used, tag cloud)
- Preset tag suggestions by recipe type
- Shopping list item tagging (aisle grouping)

### Currently OUT OF SCOPE:
- Meal planner entry tagging (explicitly not supported)
- Ingredient tagging UI (backend ready, UI pending)
- Multi-household tag sharing
- Tag hierarchies/categories

## Files Modified

1. `app/components/TagInput.vue` (NEW)
2. `app/pages/recipes/edit-[id].vue` (MODIFIED - added tags section)
3. `server/api/recipes/[id].get.ts` (MODIFIED - include tags)
4. `app/components/planner/AddMealSlotDialog.vue` (MODIFIED - tag search)
5. `server/repos/recipeRepo.ts` (MODIFIED - tag filtering support)

All backend APIs were already implemented (see TAGGING_SYSTEM.md).

---

**Ready for Production:** ✅  
**User Tested:** Pending  
**Documentation:** Complete

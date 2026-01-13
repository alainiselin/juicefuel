# Shopping List UX Refactor - Bring! Style Implementation

## Summary

Successfully refactored the Shopping List page to match the Bring! app UX with a card-grid layout, proper rubric grouping, and shared component architecture with Recipe Edit view.

## Key Changes Made

### 1. Shared Utilities & Formatting
**Created:** `app/utils/ingredientFormatting.ts`

- **Centralized formatting functions:**
  - `formatQuantity()` - Clean number display (removes trailing zeros)
  - `formatUnit()` - Unit display mapping (G → g, KG → kg, etc.)
  - `formatQuantityUnit()` - Combined quantity + unit formatting
  
- **Rubric system definitions:**
  - `SHOPPING_RUBRICS` - Fixed array of 14 rubrics in supermarket order
  - `getRubricForItem()` - Maps item tags → rubric (with "Own Items" fallback)
  - `RubricId` - Type-safe rubric identifier

### 2. Refactored Recipe Edit Component
**Modified:** `app/components/recipe/IngredientCard.vue`

- Removed duplicate `formatNumber()` and `formatUnit()` functions
- Now imports shared utilities from `ingredientFormatting.ts`
- Maintains all existing functionality (editing, scaling, notes)
- Same visual appearance and behavior

### 3. New Shopping List Card Component
**Created:** `app/components/shopping/ShoppingItemCard.vue`

**Features:**
- **Square card design** - matches Recipe Edit ingredient cards (aspect-square)
- **Same visual style:**
  - White background with border
  - Bold ingredient name (text-xs, top-left aligned)
  - Large quantity + unit display (text-lg, blue/gray depending on state)
  - Proper spacing and padding (p-2, consistent with recipe cards)
  
- **Shopping-specific behavior:**
  - Click entire card to toggle checked state (no edit mode)
  - Checkbox indicator (top-right corner, green when checked)
  - Visual feedback: opacity-50 and line-through when checked
  - Strikethrough on ingredient name when checked
  - Color changes: blue-600 → gray-500 when checked

- **Props:**
  - `item: ShoppingListItemDetail` - full item data with ingredient joined
  
- **Emits:**
  - `toggleChecked(itemId, isChecked)` - for parent to handle state updates

### 4. Complete Shopping Page Redesign
**Replaced:** `app/pages/shopping.vue` (old → `shopping-old-v1.vue`)

#### Layout Structure
```
Header (sticky)
  ├─ Title + current list name
  ├─ "Add Item" + "New List" buttons
  └─ List selector dropdown

Content Area
  └─ Rubric Sections (only rubrics with items shown)
      ├─ Rubric Header (collapsible)
      │   ├─ Rubric name + icon
      │   ├─ Count (unchecked / total)
      │   └─ ChevronDown toggle
      │
      └─ Rubric Content
          ├─ Unchecked Items Grid
          │   └─ 2-6 columns (responsive: 2→4→5→6)
          │
          └─ Checked Items (collapsed by default)
              ├─ "X checked items" button
              └─ Expandable grid of checked items
```

#### Rubric Grouping Logic
1. Fetch shopping list items with ingredient data
2. For each item:
   - Look for AISLE tag in `item.tags`
   - Map tag slug to rubric via `SHOPPING_RUBRICS` lookup
   - Fallback to "own-items" if no AISLE tag found
3. Group items by rubric
4. Separate checked vs unchecked within each rubric
5. Display rubrics in fixed order (SHOPPING_RUBRICS array)
6. Only show rubrics that have items

#### Key UX Features
- **Card grid layout:** Same responsive grid as Recipe Edit (2→4→5→6 cols)
- **Collapsible rubrics:** Click header to expand/collapse entire section
- **Checked items:** Moved to bottom, collapsed by default, expandable
- **Fast interactions:** Click any card to toggle checked state instantly
- **Visual consistency:** Cards look identical to Recipe Edit ingredient cards
- **Empty states:** Clear guidance when no list or no items
- **Modal for adding:** Reuses existing ingredient search pattern

#### State Management
```typescript
rubricsWithItems: computed(() => {
  // Returns array of rubrics with items grouped
  // Structure: { id, name, items, uncheckedItems, checkedItems, uncheckedCount }
})

collapsedRubrics: Set<RubricId>
expandedCheckedSections: Set<RubricId>
```

### 5. Architecture Benefits

#### Code Reuse
- **Shared formatting logic** - Both Recipe Edit and Shopping List use same utilities
- **Consistent display** - Quantity/unit formatting identical across views
- **Type safety** - RubricId type prevents typos in rubric identifiers

#### Maintainability
- **Single source of truth** for rubric definitions
- **Single source of truth** for formatting rules
- **Easy to add new rubrics** - just add to SHOPPING_RUBRICS array
- **Easy to change formatting** - update one function, affects both views

#### Component Composition
```
Recipe Edit View              Shopping List View
    ↓                              ↓
IngredientCard.vue          ShoppingItemCard.vue
    ↓                              ↓
ingredientFormatting.ts ← shared utilities
```

## Data Flow

### Fetching & Display
1. Load shopping list from API (includes ingredient data joined)
2. Items have `tags` array (from `shopping_list_item_tag` join)
3. `getRubricForItem(tags)` determines rubric for each item
4. Items grouped by rubric in computed property
5. ShoppingItemCard receives full item data
6. Component formats display using shared utilities

### Tag Mapping
```typescript
Item Tags → getRubricForItem() → Rubric ID

Example:
item.tags = [{ kind: 'AISLE', slug: 'fruits-vegetables' }]
  ↓
getRubricForItem(tags) returns 'fruits-vegetables'
  ↓
Displayed in "Fruits & Vegetables" rubric section
```

### Fallback Behavior
```typescript
// No AISLE tag found
item.tags = [{ kind: 'DIET', slug: 'vegan' }]
  ↓
getRubricForItem(tags) returns 'own-items'
  ↓
Displayed in "Own Items" rubric section
```

## Visual Comparison

### Before (Old Shopping List)
- Plain checkbox list
- No grouping
- Linear vertical layout
- Different styling from rest of app

### After (New Shopping List)
- Card grid layout (matches Recipe Edit)
- Grouped by 14 supermarket rubrics
- Collapsible sections
- Checked items separated but accessible
- Consistent with app's design language

## Files Changed

### Created
- `app/utils/ingredientFormatting.ts` - Shared utilities
- `app/components/shopping/ShoppingItemCard.vue` - Shopping card component

### Modified
- `app/components/recipe/IngredientCard.vue` - Now uses shared utilities
- `app/pages/shopping.vue` - Complete redesign with rubrics

### Backed Up
- `app/pages/shopping-old-v1.vue` - Original implementation preserved

## API Requirements Met

### Existing API Already Supports This
The `/api/shopping-list/[id]` endpoint returns:
```typescript
{
  items: [{
    id, ingredient_id, quantity, unit, is_checked,
    ingredient: { id, name, ... },
    tags: [{ id, kind, slug, ... }]  // ← AISLE tags included
  }]
}
```

**No schema changes needed** - existing structure supports rubric mapping.

## Testing Checklist

✅ TypeScript compilation passes (no errors)
✅ Server starts successfully
✅ Shopping list loads with items
✅ Items grouped by rubric correctly
✅ Cards look identical to Recipe Edit cards
✅ Checked items toggle state
✅ Collapsed sections work
✅ Fallback to "Own Items" works for untagged items
✅ Add item modal works
✅ Responsive grid layout (2-4-5-6 columns)
✅ Empty states display correctly

## User Experience

### Shopping Flow
1. User opens Shopping List (sidebar icon)
2. Sees items grouped by supermarket section
3. Walks through store following rubric order
4. Taps each card to check off items
5. Checked items fade and move to collapsed section
6. Clean, fast, low-friction experience

### Bring!-Style Features Achieved
- ✅ Card-based layout (not list)
- ✅ Grouped by aisle/rubric
- ✅ Fixed supermarket-native ordering
- ✅ Fast check/uncheck interaction
- ✅ Visual feedback on checked state
- ✅ Collapsible sections
- ✅ Low cognitive load

## Future Enhancements (Not in Scope)

### Tag Management
- Admin interface to bulk-assign AISLE tags to ingredients
- AI-powered ingredient categorization
- User-customizable rubric order per household

### Advanced Features
- Generate shopping list from meal plan (API exists, UI integration needed)
- Merge duplicate ingredients across rubrics
- Shopping list sharing/collaboration
- Store location presets (Migros, Coop, etc.)

## Implementation Notes

### Why This Approach Works

1. **Minimal changes** - Reused existing components pattern
2. **No schema changes** - Leveraged existing tag system
3. **Graceful degradation** - Works even without AISLE tags (Own Items fallback)
4. **Type-safe** - RubricId prevents typos, compile-time checking
5. **Maintainable** - Single source of truth for formatting and rubrics
6. **Testable** - Pure functions for formatting and mapping

### Design Decisions

**Why card grid instead of list?**
- Matches Recipe Edit UX (consistency)
- Better use of screen space
- More scannable for shopping
- Feels modern and app-like

**Why collapse checked items by default?**
- Reduces visual clutter while shopping
- Focus on what's left to get
- Still accessible with one click
- Matches Bring! app behavior

**Why fixed rubric order?**
- Supermarket layout is consistent (mostly)
- Users can learn the order
- Walking path optimization
- Reduces decision fatigue

**Why fallback to "Own Items"?**
- System works even with incomplete tags
- No blocking dependency on tag management
- User can still add any item
- Gradual migration path (tag items over time)

## Status: ✅ Complete

The Shopping List now provides a Bring!-style experience with:
- Card-based grid layout matching Recipe Edit
- 14 rubric sections in supermarket order
- Shared component architecture
- Tag-based automatic categorization
- Graceful fallback for untagged items
- Fast, low-friction check/uncheck interactions

Ready for user testing and feedback.

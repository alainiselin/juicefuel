# Shopping List Implementation Complete

## Summary

A comprehensive Shopping List system has been implemented for JuiceFuel, following the Bring! app UX principles with a supermarket-native rubric-based organization.

## Key Features Implemented

### 1. Navigation
- Added Shopping Cart icon to left sidebar navigation
- Route: `/shopping`
- Positioned between "Planner" and "Recipes"

### 2. Shopping List CRUD
Full create, read, update, delete functionality for shopping lists:
- Create new shopping lists with custom titles
- View all active shopping lists
- Update list details (title, status, store hint)
- Delete shopping lists
- Switch between multiple lists

### 3. Shopping List Items
Complete item management:
- Add items with ingredient search
- Specify quantity and unit
- Check/uncheck items (visual feedback with strikethrough)
- Delete items from list
- Items automatically grouped by rubric

### 4. Rubric System (14 Fixed Sections)
Items organized in supermarket-walking order:
1. Fruits & Vegetables
2. Bread & Pastries
3. Milk & Cheese
4. Meat & Fish
5. Ingredients & Spices
6. Grain Products
7. Frozen & Convenience
8. Snacks & Sweets
9. Beverages
10. Household
11. Care & Health
12. Pet Supplies
13. Home & Garden
14. Own Items (default for items without AISLE tags)

Each rubric is:
- Collapsible (click to expand/collapse)
- Shows item count
- Only displayed if it contains items
- Has a relevant icon

### 5. Tag Integration
- Added 14 AISLE tags to `tags.seed.json`
- Items are automatically categorized by AISLE tags on ingredients
- Falls back to "Own Items" if no AISLE tag exists
- System respects existing tag infrastructure

## Backend Architecture

### New Repository
`server/repos/shoppingListRepo.ts`
- `findByHouseholdId()` - Get lists for household
- `findById()` - Get single list with items
- `create()` - Create new list
- `update()` - Update list properties
- `delete()` - Delete list
- `addItem()` - Add item to list
- `updateItem()` - Update item (quantity, unit, checked status)
- `deleteItem()` - Remove item
- `addItemTag()` / `removeItemTag()` - Tag management

### API Endpoints

#### Shopping Lists
- `GET /api/shopping-list?status=ACTIVE` - List shopping lists
- `POST /api/shopping-list` - Create list
- `GET /api/shopping-list/[id]` - Get list details
- `PATCH /api/shopping-list/[id]` - Update list
- `DELETE /api/shopping-list/[id]` - Delete list
- `GET /api/shopping-list/generate` - Generate from meal plan (legacy)

#### Shopping List Items
- `POST /api/shopping-list/[id]/items` - Add item to list
- `PATCH /api/shopping-list-items/[itemId]` - Update item
- `DELETE /api/shopping-list-items/[itemId]` - Delete item
- `POST /api/shopping-list-items/[id]/tags/index.post.ts` - Add tag (existing)
- `DELETE /api/shopping-list-items/[id]/tags/[tagId].delete.ts` - Remove tag (existing)

### Updated Schemas
`spec/schemas.ts` - Added:
- `ShoppingListStatusSchema` - DRAFT, ACTIVE, COMPLETED, ARCHIVED
- `ShoppingListItemDetail` - Full item with ingredient and tags
- `ShoppingListDetail` - Full list with items
- `CreateShoppingListSchema` - Input for creating lists
- `UpdateShoppingListSchema` - Input for updating lists
- `CreateShoppingListItemSchema` - Input for adding items
- `UpdateShoppingListItemSchema` - Input for updating items

## Frontend Architecture

### Page Component
`app/pages/shopping.vue`
- List selector dropdown
- Create new list button
- Add item modal with ingredient search
- Rubric sections (collapsible)
- Item checkboxes with visual feedback
- Delete item buttons
- Empty states

### Store
`app/stores/shoppingList.ts` - Enhanced with:
- `fetchShoppingLists()` - Load lists by status
- `fetchShoppingListById()` - Load single list
- `createShoppingList()` - Create new list
- `updateShoppingList()` - Update list properties
- `deleteShoppingList()` - Delete list
- `addItem()` - Add item to current list
- `toggleItemChecked()` - Check/uncheck item
- `removeItem()` - Delete item

### Composable
`app/composables/useApi.ts` - Added all shopping list API methods

### Layout
`app/components/layout/DesktopShell.vue`
- Added ShoppingCart icon import
- Added shopping list navigation link

## Database

### Existing Tables (Used)
- `shopping_list` - List metadata
- `shopping_list_item` - Items in lists
- `shopping_list_item_tag` - Tags on items
- `ingredient` - Ingredient data
- `ingredient_tag` - AISLE tags on ingredients
- `tag` - Tag definitions (including AISLE kind)

### Tag Seed Data
`tags.seed.json` - Added 14 AISLE tags:
- fruits-vegetables
- bread-pastries
- milk-cheese
- meat-fish
- ingredients-spices
- grain-products
- frozen-convenience
- snacks-sweets
- beverages
- household
- care-health
- pet-supplies
- home-garden
- own-items

## User Experience

### Shopping Flow
1. User navigates to Shopping List from sidebar
2. Creates or selects a shopping list
3. Adds items using ingredient search
4. Items automatically appear in correct rubric
5. Walks through store checking items off
6. Completed items fade/strikethrough
7. Can delete unwanted items

### Mobile-Optimized (Responsive Design)
- Collapsible rubrics reduce scrolling
- Large touch targets for checkboxes
- Modal for adding items
- Clean, minimal interface

### Bring!-Style Features
- Linear, fast interaction
- Low cognitive load
- Supermarket-native ordering
- Visual item organization
- Quick check/uncheck

## Native iOS Support

The iOS app now supports the core manual shopping workflow against the same API:

- Create new shopping lists.
- Finish active shopping lists.
- Add existing ingredients and article-backed items.
- Create custom articles from the add-item flow.
- Edit item quantity, unit, and notes.
- Check/uncheck items with optimistic UI updates.
- Delete list items.

Backend response shaping was tightened so `PATCH /api/shopping-list/[id]` returns article-backed and ingredient-backed items consistently. This matters for native decoding because iOS has separate models for `ingredient` and `article` shopping rows.

One-tap generation from the active meal plan is also supported on iOS — see [generate-from-meal-plan](./generate-from-meal-plan.md).

Still missing on iOS:

- Offline shopping mode.
- Shared-household conflict handling and presence.

## Testing

### Manual Testing Steps
1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3002
3. Login with test credentials
4. Click Shopping Cart icon in sidebar
5. Create a new shopping list
6. Add items (search for ingredients)
7. Check/uncheck items
8. Collapse/expand rubrics
9. Delete items
10. Switch between lists

### Seed AISLE Tags
Run: `npm run import:tags`
This will import the 14 new AISLE tags into the database.

### Map Ingredients to AISLE Tags
Need to manually tag common ingredients with AISLE tags via:
- Admin interface (future)
- Direct SQL inserts (temporary)
- Or: Let system default to "Own Items" until tags are added

## Future Enhancements

### Phase 2 (Suggested)
- Merge duplicate ingredients across lists
- Share shopping lists with household members
- Barcode scanning for item addition
- Store location presets (Migros, Coop, etc.)
- Smart sorting within rubrics
- Quantity adjustment UI
- Recipe source tracking per item
- Shopping history / frequently bought items
- Push notifications for shared lists

### Phase 3 (Advanced)
- Offline mode with sync
- AI-powered ingredient categorization
- Price tracking integration
- Nutrition info per item
- Meal plan integration (one-click export)
- Custom rubric creation per household

## Files Changed/Created

### Created
- `server/repos/shoppingListRepo.ts`
- `server/api/shopping-list/index.get.ts`
- `server/api/shopping-list/index.post.ts`
- `server/api/shopping-list/[id].get.ts`
- `server/api/shopping-list/[id].patch.ts`
- `server/api/shopping-list/[id].delete.ts`
- `server/api/shopping-list/[id]/items.post.ts`
- `server/api/shopping-list-items/[itemId].patch.ts`
- `server/api/shopping-list-items/[itemId].delete.ts`
- `app/pages/shopping.vue`

### Modified
- `tags.seed.json` - Added 14 AISLE tags
- `spec/schemas.ts` - Added shopping list CRUD schemas
- `app/composables/useApi.ts` - Added shopping list methods
- `app/stores/shoppingList.ts` - Enhanced with CRUD operations
- `app/components/layout/DesktopShell.vue` - Added navigation link

### Renamed
- `server/api/shopping-list/index.get.ts` → `generate.get.ts` (meal plan aggregation)
- `app/pages/shopping-list.vue` → `shopping-list-old.vue` (backup)

## Notes

### AISLE Tag Assignment
The system is ready to use, but most ingredients don't have AISLE tags yet. Items without AISLE tags will appear in "Own Items" section. To populate AISLE tags:

1. **Option A: SQL Batch Insert** (Quick)
```sql
-- Example: Tag common produce
INSERT INTO ingredient_tag (ingredient_id, tag_id)
SELECT i.id, t.id
FROM ingredient i, tag t
WHERE t.slug = 'fruits-vegetables'
AND i.name IN ('Apple', 'Banana', 'Carrot', 'Lettuce', ...);
```

2. **Option B: Admin UI** (Future)
Build an admin interface for bulk tag management.

3. **Option C: Accept Default** (Current)
All items appear in "Own Items" until tagged manually during use.

### Performance
- Database queries include necessary joins
- Items loaded once per list view
- Real-time updates via store mutations
- No polling/websockets yet (future enhancement)

## Status: ✅ COMPLETE & READY FOR USE

The Shopping List system is fully implemented and functional. Users can create lists, add items, organize by rubrics, and manage their shopping workflow. The system integrates seamlessly with the existing JuiceFuel architecture and respects all design principles.

# Shopping List UX Improvements & Aisle Grouping Bug Fix

## Summary

Implemented critical UX improvements and fixed the aisle grouping bug that caused items to jump to "Own Items" after mutations.

## Problems Solved

### 1. ✅ Check-off UX (Mobile-Friendly)
**Before:** Tiny checkbox dot in top-right corner - fiddly on mobile  
**After:** Tap anywhere on card to toggle checked state

### 2. ✅ Delete Control
**Before:** No way to remove items from list  
**After:** Red X button in top-right corner (matches Recipe Edit pattern)

### 3. ✅ Inline Search/Add Bar
**Before:** Had to click "Add Item" button and use modal  
**After:** Quick inline search bar at top of list with autocomplete

### 4. ✅ CRITICAL: Fixed Aisle Grouping Bug
**Before:** Items jumped to "Own Items" after any mutation  
**After:** Items stay in correct aisle/rubric consistently

**Root Cause:** API endpoints returned tags from `shopping_list_item_tag` only, missing `ingredient.ingredient_tag` (AISLE tags)!

**The Fix:** Now includes both tag sources in API responses.

## Files Changed

**Backend:**
- `server/repos/shoppingListRepo.ts` - Added ingredient tag joins
- `server/api/shopping-list-items/[itemId].patch.ts` - Returns combined tags
- `server/api/shopping-list/[id]/items.post.ts` - Returns combined tags

**Frontend:**
- `app/components/shopping/ShoppingItemCard.vue` - Card click + delete button
- `app/pages/shopping.vue` - Inline search + delete handler + tag diagnostics

## Acceptance Criteria

✅ Can check/uncheck by tapping card body  
✅ X delete works and doesn't toggle check  
✅ Search bar adds items quickly using ingredient_id  
✅ After all mutations, items remain in correct rubric  
✅ No refresh needed - stable aisle grouping  

## Status: ✅ Complete

Shopping list UX is now mobile-friendly with stable aisle grouping!

---
title: Generate Shopping List from Meal Plan
category: domain
domain: shopping
status: stable
---

# Generate Shopping List from Meal Plan

One-click generation of shopping list items from planned meals. The user picks a target list and a number of days ahead; the server walks the meal plan over that window, aggregates ingredients across recipes, and merges them into the chosen list.

## User flow

**Web** — `Shopping` page header → "Generate from Meal Plan" button → modal with:
- Target list picker (defaults to currently-selected list)
- Days slider (1–14, default 7)
- Date range preview (today → today+days−1)

**iOS** — Same feature in two places:
- Top-level `Shopping` toolbar (wand icon) → defaults to first active list
- Inside a list (detail view toolbar) → defaults to that list

Both surfaces pick a target list, choose days, and tap **Generate**. The list refreshes in place; a small status line shows `added N, merged M`.

## API

### `POST /api/shopping-list/[id]/generate-from-meal-plan`

```json
// request body
{
  "meal_plan_id": "uuid",
  "from": "YYYY-MM-DD",
  "to": "YYYY-MM-DD"
}

// response
{
  "added": 4,
  "merged": 2,
  "list": { /* full ShoppingListDetail with refreshed items */ }
}
```

`from` and `to` are inclusive local-date keys. The client computes the window from the days input and the user's current date — the server doesn't know the user's timezone.

The endpoint verifies:
1. The shopping list belongs to a household the caller is a member of.
2. The meal plan belongs to the **same** household as the list.

## Aggregation behavior

Implemented in [`server/services/shoppingListService.ts`](../../../server/services/shoppingListService.ts):

- Walks `meal_slot` rows in the date range, with their `recipe.ingredients[].ingredient` joined.
- Aggregates by `(ingredient_id, unit)` — same ingredient with **different units does not merge**, by design (e.g. 250 ml milk + 1 L milk stay separate).
- Sums quantities when both sides have a numeric quantity. If one side is `null`, only the numeric side contributes.
- Resolves `null` units to the ingredient's `default_unit`, falling back to `PIECE`. This matches what `shoppingListRepo.addItem()` would do anyway, and keeps subsequent generations from creating duplicates with mismatched-but-equivalent units.

## Merge into existing list

For each aggregated entry:

1. Look up an existing item on the list with the same `ingredient_id` **and** resolved unit.
2. If found and the aggregate has a numeric quantity → update `quantity = existing + aggregate`.
3. If found and the aggregate is `null` → noop (the ingredient is already on the list).
4. If not found → insert a new shopping list item with that quantity and unit.

Articles (custom non-food shopping items) are never produced by generation — only `ingredient_id`-backed items.

## Implementation notes

- The pure aggregator (`aggregateIngredients`) is duplicated in [`shoppingListService.test.ts`](../../../server/services/shoppingListService.test.ts) so unit tests run without pulling in Prisma. Keep the two copies in sync.
- The legacy read-only endpoint `GET /api/shopping-list/generate` still exists and returns the same aggregation without persisting. It now also includes `ingredient_id` in each item.
- Web UI fetches the household's meal plan id from `/api/households` on mount. If the household has no meal plan yet, the modal shows an inline notice and the Generate button stays disabled.

## Files

**Backend**
- `server/api/shopping-list/[id]/generate-from-meal-plan.post.ts` — endpoint
- `server/services/shoppingListService.ts` — `aggregateIngredients` (also keyed on `ingredient_id`)

**Web**
- `app/components/shopping/ShoppingListGeneratorModal.vue` — the modal
- `app/pages/shopping.vue` — button + meal-plan id resolution

**iOS**
- `ios/JuiceFuel/Views/Shopping/ShoppingListView.swift` — `GenerateShoppingListSheet` and toolbar buttons on both top-level and detail views

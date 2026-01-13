---
title: Rubric-Based Organization
category: concept
domain: shopping
status: stable
---

# Rubric-Based Organization

JuiceFuel uses a fixed 14-rubric system to organize shopping list items, inspired by the Bring! app.

## What is a Rubric?

A **rubric** is a fixed category representing a section of a typical supermarket. Items are automatically grouped by rubric for efficient shopping.

## The 14 Rubrics

In supermarket walking order:

1. **Fruits & Vegetables** - Fresh produce section
2. **Bread & Pastries** - Bakery items
3. **Milk & Cheese** - Dairy section
4. **Meat & Fish** - Protein section
5. **Ingredients & Spices** - Cooking essentials
6. **Grain Products** - Pasta, rice, cereals
7. **Frozen & Convenience** - Frozen foods
8. **Snacks & Sweets** - Treats and snacks
9. **Beverages** - Drinks section
10. **Household** - Cleaning supplies, paper goods
11. **Care & Health** - Personal care, pharmacy
12. **Pet Supplies** - Pet food and accessories
13. **Home & Garden** - Hardware, plants
14. **Own Items** - Uncategorized or custom items

## Why Fixed Rubrics?

### ✅ Pros
- **Predictable**: Every shopping trip follows the same order
- **Efficient**: Walk through supermarket once, in order
- **No Setup**: Works immediately, no category management
- **Muscle Memory**: Users learn the order quickly
- **Universal**: Most supermarkets follow similar layouts

### ❌ Cons (Rejected Alternatives)
- **Flexible Tags**: Too much cognitive load, requires setup
- **AI Categorization**: Unpredictable, can be wrong
- **User-Defined Categories**: Time-consuming to configure

## How It Works

### Automatic Assignment
Items are assigned to rubrics via AISLE tags on ingredients:

```
Ingredient: "Tomato"
Tags: [AISLE:fruits-vegetables]
   ↓
Shopping List Item: "Tomato"
   ↓
Rubric: "Fruits & Vegetables"
```

### Fallback
Items without AISLE tags go to **"Own Items"** (rubric 14).

### Collapsible Sections
- Each rubric can be expanded/collapsed
- Only rubrics with items are displayed
- Item counts shown in headers

## UI Presentation

```
🥕 Fruits & Vegetables (3)
   [✓] Tomatoes
   [ ] Lettuce
   [ ] Carrots

🍞 Bread & Pastries (1)
   [ ] Sourdough Bread

🥛 Milk & Cheese (2)
   [ ] Milk
   [ ] Cheddar Cheese

...

📝 Own Items (2)
   [ ] Special spice blend
   [ ] Unusual ingredient
```

## Implementation

### Rubric Mapping
**File:** `app/constants/rubricMapping.ts`

Maps AISLE tag slugs to rubric indices:

```typescript
const RUBRIC_MAPPING = {
  'aisle:fruits-vegetables': 1,
  'aisle:bread-pastries': 2,
  'aisle:milk-cheese': 3,
  // ...
};
```

### Sorting Logic
1. Group items by rubric index
2. Within each rubric, sort alphabetically by ingredient name
3. Display rubrics in fixed order (1-14)
4. Hide empty rubrics

## Inspiration: Bring! App

The Bring! shopping list app uses a similar fixed-category system:
- **20 categories** (we use 14, simplified for MVP)
- **Icon-based** (we focus on text-first)
- **Supermarket order** (same principle)
- **Proven UX** (millions of users)

Our implementation is simpler but follows the same proven pattern.

## Related Documentation

- [[../domains/shopping/shopping-list-system]] - Shopping list implementation
- [[../domains/ingredients/aisle-mapping]] - How ingredients get AISLE tags

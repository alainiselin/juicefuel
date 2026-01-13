---
title: Why Fixed Rubrics Over Flexible Categories
category: decision
domain: shopping
status: stable
---

# Why Fixed Rubrics Over Flexible Categories

Decision to use 14 fixed rubrics instead of user-defined or flexible categories for shopping lists.

## Context

Shopping lists need organization. Items should be grouped for efficient shopping. Multiple approaches exist:
- Fixed categories (rubrics)
- User-defined categories
- Flexible tags
- AI-based categorization
- No organization (flat list)

## Decision

**Use 14 fixed rubrics based on supermarket walking order.**

## Rationale

### ✅ Pros of Fixed Rubrics

**1. Zero Setup**
- Works immediately, no configuration needed
- New users get organized lists from day one
- No "category management" overhead

**2. Predictable**
- Every shopping trip follows same order
- Build muscle memory
- Know what to expect

**3. Efficient**
- Walk through supermarket once, in order
- Minimize backtracking
- Faster shopping

**4. Universal**
- Most supermarkets follow similar layouts worldwide
- Rubrics map to physical store sections
- Easy to understand

**5. Simple Mental Model**
- 14 categories is manageable (not overwhelming)
- Clear boundaries (bread vs dairy)
- No ambiguity

### ❌ Cons (Trade-offs Accepted)

**1. Not Customizable**
- User cannot rename rubrics
- Cannot add/remove rubrics
- Locked to our 14 categories

**2. Store Variations**
- Some stores have different layouts
- Specialty stores may not map well
- User must mentally translate

**3. Edge Cases**
- Some items don't fit cleanly
- "Own Items" catch-all needed
- Subjective categorization

## Alternatives Considered

### Option 1: User-Defined Categories ❌

**Why Rejected:**
- Too much cognitive load (must create categories)
- Analysis paralysis (what categories to create?)
- Time-consuming setup
- Inconsistent across users
- Difficult to provide smart defaults

### Option 2: Flexible Tags ❌

**Why Rejected:**
- Requires tagging every item
- No clear order for shopping
- Tag management overhead
- Doesn't map to physical shopping
- Too abstract for this use case

### Option 3: AI Categorization ❌

**Why Rejected:**
- Unpredictable (can be wrong)
- No user control
- Requires training data
- Overkill for simple problem
- Still needs predefined categories

### Option 4: Store-Specific Layouts ❌

**Why Rejected:**
- Requires mapping every store
- Maintenance nightmare
- Most users shop at multiple stores
- Fixed rubrics work "good enough"

### Option 5: Flat List (No Organization) ❌

**Why Rejected:**
- Inefficient shopping
- Constant backtracking
- Poor UX
- Not competitive with other apps

## Inspiration

The **Bring!** shopping list app successfully uses this pattern:
- 20+ fixed categories
- Millions of active users
- Proven UX
- Industry standard

We simplified to 14 rubrics for MVP.

## Implementation Details

**Rubric Mapping:**
- Ingredients tagged with AISLE tags
- AISLE tags map to rubric indices (1-14)
- Fallback to "Own Items" (14) if no tag

**Ordering:**
1. Fruits & Vegetables
2. Bread & Pastries
3. Milk & Cheese
... (supermarket walking order)
14. Own Items

See [[../concepts/rubric-based-organization]] for full details.

## Future Considerations

**Could Add (Non-MVP):**
- User-customizable rubric ORDER
- Store layout presets (select your store)
- Per-household rubric preferences
- But keep 14 fixed rubrics as base

**Won't Add:**
- Fully flexible categories (too complex)
- Per-item category assignment (too tedious)

## Success Criteria

- [ ] Users can shop efficiently without backtracking
- [ ] New users understand rubrics immediately
- [ ] 95%+ of items fit into rubrics (not "Own Items")
- [ ] Shopping time reduced vs flat lists

## Related Documentation

- [[../concepts/rubric-based-organization]] - How rubrics work
- [[../domains/shopping/shopping-list-system]] - Shopping list implementation
- [[../domains/ingredients/aisle-mapping]] - How ingredients get rubrics

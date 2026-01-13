# Ingredient Case Normalization Fix

## Problem
The application was showing duplicate ingredients in search results (e.g., both "Cucumber" and "cucumber") because:
1. Ingredients were being stored with mixed case (some capitalized, some lowercase)
2. This created duplicate entries in the database with the unique constraint not catching them

## Solution

### 1. Database Cleanup
Created and ran a normalization script that:
- Found all case-insensitive duplicates
- For each duplicate set:
  - Kept the lowercase version (or renamed the kept one to lowercase)
  - Reassigned all `recipe_ingredient` references to the kept version
  - Handled conflicts where the same recipe had both versions
  - Deleted the duplicate entries
- **Results**: Cleaned up 9 duplicate ingredients and reassigned 13 recipe_ingredient references

### 2. Code Changes
Updated `scripts/import-off-ingredients.ts` to always store ingredients in lowercase:

**Line 31**: Updated comment to clarify name storage
```typescript
// Old: Canonical display name (proper case)
// New: Canonical name (always used for storage)
```

**Line 341**: Store lowercase in updates
```typescript
// Old: name: entry.name
// New: name: entry.nameLower
```

**Line 352**: Store lowercase in creates
```typescript
// Old: name: entry.name
// New: name: entry.nameLower
```

**Lines 369-388**: Store aliases in lowercase
```typescript
// Old: const aliasLower = alias.toLowerCase(); if (aliasLower === entry.nameLower) continue;
// New: Store aliasLower directly in database
```

### 3. Verification
- Search API already uses case-insensitive queries (`mode: 'insensitive'`)
- Confirmed no duplicates remain in database
- Sample queries return single results:
  - "cucumber" → 1 result (lowercase)
  - "banana" → 1 result (lowercase)

## Impact
- **Users**: No more duplicate ingredients in search results
- **Data**: All ingredient names are now consistently lowercase
- **Future**: New imports will always use lowercase, preventing this issue from recurring

## Technical Details
- Foreign key constraints required careful reassignment before deletion
- Some recipes had both versions of an ingredient, requiring deletion instead of reassignment
- The `toTitleCase()` function is no longer used for ingredient/alias storage

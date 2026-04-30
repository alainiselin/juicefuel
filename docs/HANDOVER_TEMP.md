---
title: Temporary Handover
category: guide
status: temporary
---

# Temporary Handover

This document is intentionally temporary. It exists so work can continue if the current Codex thread runs out of usage, tokens, or context. Delete this file once the iOS parity work is merged, shipped, or summarized in permanent docs.

## Current Goal

Bring the native iPhone app closer to parity with the Nuxt web app while preserving the web app as the source of truth and using the existing production API at `https://juicefuel.juicecrew.vip`.

## Environment Notes

- Repo: `/Users/alainiselin/Programming/juicefuel`
- iOS project is generated from `/Users/alainiselin/Programming/juicefuel/ios/project.yml`.
- Run `make -C ios gen` after editing `project.yml`.
- Xcode project is intentionally not committed.
- Local Mac is macOS 15.2 with Xcode 16.3 on Intel.
- Physical device builds work after registering the device with:
  `xcodebuild ... -allowProvisioningUpdates -allowProvisioningDeviceRegistration`
- Team id is now persisted in `ios/project.yml` as `DEVELOPMENT_TEAM: 5P58Q2KW74`.
- `npm` is not on this shell PATH. Typecheck has been run with:
  `/Applications/Codex.app/Contents/Resources/node node_modules/vue-tsc/bin/vue-tsc.js --noEmit`

## Completed In This Session

### Documentation Pass

Changed:

- `docs/guides/ios-development.md`
- `docs/guides/ios-parity-roadmap.md`
- `docs/README.md`
- `docs/domains/shopping/shopping-list-system.md`
- `docs/domains/planner/meal-plan-generator.md`
- `docs/domains/planner/desktop-planner.md`
- `docs/HANDOVER_TEMP.md`

Documented:

- Current iOS parity status.
- TestFlight/device-install notes.
- Phase 1 and Phase 2 completion.
- Phase 3 recipe roadmap.
- This handover file is temporary and should be deleted once the work is merged, shipped, or summarized elsewhere.

### Phase 1: iOS Shopping Parity

Changed:

- `ios/JuiceFuel/Models/ShoppingList.swift`
- `ios/JuiceFuel/Views/Shopping/ShoppingListView.swift`
- `server/api/shopping-list/[id].patch.ts`
- `server/repos/shoppingListRepo.ts`

Added iOS support for:

- Creating shopping lists.
- Searching shopping items via `/api/shopping/items/search`.
- Adding ingredient items.
- Creating household custom articles via `/api/shopping/articles`.
- Adding custom article items to shopping lists.
- Incrementing quantity when adding an existing item.
- Editing quantity, unit, and note.
- Deleting shopping list items.
- Checking/unchecking items.
- Finishing active shopping lists.

Backend fix:

- Shopping list PATCH responses now handle article-backed shopping items as well as ingredient-backed items.
- `shoppingListRepo.create/update` now include article and ingredient tag data consistently.

### Phase 2: iOS Planner Parity

Changed:

- `ios/JuiceFuel/Models/MealPlan.swift`
- `ios/JuiceFuel/Views/Planner/PlannerView.swift`
- `ios/JuiceFuel/Views/Planner/AddMealSheet.swift`
- `server/api/households/meal-plan.post.ts`

Added iOS support for:

- Loading the active household before resolving the meal plan.
- Creating a meal plan from iOS if none exists.
- Editing planned meals by changing slot and/or recipe.
- Removing planned meals with swipe actions.
- Generating meal plans on iOS with:
  - number of days,
  - breakfast/lunch/dinner selection,
  - diet,
  - favorite ratio,
  - avoid repeated recipes.
- Previewing generated meal slots.
- Applying generated meal plans to empty planner slots.

Backend fix:

- `POST /api/households/meal-plan` now requires auth, verifies household membership, and returns an existing meal plan if one already exists.

### Phase 3: iOS Recipes Parity Started

Changed:

- `ios/JuiceFuel/Views/Recipes/AddRecipeSheet.swift`
- `ios/JuiceFuel/Views/Recipes/RecipeDetailView.swift`
- `ios/JuiceFuel/Views/Recipes/RecipesListView.swift`
- `ios/JuiceFuel/Models/Recipe.swift`
- `server/api/recipes/index.post.ts`
- `server/api/recipes/[id].get.ts`
- `server/api/recipes/[id].patch.ts`
- `server/api/recipes/[id].delete.ts`
- `server/api/recipes/[id]/ingredients/index.post.ts`
- `server/api/recipes/[id]/ingredients/[recipeIngredientId].patch.ts`
- `server/api/user/favorites.post.ts`
- `server/repos/recipeRepo.ts`
- `server/services/recipeService.ts`
- `spec/schemas.ts`

Added iOS support for:

- Editing recipe title, description, base servings, prep time, instructions, and source URL.
- Deleting recipes from the recipe detail screen.
- Refreshing the recipe list after edit/delete.
- Searching recipe-eligible ingredients.
- Adding ingredients with quantity, unit, and note.
- Editing ingredient quantity, unit, and note.
- Deleting recipe ingredients.
- Favoriting and unfavoriting recipes from the recipe detail screen.
- Adding and removing recipe tags.
- Selecting the target recipe library when creating a recipe.
- Creating recipe libraries from iOS.
- Generating AI recipe drafts from iOS.
- Previewing and saving AI drafts to a selected recipe library.

Backend fix:

- Recipe create/read/update/delete endpoints now require auth and verify accessible or writable recipe libraries.
- Recipe updates now persist `base_servings`.
- Recipe create accepts `null` optional fields from iOS JSON encoding.
- Recipe ingredient create/update responses include both `name` and `canonical_name`.
- Favorite creation now verifies the recipe is accessible to the authenticated user before inserting.

### Phase 4: iOS Household/Profile Parity

Changed:

- `ios/JuiceFuel/Views/Profile/ProfileView.swift`
- `ios/JuiceFuel/Views/AppTabView.swift`
- `ios/JuiceFuel/Models/MealPlan.swift`
- `server/api/households/invite.post.ts`
- `server/api/households/join.post.ts`
- `server/api/households/[id].delete.ts`
- `server/api/households/[id]/members/[userId].patch.ts`
- `server/api/households/[id]/members/[userId].delete.ts`

Added iOS support for:

- Profile display and edit.
- Active household display.
- Household switching.
- Owner-only household rename.
- Owner-only invite generation with native share.
- Join household by invite code.
- Member list.
- Owner-only member role changes.
- Owner-only member removal.
- Leave household.
- Owner-only delete household.

Backend fix:

- Household invite generation now uses the active household instead of the user's first household.
- Joining a household sets it as the active household.
- Added household member role update/removal endpoints with last-owner safeguards.
- Added owner-only household deletion endpoint.

### Phase 5: iOS Polish/TestFlight Started

Changed:

- `ios/JuiceFuel/Assets.xcassets/AppIcon.appiconset/Contents.json`
- `ios/JuiceFuel/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png`
- `ios/JuiceFuel/Assets.xcassets/AccentColor.colorset/Contents.json`
- `ios/JuiceFuel/Views/JuiceFuelTheme.swift`
- `ios/JuiceFuel/JuiceFuelApp.swift`
- `ios/JuiceFuel/ContentView.swift`
- `ios/JuiceFuel/Views/LoginView.swift`
- `ios/JuiceFuel/Views/AppTabView.swift`
- `ios/JuiceFuel/Views/Recipes/RecipesListView.swift`
- `ios/JuiceFuel/Views/Planner/PlannerView.swift`
- `ios/JuiceFuel/Views/Shopping/ShoppingListView.swift`
- `ios/JuiceFuel/Views/Profile/ProfileView.swift`
- `docs/guides/ios-testflight-readiness.md`

Added:

- Generated 1024 px app icon.
- Asset catalog accent color.
- Shared native JuiceFuel theme/brand mark.
- Branded restore-session loading screen.
- Branded login header/background.
- Branded loading states for recipes, planner, and shopping.
- Recipe empty state now offers native create/generate actions.
- TestFlight readiness checklist.

## Verification Already Run

From `/Users/alainiselin/Programming/juicefuel/ios`:

```bash
make gen
xcodebuild -project JuiceFuel.xcodeproj -scheme JuiceFuel -destination 'platform=iOS Simulator,name=iPhone 16' -configuration Debug build | xcbeautify
xcodebuild -project JuiceFuel.xcodeproj -scheme JuiceFuel -destination 'id=00008140-000649923C32801C' -configuration Debug -allowProvisioningUpdates -allowProvisioningDeviceRegistration build | xcbeautify
```

After starting Phase 3:

```bash
xcodebuild -project JuiceFuel.xcodeproj -scheme JuiceFuel -destination 'platform=iOS Simulator,name=iPhone 16' -configuration Debug build | xcbeautify
/Applications/Codex.app/Contents/Resources/node node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

After starting Phase 4:

```bash
make gen
xcodebuild -project JuiceFuel.xcodeproj -scheme JuiceFuel -destination 'platform=iOS Simulator,name=iPhone 16' -configuration Debug build | xcbeautify
/Applications/Codex.app/Contents/Resources/node node_modules/vue-tsc/bin/vue-tsc.js --noEmit
git diff --check
```

From `/Users/alainiselin/Programming/juicefuel`:

```bash
/Applications/Codex.app/Contents/Resources/node node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

All passed after the latest Phase 2 change. The updated app was installed on the iPhone. Command-line launch may fail if the phone is locked; manual launch works after install.

## Known Caveats

- The backend meal-plan create/update/delete endpoints are still less consistently permission-checked than the read/apply/generate paths. `households/meal-plan.post.ts` was fixed, but `meal-plan/index.post.ts`, `meal-plan/[id].patch.ts`, and `meal-plan/[id].delete.ts` should be reviewed for membership authorization.
- `MealPlanGeneratorSheet` currently uses a simplified subset of the web generator filters. It does not yet expose protein filters, effort, library selection, back-to-back cuisine/protein toggles.
- `AddMealSheet` lists all recipes and has no search field yet.
- iOS shopping does not yet create a shopping list from the planner/generate endpoint; it creates manual lists and manages items.
- iOS recipes are still the next largest gap after the initial edit/delete slice.
- Phase 3 recipes are functionally complete against the requested scope. Remaining recipe work is polish/deeper admin.
- Phase 4 household/profile is functionally complete against the requested scope. Deeper account diagnostics and no-household onboarding belong to Phase 5 polish.

## Recommended Next Phase

Continue with Phase 5 polish/parity pass.

Suggested order:

1. Continue improving empty/loading/error states across secondary sheets and detail screens.
2. Add clearer account/session diagnostics and no-household recovery.
3. Add App Store Connect metadata/screenshots.
4. Decide whether Universal Links are needed before external testing.
5. Run physical-device smoke test before TestFlight upload.

Relevant files:

- `ios/JuiceFuel/Models/Recipe.swift`
- `ios/JuiceFuel/Views/Recipes/RecipesListView.swift`
- `ios/JuiceFuel/Views/Recipes/AddRecipeSheet.swift`
- `ios/JuiceFuel/Views/Recipes/RecipeDetailView.swift`
- `server/api/recipes/*`
- `server/api/recipe-libraries/*`
- `server/api/tags/*`
- `server/api/ingredients/*`
- `server/api/user/favorites.*`

## Git Status At Time Of Writing

Modified files expected from Phase 1 and Phase 2:

- `ios/JuiceFuel/Models/MealPlan.swift`
- `ios/JuiceFuel/Models/ShoppingList.swift`
- `ios/JuiceFuel/Views/Planner/AddMealSheet.swift`
- `ios/JuiceFuel/Views/Planner/PlannerView.swift`
- `ios/JuiceFuel/Views/Shopping/ShoppingListView.swift`
- `ios/JuiceFuel/Views/Recipes/AddRecipeSheet.swift`
- `ios/JuiceFuel/Views/Recipes/RecipeDetailView.swift`
- `ios/JuiceFuel/Views/Recipes/RecipesListView.swift`
- `ios/JuiceFuel/Views/Profile/ProfileView.swift`
- `ios/JuiceFuel/Models/Recipe.swift`
- `ios/JuiceFuel/Models/MealPlan.swift`
- `ios/project.yml`
- `server/api/recipes/index.post.ts`
- `server/api/recipes/[id].get.ts`
- `server/api/recipes/[id].patch.ts`
- `server/api/recipes/[id].delete.ts`
- `server/api/recipes/[id]/ingredients/index.post.ts`
- `server/api/recipes/[id]/ingredients/[recipeIngredientId].patch.ts`
- `server/api/user/favorites.post.ts`
- `server/api/households/invite.post.ts`
- `server/api/households/join.post.ts`
- `server/api/households/[id].delete.ts`
- `server/api/households/[id]/members/[userId].patch.ts`
- `server/api/households/[id]/members/[userId].delete.ts`
- `server/repos/recipeRepo.ts`
- `server/services/recipeService.ts`
- `spec/schemas.ts`
- `server/api/households/meal-plan.post.ts`
- `server/api/shopping-list/[id].patch.ts`
- `server/repos/shoppingListRepo.ts`

Untracked files observed but not touched:

- `local_backup.sql`
- `public_data_only.cleaned.sql`
- `public_data_only.sql`
- `screenshots/`

Do not remove or stage those untracked files unless the user explicitly asks.

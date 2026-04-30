---
title: iOS Parity Roadmap
category: guide
status: draft
---

# iOS Parity Roadmap

This document tracks the native iOS parity push against the web app. It is the permanent roadmap. The temporary continuity note lives in [`../HANDOVER_TEMP.md`](../HANDOVER_TEMP.md) and can be deleted once the current work is merged, shipped, or summarized elsewhere.

## Current state

The native app runs on a physical iPhone with automatic signing for bundle ID `vip.juicecrew.juicefuel`. It talks to the deployed JuiceFuel API and now covers the core shopping and planning flows.

## Completed phases

### Phase 1: Shopping parity foundation

Delivered:

- Create and finish shopping lists on iOS.
- Add existing ingredients and existing articles through the shopping search endpoint.
- Create custom articles directly from the native add-item sheet.
- Edit quantity, unit, and notes.
- Check, uncheck, and delete items.
- Correctly render article-backed and ingredient-backed items from the backend response.

Remaining:

- Generate a shopping list from the meal plan from inside iOS.
- Merge and conflict handling for shared household edits.
- Offline-first shopping mode.

### Phase 2: Planner parity foundation

Delivered:

- Load the active household from `/api/households/me`.
- Create the household meal plan from iOS if it does not exist yet.
- Add, edit, and remove planned meal slots.
- Generate meal suggestions from iOS.
- Preview generated slots and apply them to the meal plan.
- Preserve backend membership checks when creating meal plans.

Remaining:

- Match the full web advanced-generator controls.
- Improve generated-plan review with richer recipe metadata.
- Add drag/drop or faster date navigation if the native planner becomes a primary planning surface.

## Recommended next phases

### Phase 3: Recipes

Goal: make iOS good enough to manage the recipe library, not only browse it.

Delivered:

- Edit recipe title, description, servings, prep time, instructions, and source URL.
- Delete recipes from the native recipe detail screen.
- Add, edit, and delete recipe ingredients from the native recipe detail screen.
- Favorite and unfavorite recipes from the native recipe detail screen.
- Add and remove recipe tags from the native recipe detail screen.
- Pick a recipe library when creating a recipe.
- Create a new recipe library from iOS.
- Generate an AI recipe draft from iOS.
- Preview and save the AI draft into a selected recipe library.
- Require authenticated household-library access for recipe create/read/update/delete endpoints used by iOS.
- Accept `null` optional recipe create fields from iOS and return ingredient names consistently from ingredient mutation endpoints.
- Verify recipe access before creating a favorite.

Remaining polish:

- Rename/archive/delete recipe libraries.
- Add richer AI constraints on mobile.
- Add recipe images/import flows if needed.

### Phase 4: Household and profile

Goal: close the account-management gap.

Delivered:

- Household switcher.
- Household owner rename.
- Invite generation and native share.
- Join household by invite code.
- Active household member list.
- Profile editing.
- Member role management/removal.
- Leave household / delete household flows.

Remaining polish:

- Clear account/session diagnostics for mobile testing.
- Better first-run/no-household recovery flow.

### Phase 5: Release readiness

Goal: make the native app distributable beyond local device installs.

Started:

- Real app icon and launch polish.
- Shared JuiceFuel brand color/mark for native screens.
- Branded loading states for the main tabs.
- TestFlight readiness checklist.

Remaining:

- TestFlight archive/upload path.
- App Store Connect metadata and screenshots.
- Universal links if Google/auth or shared links need to feel native.
- Smoke-test checklist for physical devices.

## Verification baseline

Recent verification before this roadmap update:

```bash
cd ios
make gen
xcodebuild -project JuiceFuel.xcodeproj -scheme JuiceFuel -destination 'platform=iOS Simulator,name=iPhone 16' -configuration Debug build
xcodebuild -project JuiceFuel.xcodeproj -scheme JuiceFuel -destination 'id=00008140-000649923C32801C' -configuration Debug -allowProvisioningUpdates -allowProvisioningDeviceRegistration build
```

Also verified:

```bash
/Applications/Codex.app/Contents/Resources/node node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

Use the bundled Codex Node binary on this machine because `npm` is not currently on the shell PATH.

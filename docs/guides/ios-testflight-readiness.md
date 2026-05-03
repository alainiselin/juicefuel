---
title: iOS TestFlight Readiness
category: guide
status: draft
---

# iOS TestFlight Readiness

This checklist tracks what JuiceFuel needs before sharing the native iOS app through TestFlight.

## Current status

- Bundle ID: `vip.juicecrew.juicefuel`
- Signing team: `5P58Q2KW74`
- Device builds work from the current macOS 15.2 / Xcode 16.3 machine.
- App icon and accent color exist in the asset catalog.
- Core native parity phases are functionally covered:
  - shopping,
  - planner,
  - recipes,
  - household/profile.
- Recipe creation supports manual creation, AI prompt generation, and URL import.
- A shared keyboard Done toolbar is present for text and number entry.

## Build path

Direct development on the current work Mac:

```bash
cd ios
make gen
xcodebuild -project JuiceFuel.xcodeproj -scheme JuiceFuel -destination 'platform=iOS Simulator,name=iPhone 16' -configuration Debug build
```

For TestFlight, create an archive with Apple Distribution signing and upload it through Xcode Organizer or Transporter. If Apple requires a newer Xcode than macOS 15.2 can run, use a separate newer Mac or CI runner only for archive/upload.

## Required before first TestFlight upload

- Confirm the App Store Connect app record for `vip.juicecrew.juicefuel`.
- Confirm Sign in with Apple capability is enabled for the App ID.
- Confirm Google OAuth redirect flow still returns to `juicefuel://auth/callback`.
- Archive a Release build and upload it.
- Add TestFlight build notes that call out this is an early household test build.

## App Review and tester metadata

- App name: JuiceFuel
- Category: Food & Drink or Lifestyle
- Short description: meal planning, recipes, and shopping lists for a household.
- Test account: create a dedicated tester account with a seeded household, recipes, planner entries, and shopping list.
- Contact: use the project owner email in App Store Connect.

## Screenshot checklist

Capture on a modern iPhone simulator or physical device:

- Recipes list and recipe detail.
- AI recipe generation and URL import preview.
- Planner weekly view.
- Shopping list with aisle groups.
- Me tab with household members.

Keep screenshots under 2000 px if they are meant to be uploaded into Codex conversations. App Store Connect screenshots have their own required dimensions.

## Smoke test

Run this before each TestFlight candidate:

1. Sign in with email/password.
2. Sign in with Apple.
3. Continue with Google.
4. Create and finish a shopping list.
5. Add an ingredient item and a custom article.
6. Create or load a meal plan.
7. Add, edit, remove, generate, and apply meals.
8. Create, edit, favorite, tag, and delete a recipe.
9. Generate an AI recipe and save it.
10. Import a recipe from a public URL and save it to an own-household library.
11. Switch households, generate an invite, join via code, edit profile, and sign out.

## Remaining polish

- Improve no-household recovery and account diagnostics.
- Add more custom visual treatment to rows/cards beyond default SwiftUI lists.
- Decide whether to add Universal Links before external testing.
- Add push/offline behavior only after real tester feedback proves it is needed.

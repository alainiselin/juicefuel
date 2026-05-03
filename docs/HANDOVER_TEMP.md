---
title: Current Handover
category: guide
status: temporary
---

# Current Handover

This file is a short continuity note for the next Codex session. Permanent details live in the domain and guide docs linked below.

## Current State

- Branch: `main`
- Remote: `origin/main`
- Latest pushed commit at cleanup time: `227cadc` (`fix(recipes): accept imported drafts on save`)
- Production deploy: `dpl_HEvBLjSzTBe8v6CLFV3ERCpkSwXp`
- Live URL: `https://juicefuel.juicecrew.vip`
- Worktree state at cleanup time: clean
- Local branch state at cleanup time: only `main`, aligned with `origin/main`
- Worktrees at cleanup time: only `/Users/alainiselin/Programming/juicefuel`

## Recently Completed

- Web routing fixes for `/` and `/plan`.
- Web performance improvements for Plan/Recipes/Shopping route switching via cached state and silent refresh patterns.
- iOS planner fixes:
  - Add-meal recipe search/tag search restored.
  - Existing planned meal recipe navigation fixed.
- iOS shopping edit sheet now exposes list and aisle/category movement context.
- Recipe URL import added for web and iOS:
  - `POST /api/recipes/generate/from-url`
  - HTML extraction from JSON-LD, microdata, and selected server-rendered recipe markup
  - AI normalization into the same `RecipeDraft` shape as normal AI generation
  - Shared save path through `POST /api/recipes/generate/save`
- iOS recipe save/import polish:
  - writable own-household libraries only in save pickers
  - keyboard Done toolbar
  - keyboard dismissal before import/generate/save
  - 60-second API request timeout
- Save endpoint hardened for imported drafts:
  - tolerant nullable ingredient amount/unit/note parsing
  - optional tag buckets
  - clearer validation messages

## Verification From Recent Work

Passed:

```bash
npm run build
npm run test -- --run server/services/recipeUrlImporter.test.ts
xcodebuild -project ios/JuiceFuel.xcodeproj -scheme JuiceFuel -configuration Debug -destination 'generic/platform=iOS Simulator' build
curl -sS https://juicefuel.juicecrew.vip/api/health
```

Known non-green command:

```bash
npm run typecheck
```

It currently fails on existing unrelated repo-wide type debt. The failures are documented in recent terminal history and are not introduced by the URL import/save patch.

## Important Notes

- The iOS project is generated from `ios/project.yml`; `ios/JuiceFuel.xcodeproj/` is intentionally ignored.
- If a new Swift file is added, run `make -C ios gen` or let XcodeGen regenerate the project before relying on Xcode UI state.
- Native iOS talks directly to production API `https://juicefuel.juicecrew.vip`.
- Public recipe libraries are read-only for other households. Save/create flows must use `is_own_household == true`.
- URL import depends on `OPENAI_API_KEY`; `OPENAI_MODEL` is optional and currently defaults to `gpt-4.1-mini-2025-04-14`.

## Useful Docs

- [AI Recipe Generation](./domains/recipes/ai-generation.md)
- [Recipe Library System](./domains/recipes/recipe-library-system.md)
- [Public vs Private Libraries](./concepts/public-private-libraries.md)
- [iOS Development](./guides/ios-development.md)
- [iOS Parity Roadmap](./guides/ios-parity-roadmap.md)
- [iOS TestFlight Readiness](./guides/ios-testflight-readiness.md)
- [Deployment](./guides/deployment.md)

## Suggested Next Session

1. Continue real-world testing of recipe URL import/save on both iOS and web.
2. If failures appear, use the improved save validation message to identify the exact rejected field.
3. Decide whether to add recipe image import.
4. Decide whether to clean the repo-wide `npm run typecheck` debt before TestFlight.

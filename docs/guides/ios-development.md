---
title: iOS Development
category: guide
status: stable
---

# iOS Development

The native iOS app lives at [`/ios`](../../ios/). It's a SwiftUI app that talks to the deployed `https://juicefuel.juicecrew.vip` API via Bearer tokens.

## Layout

```
ios/
├── project.yml          # xcodegen spec → generates JuiceFuel.xcodeproj
├── Makefile             # CLI workflow tasks
├── JuiceFuel/
│   ├── Info.plist                  # generated from project.yml info: block
│   ├── JuiceFuel.entitlements      # Sign in with Apple capability
│   ├── JuiceFuelApp.swift          # @main App
│   ├── ContentView.swift           # routes between LoginView and AppTabView
│   ├── Models/                     # JSON-decoded server types
│   ├── Services/                   # APIClient, AuthService, GoogleSignInService, KeychainStore
│   └── Views/                      # LoginView, AppTabView, Recipes/, Planner/, Shopping/
└── .gitignore           # JuiceFuel.xcodeproj/ is gitignored — regenerate with `make gen`
```

The `.xcodeproj` is **not** checked in. Every contributor regenerates it from `project.yml`. This avoids merge hell on the binary `.pbxproj` XML.

## Prerequisites

- macOS with Xcode 16.x (Xcode 16.3 confirmed)
- Homebrew tools: `brew install xcodegen xcbeautify`
- Node.js (for the server), already required by the rest of the repo

## CLI workflow

All daily tasks run from `ios/` via `make`:

```bash
make -C ios gen       # regenerate JuiceFuel.xcodeproj
make -C ios build     # xcodebuild | xcbeautify (iPhone 16 simulator, Debug)
make -C ios test      # xcodebuild test
make -C ios run       # build, boot simulator, install, launch
make -C ios open      # open project.xcodeproj in Xcode
make -C ios clean     # rm generated project + DerivedData

# override the simulator device:
make -C ios run SIM="iPhone 16 Pro Max"
```

The first time you `make run`, Simulator.app needs ~10s to boot; afterwards launches are quick.

## Tooling

| Tool | Purpose | Why this one |
|---|---|---|
| **xcodegen** | Generates `.xcodeproj` from `project.yml` | The `.pbxproj` is unmergeable XML; xcodegen makes the project diffable in git and reproducible |
| **xcbeautify** | Pretty-prints `xcodebuild` output | Raw `xcodebuild` is unreadable; xcbeautify makes errors stand out |

Things deliberately **not** in the toolchain (yet):

- **fastlane** — heavy Ruby dep; add when shipping to TestFlight
- **swiftlint / swiftformat** — Xcode's built-in formatter (Cmd-A, Ctrl-I) is enough for now
- **GoogleSignIn-iOS** — we drive Google sign-in via `ASWebAuthenticationSession` + the existing web OAuth flow, no SDK needed

## Architecture

```
ContentView (auth gate)
├── LoginView                 ← shown when not signed in
│   ├── email/password form
│   ├── SignInWithAppleButton
│   └── Continue with Google  → ASWebAuthenticationSession
│
└── AppTabView                ← shown when signed in
    ├── RecipesListView ─→ RecipeDetailView
    ├── PlannerView ─→ AddMealSheet, swipe-to-delete
    ├── ShoppingListView ─→ ShoppingListDetailView (optimistic checkmarks)
    └── Profile (sign out)
```

State is held in `AuthService` (`@Observable @MainActor`, single shared instance). The Bearer token lives in the iOS Keychain; on app launch `restoreSession()` tries to fetch `/api/profile` to validate that the stored token is still good.

### `APIClient`

Single file, ~120 lines, no dependencies. Everything is async/await + URLSession. Features:

- Reads Bearer token from `KeychainStore` and adds the `Authorization` header automatically
- `JSONEncoder.api` / `JSONDecoder.api` use ISO-8601 dates
- Per-model `CodingKeys` map snake_case → camelCase
- Throws `APIError` with the original status + body for visible failures

### Auth flows on iOS

| Method | iOS code | Server endpoint |
|---|---|---|
| Email / password | `AuthService.login` / `signup` | `POST /api/auth/{login,signup}` returns `{user, token}` |
| Sign in with Apple | `AuthService.signInWithApple` (handles `ASAuthorization`) | `POST /api/auth/apple` (validates JWT against Apple JWKS) |
| Continue with Google | `GoogleSignInService.signIn` | `GET /api/auth/google?return_to=ios` → callback redirects to `juicefuel://auth/callback?token=…` |

See [Authentication overview](../domains/authentication/auth-system-overview.md) for the full picture.

## Bundle ID, signing, capabilities

- **Bundle ID:** `vip.juicecrew.juicefuel`
- **`APPLE_BUNDLE_ID` env on Vercel** must match — the Apple Sign In endpoint uses it as the JWT audience
- **Signing & Capabilities:** open the project in Xcode (`make open`) and pick your Apple Developer team in the dropdown. Xcode auto-creates the App ID with Sign in with Apple enabled. This is required for device installs and for SIWA to round-trip on a real device.

The entitlements file at `JuiceFuel/JuiceFuel.entitlements` requests `com.apple.developer.applesignin = ['Default']`.

## URL scheme

`juicefuel://auth/callback` is registered in `Info.plist` (generated from `project.yml`). It's only used by the Google-via-ASWebAuthenticationSession flow — the iOS app doesn't expose any other deep links right now.

## Adding a new screen

1. Create a `.swift` file under `ios/JuiceFuel/Views/<Domain>/`. xcodegen picks it up automatically (the target's `sources` block scans the whole `JuiceFuel/` directory).
2. `make -C ios gen` to regenerate the project.
3. `make -C ios build` to verify it compiles.
4. Add it to a `TabView` tab in `AppTabView.swift` or as a `NavigationLink` destination in an existing screen.

For new model types, decode the server JSON shape:

```swift
struct Recipe: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    // ...

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case mySnakeField = "my_snake_field"
    }
}
```

Then call:

```swift
let recipes: [Recipe] = try await APIClient.shared.send("GET", path: "/api/recipes")
```

## Known limits / future work

- **Build target is x86_64 by default.** On Apple Silicon this means Rosetta — slower than native arm64. Adding `ARCHS: arm64` (or removing the implicit setting) in `project.yml` would speed builds.
- **No Universal Links yet.** Switching from `juicefuel://` to a verified `https://juicefuel.juicecrew.vip/...` deep link would require associated-domains setup (browser config + an `apple-app-site-association` JSON served from the domain).
- **No real app icon.** `Assets.xcassets/AppIcon.appiconset/` is intentionally empty — drop a 1024×1024 PNG in to fix.
- **No push notifications.** Would require an APNs auth key in Apple Developer portal + server-side scheduling.
- **No offline cache.** Every screen refetches from the server on appear. Fine for an MVP; a later iteration could add persistent caching.

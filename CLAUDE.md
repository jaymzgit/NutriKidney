# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Behavioral guidelines

Bias toward caution over speed. Use judgment on trivial tasks.

### Think before coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity first

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Surgical changes

Touch only what you must. Clean up only your own mess.

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that YOUR changes made unused. Don't remove pre-existing dead code unless asked.

Test: every changed line should trace directly to the user's request.

### Goal-driven execution

Define success criteria. Loop until verified.

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Repo layout

Two apps in one repo:

- **Mobile** (root) — Expo SDK 54 + expo-router + React Native 0.81 + NativeWind 4 + TypeScript. New Architecture enabled. Path alias `@/*` resolves from repo root.
- **Backend** (`backend/`) — FastAPI service; routers under `backend/routers/` mounted at `/auth`, `/food`, `/logs`, `/ocr`. Static food data expected at `backend/data/food_db.json` (loaded at import time by `routers/food.py` — missing file crashes startup).

## Mobile commands

```
npm install                    # install JS deps
npx expo start -c              # start Metro, clear cache (use after dep changes)
npx expo start --tunnel        # for physical-device testing off-LAN
npx expo install <pkg>         # prefer over `npm install` for native modules — picks SDK-compatible version
```

No test runner, linter, or formatter configured. Don't invent commands.

## Backend commands

```
cd backend
python -m venv venv && venv\Scripts\activate    # PowerShell
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

`backend/venv/` and `backend/__pycache__/` are blocked from Metro's resolver in `metro.config.js`; don't move venv elsewhere without updating that block list.

## Environment

`.env` at repo root, loaded by Expo at start. Required:

- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase client (`lib/supabase.ts`).
- `EXPO_PUBLIC_API_URL` — backend base URL used by `lib/api.ts` (defaults to `http://localhost:8000`).

Backend reads `SUPABASE_URL` / `SUPABASE_KEY` (service key, **not** the anon key) from its own env via `python-dotenv`.

## Architecture

### Auth flow

Supabase is the auth source of truth. Backend does **not** issue tokens.

- `lib/AuthContext.tsx` — `AuthProvider` wraps the app in `app/_layout.tsx`. Subscribes to `supabase.auth.onAuthStateChange` and toggles `supabase.auth.startAutoRefresh/stopAutoRefresh` on `AppState` foreground/background.
- `app/_layout.tsx` `AuthGate` — route guard. Redirects unauth'd users to `/(auth)/login`, auth'd users out of `(auth)` to `/(tabs)`.
- Google OAuth uses `expo-web-browser` + `expo-linking` deep link (`nutrikidney://auth-callback`), then `supabase.auth.setSession` from the returned fragment params.
- `lib/api.ts` `apiFetch` attaches the current Supabase access token as `Authorization: Bearer …` to every backend call. New endpoints that need auth should validate this JWT against the Supabase JWKS — `routers/auth.py` is currently a stub.

### Routing

expo-router file-based routing with **typed routes** enabled (`app.json`). Two route groups:

- `(auth)/` — login, register, forgot/reset password
- `(tabs)/` — index (dashboard), scan, history, lab-reports, chat, profile

Group folders don't appear in URLs; `AuthGate` checks `segments[0]` to know which side a user is on.

### Styling

NativeWind 4 with `jsxImportSource: "nativewind"` (set in `babel.config.js`). `global.css` imported at top of `app/_layout.tsx`. Custom theme tokens (primary `#1A7A55`, semantic foreground/card/destructive/etc.) live in `tailwind.config.js` — use `className="bg-primary"` not hardcoded hex.

### Backend data model

- `food/lookup` and `food/parse` are **stateless** — they only read the in-memory `FOOD_DB` (JSON file loaded once). Nutrient scaling via `scale_food` is linear from the DB portion.
- `food/parse` uses a regex ladder (`PORTION_PATTERNS`) for portion units (plate/bowl/cup/piece/etc.) → grams, then `SequenceMatcher` fuzzy match on name+aliases (threshold 0.4). Unknown foods return with zero nutrients and `confidence=0.1`.
- `logs/meals` writes to Supabase tables `meal_logs` (parent) + `meal_items` (children) using the service-role client. Currently trusts `user_id` from the request body — when wiring auth, derive it from the verified JWT instead.
- `ocr/extract` is a Phase-3 placeholder; only validates content-type and returns empty results.

## Gotchas

- Reanimated 4 requires `react-native-worklets` as a separate package (already in deps). If a bundle error says `Cannot find module 'react-native-worklets/plugin'`, run `npx expo install react-native-worklets` and restart Metro with `-c`.
- After native dep changes, always restart with `npx expo start -c` — Metro caches Babel output aggressively.
- CORS in `backend/main.py` is wide open (`allow_origins=["*"]`) — fine for dev, must be tightened before deploy.
- `tsconfig.json` intentionally omits `baseUrl` (deprecated in TS 7); `paths` resolve relative to the tsconfig directory.

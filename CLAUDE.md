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
- **Backend** (`backend/`) — FastAPI service; routers under `backend/routers/` mounted at `/auth`, `/food`, `/logs`, `/ocr`, `/scan`. Static food data at `backend/data/food_db.json` (loaded at import time by `routers/food.py` — missing file crashes startup).

### Dependencies

#### Mobile (npm)

| Package | Version | Purpose |
|---------|---------|---------|
| expo | ~54.0.33 | Expo SDK — managed native workflow |
| react | 19.1.0 | UI framework |
| react-native | 0.81.5 | Mobile runtime (New Architecture enabled) |
| expo-router | ~6.0.24 | File-based routing with typed routes |
| nativewind | ^4.2.4 | Tailwind CSS for React Native |
| tailwindcss | ^3.4.19 | Utility-first CSS (used by NativeWind) |
| @supabase/supabase-js | ^2.107.0 | Supabase client (auth + DB) |
| react-native-fast-tflite | ^3.0.1 | On-device TFLite model inference (YOLO26) |
| jpeg-js | ^0.4.4 | Pure-JS JPEG decode for model preprocessing |
| expo-camera | ~17.0.10 | Camera access for food scanning |
| expo-image-picker | ~17.0.11 | Photo gallery access |
| expo-image-manipulator | ~14.0.8 | Image resize for model input (640×640) |
| expo-web-browser | ~15.0.11 | Google OAuth redirect |
| expo-linking | ~8.0.12 | Deep link handling (nutrikidney://auth-callback) |
| expo-auth-session | ~7.0.11 | OAuth session management |
| expo-dev-client | ~6.0.21 | Custom dev client (required for native modules) |
| expo-system-ui | ~6.0.9 | System UI style configuration |
| react-native-reanimated | ~4.1.1 | Animations |
| react-native-worklets | 0.5.1 | Required by Reanimated 4 |
| react-native-gesture-handler | ~2.28.0 | Touch gesture system |
| react-native-screens | ~4.16.0 | Native screen containers |
| react-native-safe-area-context | ~5.6.0 | Safe area insets |
| react-native-svg | 15.12.1 | SVG rendering (charts, icons) |
| react-native-url-polyfill | ^3.0.0 | URL polyfill for Supabase |
| @react-native-async-storage/async-storage | 2.2.0 | Persistent storage (auth tokens) |
| lucide-react-native | ^1.17.0 | Icon library |
| expo-constants | ~18.0.13 | App constants |
| expo-status-bar | ~3.0.9 | Status bar styling |
| expo-crypto | ~15.0.9 | Crypto utilities |

**Dev dependencies**: TypeScript ~5.9.2, @types/react ~19.1.0

#### Backend (pip)

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | >=0.115.0 | Web framework |
| uvicorn | >=0.32.0 | ASGI server |
| python-dotenv | >=1.0.0 | .env file loading |
| supabase | >=2.10.0 | Supabase Python client (service role) |
| pydantic | >=2.0.0 | Request/response validation |
| python-multipart | >=0.0.9 | File upload handling |
| PyJWT[crypto] | >=2.8.0 | JWT decode + RS256 verification |
| httpx | >=0.27.0 | HTTP client (fetch Supabase JWKS) |
| inference-sdk | >=1.3.0 | Roboflow inference API client |

#### Build tools

| Tool | Version | Purpose |
|------|---------|---------|
| eas-cli | 20.3.0 | Expo Application Services (cloud builds) |
| Node.js | 24.x | JavaScript runtime |
| Python | 3.8+ | Backend runtime |

### Directory overview

```
app/                          # Expo Router screens (file-based routing)
  _layout.tsx                 # Root navigator + AuthGate (redirects based on auth state)
  alerts.tsx                  # Nutrient alerts full page (exceeded limits + swap suggestions)
  (auth)/                     # Unauthenticated screens
    _layout.tsx               # Stack navigator, headerShown: false
    login.tsx                 # Email/password + Google OAuth
    register.tsx              # 4-step registration (account → about → health → lifestyle)
    forgot-password.tsx       # Password reset request
    reset-password.tsx        # New password entry (from email link)
  (tabs)/                     # Main app (authenticated)
    _layout.tsx               # Bottom tab navigator (5 visible + 1 hidden)
    index.tsx                 # Dashboard — calorie gauge, nutrient progress bars, today's meals
    scan.tsx                  # Meal logging — Scan (camera + YOLO) and Manual (search) modes
    history.tsx               # Meal history grouped by date, daily totals, expandable cards
    lab-reports.tsx            # Lab report upload (Phase 3 placeholder)
    chat.tsx                  # CKD AI assistant (placeholder, disabled)
    profile.tsx               # User profile, CKD stage, health flags, weight chart

lib/                          # Shared utilities (imported via @/lib/*)
  AuthContext.tsx              # AuthProvider + useAuth() — Supabase session, OAuth, profile
  api.ts                      # REST client (api.get/post/put/del) — auto-injects Bearer token
  supabase.ts                 # Supabase client instance (AsyncStorage persistence)
  yolo.ts                     # On-device YOLO26 TFLite inference pipeline
  foodDb.ts                   # Local food database — fuzzy matching + nutrient scaling
  ckdLimits.ts                # CKD nutrient limits engine (KDOQI guidelines)
  useMeals.ts                 # Hook: fetches /logs/meals, returns { meals, loading, refetch }
  useNutrientAlerts.ts        # Hook: compares daily totals to CKD limits, returns alerts
  riskEngine.js               # getRiskLevel() — safe/caution/danger based on % of limits
  dummyData.ts                # Test meal data (50+ dummy meals for UI development)

components/                   # Reusable UI components
  AuthLayout.tsx              # Auth screen template (icon, title, form area, footer)
  Button.tsx                  # Variants: primary/outline/ghost/destructive-outline
  TextField.tsx               # Label + icon + optional right slot text input
  ScrollPicker.tsx            # Numeric picker — tap-to-unlock, snap scroll to select
  NutrientProgressBar.tsx     # Color-coded progress bar per nutrient (K/P/Na/protein)
  NutrientAlert.tsx           # Red alert card (excess amount, offending food, swap suggestion)
  MealCard.tsx                # Compact meal summary (time, method icon, items, risk badge)
  MealHistoryItem.tsx         # Expandable meal row (toggles nutrient bars + food table)
  NumberStepper.tsx            # +/− increment with long-press repeat (weight entry)
  GoogleIcon.tsx              # Google brand SVG logo

backend/                      # FastAPI service
  main.py                     # App entry — CORS, router includes
  routers/
    auth.py                   # JWT validation via Supabase JWKS (get_current_user dependency)
    food.py                   # POST /food/lookup, /food/parse — fuzzy match + portion parsing
    logs.py                   # POST/GET/DELETE /logs/meals — Supabase meal_logs + meal_items
    scan.py                   # POST /scan/detect — Roboflow API fallback for image detection
    ocr.py                    # POST /ocr/extract — Phase 3 placeholder
  data/
    food_db.json              # Malaysian food database (50+ entries with CKD-relevant nutrients)

assets/
  models/
    food_detect.tflite        # YOLO26-Nano TFLite model (on-device food detection)

types/
  jpeg-js.d.ts                # Type stubs for jpeg-js decode()

Config files:
  app.json                    # Expo config — plugins: camera, image-picker, fast-tflite, router
  eas.json                    # EAS Build profiles (development, preview, production)
  metro.config.js             # Block backend/venv from bundler, add .tflite to assetExts
  tailwind.config.js          # Theme tokens (primary #1A7A55, CKD-specific colors)
  babel.config.js             # NativeWind JSX transform
  tsconfig.json               # Strict mode, @/* path alias, typed routes
  global.css                  # Tailwind directives (@tailwind base/components/utilities)
```

## Mobile commands

```
npm install                    # install JS deps
npx expo start -c              # start Metro, clear cache (use after dep changes)
npx expo start --tunnel        # for physical-device testing off-LAN
npx expo install <pkg>         # prefer over `npm install` for native modules — picks SDK-compatible version
npx expo prebuild              # generate native android/ios projects (required for TFLite)
npx expo run:android           # local APK build + install (requires Android SDK locally)
```

No test runner, linter, or formatter configured. Don't invent commands.

## Building the APK (EAS Build)

The app uses native modules (`react-native-fast-tflite`) that cannot run in Expo Go. Must build a custom dev client or preview APK via EAS Build (Expo's cloud build service). No local Android SDK required — builds happen on Expo's servers.

### Setup (one-time)

```bash
npm install -g eas-cli          # install EAS CLI globally
eas login                       # authenticate with Expo account (opens browser)
eas build:configure             # creates eas.json + links project to EAS
```

This generates `eas.json` with three build profiles:
- **development** — debug build with dev client (for development with Metro)
- **preview** — release build distributed internally (for testing on real devices)
- **production** — release build for Play Store submission

### Building a preview APK

```bash
npx expo prebuild               # generate native android/ directory from app.json plugins
eas build --platform android --profile preview
```

What happens:
1. `expo prebuild` generates the native Android project from `app.json` config (plugins like camera, image-picker, fast-tflite get wired into native code)
2. EAS compresses and uploads the project (~153 MB) to Expo's build servers
3. Cloud builds the APK (handles Android SDK, Gradle, keystore generation)
4. Build link appears in terminal + at https://expo.dev — download the `.apk` from there
5. Install on Android device: transfer APK and open, or use `adb install <path>.apk`

First build generates an Android Keystore automatically (stored on EAS servers). Subsequent builds reuse it.

### Build profiles explained (`eas.json`)

| Profile | `distribution` | Purpose |
|---------|----------------|---------|
| `development` | `internal` | Dev client with Metro connection. For active development. |
| `preview` | `internal` | Standalone APK for testing. No Metro needed. |
| `production` | Play Store | Signed AAB for Google Play submission. Auto-increments `versionCode`. |

### Common commands

```bash
eas build --platform android --profile preview    # build installable APK
eas build --platform android --profile development # build dev client
eas build:list                                     # check build status/history
eas submit --platform android                      # submit to Play Store (production)
```

### When to rebuild

Rebuild needed when:
- Adding/removing native modules (e.g., `npx expo install <native-package>`)
- Changing `app.json` plugins
- Updating the TFLite model file (`assets/models/food_detect.tflite`)
- Changing `eas.json` build configuration

**Not** needed for JS-only changes — those hot-reload via Metro during development.

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
- `lib/api.ts` `apiFetch` attaches the current Supabase access token as `Authorization: Bearer …` to every backend call.
- `routers/auth.py` `get_current_user` dependency validates JWT against Supabase JWKS (RS256). Used by `logs.py` on all endpoints — `user_id` derived from token, not request body.

### Routing

expo-router file-based routing with **typed routes** enabled (`app.json`). Two route groups:

- `(auth)/` — login, register, forgot/reset password
- `(tabs)/` — index (dashboard), scan, history, lab-reports, chat, profile

Group folders don't appear in URLs; `AuthGate` checks `segments[0]` to know which side a user is on.

Tab navigator has 5 visible tabs (Home, History, Log Meal, Chat, Profile) + 1 hidden (Lab Reports). Center "Log Meal" tab uses a custom `CenterTabButton` with elevated styling.

### Styling

NativeWind 4 with `jsxImportSource: "nativewind"` (set in `babel.config.js`). `global.css` imported at top of `app/_layout.tsx`. Custom theme tokens (primary `#1A7A55`, semantic foreground/card/destructive/etc.) live in `tailwind.config.js` — use `className="bg-primary"` not hardcoded hex.

### On-device food detection (scan flow)

End-to-end: Camera → YOLO26 → Food DB match → Portion estimation → Review → Supabase.

1. **Model loading** (`lib/yolo.ts`): `loadModel()` lazy-loads `assets/models/food_detect.tflite` via `react-native-fast-tflite`. Called once on scan screen mount. Requires custom dev client (APK), not Expo Go.

2. **Image capture** (`app/(tabs)/scan.tsx`): CameraView or ImagePicker captures photo. URI passed to `detectFood()`.

3. **Preprocessing** (`lib/yolo.ts` → `preprocessImage`): Resize to 640×640 via expo-image-manipulator → fetch URI as ArrayBuffer → decode JPEG via `jpeg-js` → convert to NCHW Float32Array normalized [0,1].

4. **Inference** (`lib/yolo.ts` → `detectFood`): Runs TFLite model synchronously via `model.runSync()`. Output tensor shape: `[1, 4+numClasses, numDetections]` (Ultralytics convention — no objectness score, class scores are direct confidences).

5. **Post-processing** (`lib/yolo.ts` → `postProcess`): Iterates detections, finds max class score per anchor, applies confidence threshold (0.25), maps coordinates from 640×640 model space to original image dimensions, runs Non-Maximum Suppression (IoU threshold 0.45). `CLASS_NAMES` array (15 Malaysian foods, alphabetical) must match model's training class order.

6. **Food DB cross-reference** (`lib/foodDb.ts` → `matchFood`): Each detection's `className` is matched against `food_db.json` via Levenshtein similarity. Exact match on `class_label` or name → confidence 1.0. Fuzzy match on aliases with substring bonus. Threshold 0.4.

7. **Portion estimation** (`app/(tabs)/scan.tsx`): Bounding box area as proxy for portion size:
   ```
   areaFraction = (bbox.width × bbox.height) / (imageWidth × imageHeight)
   portionScale = clamp(0.5, areaFraction / 0.12, 2.0)
   estimatedPortion = food.portion_g × portionScale
   ```
   Reference: food occupying ~12% of image area = 1× the DB's default portion. Clamped to 0.5×–2.0× to avoid extremes.

8. **Nutrient scaling** (`lib/foodDb.ts` → `scaleFood`): All 7 nutrients (calories, K, P, Na, protein, carbs, fat) scale linearly: `scaled = base × (estimatedPortion / food.portion_g)`.

9. **Review screen** (`app/(tabs)/scan.tsx`): Shows captured image with colored bounding box overlays (absolutely-positioned Views). Per-item cards show portion ±25g adjustment, 7-nutrient grid. User can add/remove items before logging.

10. **Logging**: Cart submitted via `api.post("/logs/meals", ...)` → backend writes to Supabase `meal_logs` + `meal_items` tables.

**API fallback**: If TFLite model not loaded, scan falls back to `POST /scan/detect` (Roboflow serverless inference via `backend/routers/scan.py`). Shown as amber warning in UI.

### Manual search flow

`app/(tabs)/scan.tsx` Manual mode → `searchFoods()` from `lib/foodDb.ts` → Levenshtein fuzzy search against `food_db.json` → results displayed → tap to add to cart with default portion → adjust → log. Fully offline, no backend call.

### Food database

`backend/data/food_db.json` — single source of truth, shared by:
- **Frontend**: imported directly in `lib/foodDb.ts` (bundled into JS at build time)
- **Backend**: loaded by `routers/food.py` at startup

Each entry: `{ name, class_label, aliases[], portion_g, calories, potassium_mg, phosphorus_mg, sodium_mg, protein_g, carbs_g, fat_g }`. Nutrient values are per `portion_g` grams. `class_label` maps to YOLO detection classes.

### CKD nutrient limits

`lib/ckdLimits.ts` — returns daily limits based on CKD stage (1–5) following KDOQI guidelines. Used by dashboard (`index.tsx`) and alerts (`useNutrientAlerts.ts`). Key limits: energy 30 kcal/kg, protein 0.8 g/kg (stages 1–2) → 0.6 g/kg (stages 3–5), sodium/potassium/phosphorus progressively restricted.

### Backend data model

- `food/lookup` and `food/parse` are **stateless** — they only read the in-memory `FOOD_DB` (JSON file loaded once). Nutrient scaling via `scale_food` is linear from the DB portion.
- `food/parse` uses a regex ladder (`PORTION_PATTERNS`) for portion units (plate/bowl/cup/piece/etc.) → grams, then `SequenceMatcher` fuzzy match on name+aliases (threshold 0.4). Unknown foods return with zero nutrients and `confidence=0.1`.
- `logs/meals` writes to Supabase tables `meal_logs` (parent) + `meal_items` (children) using the service-role client. All endpoints use `get_current_user` dependency — `user_id` derived from verified JWT.
- `scan/detect` sends image to Roboflow inference API (`malaysian-food-recognition-ourez/5` model), cross-references detections with food DB. Used as fallback when on-device model unavailable.
- `ocr/extract` is a Phase-3 placeholder; only validates content-type and returns empty results.

### YOLO26 model training

To retrain or update the on-device model:

```bash
pip install ultralytics

# Export dataset from Roboflow as "YOLOv8" format (same for YOLO26)
# Train YOLO26-Nano
yolo detect train data=path/to/data.yaml model=yolo26n.pt epochs=100 imgsz=640

# Export to TFLite (float16 quantization)
yolo export model=runs/detect/train/weights/best.pt format=tflite half=True

# Place in project
cp best_float16.tflite assets/models/food_detect.tflite
```

After replacing the model, verify class order matches `CLASS_NAMES` in `lib/yolo.ts`:
```python
from ultralytics import YOLO
print(YOLO("best.pt").names)
```

### Dashboard and history

- `app/(tabs)/index.tsx` — fetches meals via `useMeals()`, aggregates today's nutrient totals, renders calorie circle gauge (SVG), 4 nutrient progress bars (K/P/Na/protein via `NutrientProgressBar`), today's meal cards, and alert badges. Risk level from `getRiskLevel()` (safe/caution/danger based on % of CKD limits).
- `app/(tabs)/history.tsx` — groups meals by date (Today/Yesterday/date strings), shows daily totals card per group, expandable `MealHistoryItem` cards with full nutrient breakdown.
- `app/alerts.tsx` — standalone page listing exceeded limits with swap suggestions (e.g., "Replace anchovies with chicken breast"). Accessible from dashboard alert badge.

### Registration flow

`app/(auth)/register.tsx` — 4-step wizard:
1. **Account**: email, password, confirm password → `supabase.auth.signUp()`
2. **About You**: age (ScrollPicker), gender (toggle), weight (ScrollPicker, kg), height (ScrollPicker, cm)
3. **Health**: CKD stage (1–5 selector), diabetes (toggle), hypertension (toggle), eGFR (optional)
4. **Lifestyle**: activity level (selector), dietary preference (selector), allergies (multi-select)

All health/lifestyle data stored as `user_metadata` on the Supabase auth user.

## Gotchas

- **Custom dev client required**: `react-native-fast-tflite` has native code — cannot use Expo Go. Must build via `npx expo prebuild && npx expo run:android`.
- Reanimated 4 requires `react-native-worklets` as a separate package (already in deps). If a bundle error says `Cannot find module 'react-native-worklets/plugin'`, run `npx expo install react-native-worklets` and restart Metro with `-c`.
- After native dep changes, always restart with `npx expo start -c` — Metro caches Babel output aggressively.
- CORS in `backend/main.py` is wide open (`allow_origins=["*"]`) — fine for dev, must be tightened before deploy.
- `tsconfig.json` intentionally omits `baseUrl` (deprecated in TS 7); `paths` resolve relative to the tsconfig directory.
- `food_db.json` is shared between frontend (bundled at build time) and backend (loaded at runtime). Changes require both a Metro restart and backend restart to take effect.
- `CLASS_NAMES` in `lib/yolo.ts` must match the exact order from the trained model. Mismatch = wrong food labels on detections.
- `ScrollPicker` in profile is tap-to-unlock — prevents accidental value changes when scrolling the page.

## Not yet implemented

- **Offline logging**: Queue meals locally when offline, sync to Supabase on reconnect. Needs `@react-native-community/netinfo` + AsyncStorage queue.
- **Chat**: CKD AI assistant (RAG-powered) — UI placeholder exists, functionality disabled.
- **Lab report OCR**: `ocr/extract` endpoint is a stub. Phase 3.
- **Auth hardening**: CORS is wide open (`allow_origins=["*"]`). Must restrict before deploy.

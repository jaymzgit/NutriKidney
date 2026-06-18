# NutriKidney

A smart diet assistant for Chronic Kidney Disease (CKD) patients. Built with React Native (Expo) and FastAPI.

NutriKidney helps CKD patients track meals, monitor nutrient intake against stage-specific limits (KDOQI guidelines), and flag dietary risks — with on-device food detection powered by YOLO26.

## Features

### Meal Logging
- **Camera scan** — photograph your meal, YOLO26-Nano detects and classifies food items on-device (no internet needed)
- **Manual search** — fuzzy search a Malaysian food database with offline support
- **Portion estimation** — bounding box area estimates portion size, adjustable before logging
- **Review screen** — colored bounding box overlays on captured image, per-item nutrient breakdown, ±25g portion adjustment

### CKD Nutrient Monitoring
- **Stage-specific limits** — daily nutrient targets based on CKD stage 1–5 (KDOQI guidelines)
- **Dashboard** — calorie gauge, potassium/phosphorus/sodium/protein progress bars
- **Risk alerts** — safe/caution/danger classification with swap suggestions (e.g., "Replace anchovies with chicken breast")
- **Meal history** — grouped by date, daily nutrient totals, expandable meal cards

### User Management
- **4-step registration** — account, demographics, health profile (CKD stage, comorbidities), lifestyle
- **Profile** — weight tracking with chart, CKD stage, health flags, dietary preferences
- **Auth** — email/password + Google OAuth via Supabase

### Food Database
- 50+ Malaysian foods with CKD-relevant nutrients (potassium, phosphorus, sodium, protein, calories, carbs, fat)
- Portion-specific values with linear scaling
- Fuzzy matching via Levenshtein similarity (name + aliases)

## Architecture

```
Mobile App (Expo/React Native)
├── On-device ML (YOLO26-Nano via react-native-fast-tflite)
├── Local food database (food_db.json bundled in JS)
├── Supabase Auth (JWT tokens)
└── REST client → FastAPI backend

FastAPI Backend
├── JWT validation (Supabase JWKS, RS256)
├── Meal CRUD (Supabase PostgreSQL)
├── Food lookup & NL parsing
├── Roboflow API fallback (image detection)
└── OCR placeholder (Phase 3)

Supabase (Cloud)
├── Auth (users, sessions, OAuth)
└── Database (meal_logs, meal_items, profiles)
```

## Tech Stack

### Mobile
| Technology | Version | Purpose |
|------------|---------|---------|
| Expo SDK | 54 | Managed native workflow |
| React Native | 0.81 | Mobile runtime (New Architecture) |
| TypeScript | 5.9 | Type safety |
| expo-router | 6 | File-based routing with typed routes |
| NativeWind | 4 | Tailwind CSS for React Native |
| react-native-fast-tflite | 3 | TFLite model inference |
| Supabase JS | 2 | Auth + database client |
| Lucide React Native | 1.17 | Icon library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.115+ | Web framework |
| Supabase Python | 2.10+ | Database client (service role) |
| PyJWT | 2.8+ | JWT validation |
| inference-sdk | 1.3+ | Roboflow API (fallback detection) |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Supabase | Auth + PostgreSQL database |
| EAS Build | Cloud APK/AAB builds |
| Roboflow | Model training + API fallback |

## Prerequisites

- Node.js 20+
- Python 3.8+
- Expo account (for EAS Build)
- Supabase project (for auth + database)
- Android device or emulator (for testing)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/NutriKidney.git
cd NutriKidney
npm install
```

### 2. Environment variables

Create `.env` at project root:

```env
# Mobile (Expo)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://localhost:8000

# Backend
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Roboflow (optional — API fallback)
ROBOFLOW_API_KEY=your-roboflow-key
```

### 3. Start the backend

```bash
cd backend
python -m venv venv
# Windows PowerShell:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Start Metro (development)

```bash
npx expo start -c
```

> **Note**: This app requires a custom dev client (APK), not Expo Go, because `react-native-fast-tflite` has native code.

### 5. Build APK

```bash
npm install -g eas-cli
eas login
eas build:configure

npx expo prebuild
eas build --platform android --profile preview
```

Download the APK from your [Expo dashboard](https://expo.dev) and install on device.

## On-Device Food Detection

NutriKidney uses YOLO26-Nano (Ultralytics, Jan 2026) for on-device food detection. The model runs entirely on the phone — no internet needed for scanning.

### How it works

1. Camera captures photo
2. Image resized to 640x640, converted to NCHW Float32 tensor
3. YOLO26-Nano TFLite inference runs on-device
4. Post-processing: confidence threshold (0.25) + Non-Maximum Suppression (IoU 0.45)
5. Each detection matched to food database via Levenshtein similarity
6. Bounding box area estimates portion size (clamped 0.5x–2.0x of default portion)
7. All 7 nutrients scale linearly with estimated portion
8. User reviews and adjusts on confirmation screen

### Supported food classes (15)

Anchovies, Boiled Egg, Char Kuey Teow, Chicken Rendang, Cucumber, Curry Puff, Fried Banana, Fried Chicken, Fried Egg, Fried Rice, Hokkien Mee, Mee Rebus, Peanuts, Rice, Sambal

### Retraining the model

```bash
pip install ultralytics

# Export dataset from Roboflow as "YOLOv8" format
yolo detect train data=path/to/data.yaml model=yolo26n.pt epochs=100 imgsz=640
yolo export model=runs/detect/train/weights/best.pt format=tflite half=True

# Place in project and rebuild APK
cp best_float16.tflite assets/models/food_detect.tflite
eas build --platform android --profile preview
```

## Project Structure

```
app/                          # Expo Router screens
  (auth)/                     # Login, register, forgot/reset password
  (tabs)/                     # Dashboard, scan, history, lab-reports, chat, profile
  alerts.tsx                  # Nutrient alerts page

lib/                          # Shared utilities
  AuthContext.tsx              # Auth state management
  api.ts                      # REST client with auto-injected Bearer token
  yolo.ts                     # YOLO26 TFLite inference pipeline
  foodDb.ts                   # Local food DB with fuzzy matching
  ckdLimits.ts                # CKD stage-specific nutrient limits (KDOQI)
  useMeals.ts                 # Meals data hook
  riskEngine.js               # Safe/caution/danger classification

components/                   # Reusable UI components
  ScrollPicker.tsx             # Tap-to-unlock numeric picker
  NutrientProgressBar.tsx      # Color-coded nutrient progress
  MealCard.tsx                 # Meal summary card
  Button.tsx                   # Multi-variant button

backend/                      # FastAPI service
  main.py                     # App entry + CORS
  routers/
    auth.py                   # JWT validation (Supabase JWKS)
    food.py                   # Food lookup + NL parsing
    logs.py                   # Meal CRUD
    scan.py                   # Roboflow API fallback
    ocr.py                    # OCR placeholder
  data/
    food_db.json              # Malaysian food database

assets/models/
  food_detect.tflite          # YOLO26-Nano model (~41 MB)
```

## Supabase Schema

### meal_logs
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to auth.users |
| method | text | "scan" or "manual" |
| logged_at | timestamptz | When the meal was logged |

### meal_items
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| meal_id | uuid | Foreign key to meal_logs |
| food_name | text | Name of the food item |
| portion_g | float | Portion in grams |
| calories | float | Energy (kcal) |
| potassium_mg | float | Potassium (mg) |
| phosphorus_mg | float | Phosphorus (mg) |
| sodium_mg | float | Sodium (mg) |
| protein_g | float | Protein (g) |
| carbs_g | float | Carbohydrates (g) |
| fat_g | float | Fat (g) |

## Roadmap

- [x] Auth (email/password + Google OAuth)
- [x] On-device food detection (YOLO26-Nano)
- [x] Manual food search (offline)
- [x] Meal logging with portion estimation
- [x] CKD nutrient monitoring (stages 1–5)
- [x] Dashboard with risk alerts
- [x] Meal history
- [x] EAS Build pipeline
- [ ] Offline meal logging (queue + sync)
- [ ] Lab report OCR
- [ ] CKD AI chat assistant (RAG-powered)
- [ ] Dark mode

## License

This project is for educational and research purposes.

## Acknowledgments

- [Ultralytics YOLO26](https://docs.ultralytics.com/) — on-device object detection
- [Roboflow](https://roboflow.com/) — model training and dataset management
- [KDOQI Guidelines](https://www.kidney.org/professionals/kdoqi-guidelines) — CKD nutrient limits
- [Supabase](https://supabase.com/) — auth and database
- [Expo](https://expo.dev/) — React Native framework and build service

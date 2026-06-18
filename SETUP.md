# NutriKidney — Setup Guide

Step-by-step instructions to get the app running from a fresh clone.

---

## Prerequisites

| Tool | Version | Check | Install |
|------|---------|-------|---------|
| Node.js | 20+ | `node -v` | https://nodejs.org |
| Python | 3.8+ | `python --version` | https://python.org |
| Git | any | `git --version` | https://git-scm.com |
| Expo account | — | — | https://expo.dev/signup |

**Optional** (for local APK install):
| Tool | Check | Install |
|------|-------|---------|
| ADB (Android Debug Bridge) | `adb version` | Comes with Android Studio, or install standalone via [platform-tools](https://developer.android.com/tools/releases/platform-tools) |

---

## 1. Clone and install dependencies

```powershell
git clone https://github.com/<your-username>/NutriKidney.git
cd NutriKidney
npm install
```

If you hit peer dependency conflicts:
```powershell
npm install --legacy-peer-deps
```

---

## 2. Environment variables

Create `.env` in the project root:

```env
# Mobile (Expo) — used by the app
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000

# Backend — used by FastAPI
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Roboflow (optional — API fallback for scan)
ROBOFLOW_API_KEY=your-roboflow-key
```

**Important**: `EXPO_PUBLIC_API_URL` must be your machine's LAN IP (not `localhost`) if testing on a physical device. Find it with:
```powershell
ipconfig    # Windows — look for "IPv4 Address" under Wi-Fi
```

---

## 3. Start the backend

Open a terminal:

```powershell
cd backend
python -m venv venv                # create virtual environment (first time only)
.\venv\Scripts\Activate.ps1        # activate venv (PowerShell)
pip install -r requirements.txt    # install Python deps (first time only)
uvicorn main:app --reload --port 8000
```

**macOS/Linux** alternative:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`. Verify: open `http://localhost:8000/` in browser — should return a status message.

**Leave this terminal running.** Open a new terminal for the next steps.

---

## 4. Start the mobile app (development)

### Option A: Expo Go (quick, no build needed)

Works for everything except on-device YOLO scanning (camera scan falls back to API).

```powershell
npx expo start -c
```

Scan the QR code with the Expo Go app on your phone (download from Play Store / App Store).

If your phone can't reach the dev server:
```powershell
npx expo start --tunnel
```

### Option B: Local build to device (full features including YOLO)

Builds and installs directly to a USB-connected phone. No APK file to transfer. Requires Android SDK.

**Prerequisites**:
1. Install [Android Studio](https://developer.android.com/studio)
2. Open Android Studio → SDK Manager → install Android SDK
3. Set environment variable (PowerShell, run once):
   ```powershell
   [System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
   ```
4. Restart terminal
5. Enable USB Debugging on phone (Settings → Developer Options → USB Debugging)
6. Connect phone via USB, accept the debugging prompt

**Build and run**:
```powershell
npx expo prebuild --clean
npx expo run:android
```

First build takes ~5–10 minutes (Gradle). Subsequent builds are fast. App installs directly to device and connects to Metro for hot reload.

### Option C: Custom dev client via EAS (cloud build)

If you don't have Android Studio, use EAS Build instead — see section 5 below.

After installing the APK on your device:
```powershell
npx expo start -c
```

Scan the QR code with the installed NutriKidney app (not Expo Go).

---

## 5. Build the APK (EAS Build — cloud)

### First-time setup

```powershell
npm install -g eas-cli       # install EAS CLI globally
eas login                    # authenticate (opens browser)
eas build:configure          # creates eas.json + links project to Expo
```

### Build

```powershell
npx expo prebuild --clean    # generate native android/ directory
eas build --platform android --profile preview
```

This uploads the project to Expo's cloud servers and builds the APK remotely. Takes 5–15 minutes.

When done, the terminal shows a download link. You can also find it at:
https://expo.dev → your project → Builds

### Build profiles

| Command | Profile | Output | Use case |
|---------|---------|--------|----------|
| `eas build --platform android --profile development` | development | APK | Dev client — connects to Metro for hot reload |
| `eas build --platform android --profile preview` | preview | APK | Standalone — runs without Metro |
| `eas build --platform android --profile production` | production | AAB | Play Store submission |

### When to rebuild

Rebuild needed after:
- Adding/removing native npm packages
- Changing `app.json` plugins
- Updating the TFLite model (`assets/models/food_detect.tflite`)

**Not needed** for JS-only code changes — those hot-reload via Metro.

---

## 6. Install APK on device

### Option A: Direct download (no ADB)

1. After EAS build completes, open the download link on your Android phone's browser
2. Download the `.apk` file
3. Open the downloaded file → "Install" (may need to enable "Install from unknown sources" in Settings → Security)

### Option B: Via ADB (USB)

1. Enable **Developer Options** on your phone:
   - Settings → About Phone → tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Settings → Developer Options → USB Debugging → On
3. Connect phone via USB cable, accept the debugging prompt on phone
4. Install:

```powershell
# Download APK from EAS build link first, then:
adb install path\to\nutrikidney.apk
```

To reinstall (replace existing):
```powershell
adb install -r path\to\nutrikidney.apk
```

### Option C: Via ADB (wireless — no cable)

1. Enable USB Debugging (same as above)
2. Connect phone and computer to the same Wi-Fi network
3. First pair (one-time):

```powershell
# On phone: Developer Options → Wireless Debugging → Pair with pairing code
# Note the IP:port and pairing code shown
adb pair 192.168.x.x:port    # enter pairing code when prompted
```

4. Connect:
```powershell
adb connect 192.168.x.x:port   # use the IP:port from Wireless Debugging (not the pairing port)
```

5. Install:
```powershell
adb install path\to\nutrikidney.apk
```

---

## Quick reference

### Daily development workflow

```powershell
# Terminal 1 — backend
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000

# Terminal 2 — mobile
npx expo start -c
```

### Useful commands

| Command | What it does |
|---------|-------------|
| `npx expo start -c` | Start Metro with clean cache |
| `npx expo start --tunnel` | Start Metro with tunnel (for off-LAN devices) |
| `npx expo install <pkg>` | Install SDK-compatible native package |
| `npx expo prebuild --clean` | Regenerate native android/ directory |
| `eas build --platform android --profile preview` | Cloud build preview APK |
| `eas build:list` | Check build status/history |
| `adb devices` | List connected Android devices |
| `adb install -r app.apk` | Install/reinstall APK on connected device |
| `adb logcat *:E` | View Android error logs (useful for crash debugging) |

### Troubleshooting

| Problem | Fix |
|---------|-----|
| `uvicorn` not recognized | Activate venv first: `.\venv\Scripts\Activate.ps1` |
| Metro can't find module after installing package | Restart with `npx expo start -c` |
| Expo Go can't connect to backend | Set `EXPO_PUBLIC_API_URL` to LAN IP, restart Metro with `-c` |
| `ENOENT gradlew` on EAS build | Run `npx expo prebuild --clean` first |
| `NitroModules` not found | Need custom dev client APK — can't use Expo Go for TFLite |
| npm peer dep conflicts | Add `--legacy-peer-deps` flag |
| Camera scan says "model not loaded" in Expo Go | Expected — falls back to API. Need APK for on-device YOLO. |
| API fallback also fails | Check backend is running + `EXPO_PUBLIC_API_URL` is correct LAN IP |

# OmniPost Mobile Companion (React Native / Expo)

An elegant, simple-to-use cross-platform mobile companion app built with **React Native** and **Expo**. This app allows you to connect and synchronize social media sessions (like X/Twitter and Instagram) from OmniPost directly onto your Android or iOS device in seconds. 

It registers a custom deep link scheme (`omnipost://`) to automatically boot into the secure WebView extractor when requested by your OmniPost web dashboard.

---

## 🚀 Quick Start & Development

### 1. Prerequisites
- Download and install the free **Expo Go** client app on your mobile phone:
  - [iOS (App Store)](https://apps.apple.com/us/app/expo-go/id984023705)
  - [Android (Google Play Store)](https://play.google.com/store/apps/details?id=host.exp.exponent)
- Ensure you have **Node.js** installed locally on your development machine.

### 2. Setup
1. Open your terminal and enter the project folder:
   ```bash
   cd mobile-companion-expo
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### 3. Running with Expo Go
Launch the local Expo bundler:
```bash
npm start
```
- A **QR Code** will be generated inside your terminal.
- **For Android**: Open the Expo Go app and tap "Scan QR Code". Scan the terminal QR code.
- **For iOS**: Open the native Camera app on your iPhone and scan the QR code. Tap the notification banner to launch Expo Go.

---

## 📱 Deep Linking Configuration

Deep link format supported by this app: `omnipost://?platform=Twitter&token=JWT_TOKEN_HERE`

### Local Development / Expo Go testing
While testing inside **Expo Go**, deep links are routed through the Expo Client. The link schema looks like:
`exp://<your-packager-ip>:8081/--/connect?platform=Twitter&token=JWT_TOKEN_HERE`

### Production Builds
When you compile a standalone release app, the custom URI scheme is registered under `app.json` inside the `scheme` property:
```json
{
  "expo": {
    "scheme": "omnipost"
  }
}
```
This ensures that `omnipost://connect` automatically launches your production mobile app on iOS and Android.

---

## 🛠️ Compiling and Building a Standalone App

To bundle production `.apk`, `.aab` (Android), or `.ipa` (iOS) binaries, use Expo Application Services (EAS):

1. Install the EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
2. Log in or register an Expo account:
   ```bash
   eas login
   ```
3. Initialize the project with EAS:
   ```bash
   eas build:configure
   ```
4. Build for your target platform:
   ```bash
   # Android APK / Bundle
   eas build --platform android --profile preview

   # iOS Binary (Requires Apple Developer account)
   eas build --platform ios
   ```

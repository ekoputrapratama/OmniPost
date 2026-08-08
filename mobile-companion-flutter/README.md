# OmniPost Mobile Companion (Flutter)

A modern, secure, full-featured Mobile Companion for **OmniPost Automation Hub** built with Google Flutter. It enables seamless headless session authentication handshakes between your mobile device and the central OmniPost server, helping bypass anti-bot, 2FA, and recaptcha gates on major platforms.

---

## ✨ Features

- **Custom Scheme Deep Linking (`omnipost://`)**: Handles seamless browser-to-mobile handshakes automatically.
- **Dynamic Server Endpoint Discovery**: If a `host` query parameter is supplied in the deep link, the companion app automatically reconfigures its API URL dynamically.
- **Automated Secure Session Extraction**: Uses modern `flutter_inappwebview` to intercept, secure, and relay authenticated session credentials safely to your server.
- **Fallbacks & Double Checks**: Simultaneously listens to visual cookie streams via continuous JS injection as well as the native device `CookieManager` upon successful redirection.
- **Cyber Aesthetic UI**: Framed around an elegant, responsive dark canvas with neon cyan visual elements aligning perfectly with the OmniPost workspace.

---

## 🚀 Quick Start & Installation

Ensure you have the [Flutter SDK](https://docs.flutter.dev/get-started/install) installed on your system.

### 1. Install Dependencies
Navigate to the mobile directory and fetch all required packages:
```bash
cd mobile-companion-flutter
flutter pub get
```

### 2. Run the Application
Start the development server on a connected simulator, emulator, or real test device:
```bash
flutter run
```

---

## 🛠️ Build & Release Configurations

### 🤖 Android Setup & Build

The application is pre-configured with custom scheme support inside `android/app/src/main/AndroidManifest.xml`.

To build a release-ready APK:
```bash
flutter build apk --release
```

### 🍎 iOS Setup & Build

Custom scheme configuration is pre-configured inside `ios/Runner/Info.plist`.

To build and compile for iOS:
```bash
flutter build ipa
```

---

## 🔒 Security Best Practices

1. **Direct Communication**: Session tokens and cookie strings are transmitted strictly between your mobile device and your configured self-hosted/cloud OmniPost server instance.
2. **Encrypted Headers**: All outgoing HTTP Synchronization payloads are wrapped securely in an `Authorization: Bearer <TOKEN>` transaction layer.

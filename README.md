# OmniPost Automation Hub (Experimental)

**Demo URL:** [https://omnipost-hub.ai.studio](https://omnipost-hub.ai.studio)

OmniPost Automation Hub is a modern, high-performance, full-stack cross-platform social publishing dashboard and API. Designed to eliminate manual repetition across social platforms, OmniPost enables creators, marketers, and developers to draft content once, select target platforms, and seamlessly dispatch or schedule posts. It powers publishes through headless browser automation (Puppeteer) and handles reliable post delivery with robust state tracking.

---

## 🚀 Key Features

### 1. Cross-Platform Unified Publishing
*   **Draft Once, Publish Everywhere**: Create a single piece of rich media content and select multiple destination platforms for simultaneous publishing.
*   **Media Attachments**: Support for local media file uploads as well as remote media URLs.

### 2. Smart Post Scheduling
*   **Time-Delayed Dispatch**: Schedule posts to be published automatically at any specific date and time in the future.
*   **Automated Background Worker**: A server-side scheduler checks Firestore every 10 seconds for due tasks, decrypts credentials, and fires the automation engine without human intervention.

### 3. Headless Browser Automation (Puppeteer)
*   **Native Automation Engine**: Instead of relying on brittle, restricted, or expensive official platform APIs, OmniPost automates real browser sessions to publish your updates.
*   **Resilient Task Queue**: Securely handles credential injection, navigation loops, and element interactions.

### 4. Interactive Command Center Dashboard
*   **Real-Time Status Monitor**: Visual labels for all post life cycles (`Queued`, `Processing`, `Scheduled`, `Published`, and `Failed`).
*   **Platform Accounts Manager**: Connect and manage target platform credentials securely using AES-256 client-server encryption.
*   **Warm Dark-Neutral Design**: Highly polished cyberpunk-inspired UI with rich visual feedback, fluid micro-interactions, and status updates.

---

## 🛠️ Tech Stack & Architecture

-   **Frontend**: React 18 with TypeScript, Tailwind CSS, Lucide Icons, and Framer Motion (`motion/react`) for responsive, fluid animations.
-   **Backend**: Express Server with TypeScript (run via `tsx` / compiled with `esbuild` for production).
-   **Database & Auth**: Google Firebase/Firestore for client-side persistence, real-time sync, and account record storage.
-   **Automation**: Puppeteer for headless browser execution and media uploading workflows.
-   **Cryptography**: AES-256 encryption via `crypto-js` to keep connected platform credentials safe at rest.

---

## ⚙️ Project Setup

### Prerequisites
- Node.js (v18 or higher recommended)

### Environment Variables
Configure your environment secrets in `.env`:
```env
PORT=3000
ENCRYPTION_SECRET=your_secure_aes_encryption_key
AGENT_API_KEY=your_optional_agent_api_key
VITE_FIREBASE_PROJECT_ID=firebase-project-id
VITE_FIREBASE_APP_ID=firebase-app-id
VITE_FIREBASE_API_KEY=firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=firebase-auth-domain-name
VITE_FIREBASE_FIRESTORE_ID=firebase-firestore-database-id
VITE_FIREBASE_STORAGE_BUCKET=firebase-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=firebase-messaging-sender-id
VITE_FIREBASE_OAUTH_CLIENT_ID=firebase-oauth-client-id
```

### Installation & Run

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start development server**:
    ```bash
    npm run dev
    ```
3.  **Build for production**:
    ```bash
    npm run build
    ```
4.  **Start production server**:
    ```bash
    npm run start
    ```

---

## 🔒 Security & Privacy
OmniPost decrypts social media account credentials *only* temporarily in-memory within the secure containerized backend at the exact moment of browser automation. All user credentials saved in Firestore are encrypted at the client boundary using robust AES-256 standards with a server-configured secret.

---

## 🗺️ Roadmap & Verification Status

Below is the current verification and implementation status of OmniPost Automation Hub's features. We actively test and update this list to keep track of working workflows:

### 📦 Currently Tested & Fully Operational Features
- [x] **Universal Command Center UI**: Fully styled, responsive cyber-dark dashboard with fluid micro-interactions and transitions using Framer Motion.
- [x] **Platform Account Manager**: Multi-account integration with secure AES-256 encryption/decryption routines working between the browser client and server.
- [x] **Immediate Content Dispatch (Instant Publish)**: Synchronous posting via Puppeteer browser automation.
- [x] **Smart Media Upload Engine**:
  - [x] Drag-and-drop media uploading on desktop.
  - [x] Mobile-friendly manual file upload picker ("Attach Media" button).
  - [x] Double-fallback cloud-storage: Direct upload to Firebase Storage when fully configured, with automatic base64 in-transit data fallback when running locally.
- [x] **Multi-Platform Puppeteer Automation**:
  - [x] **Twitter/X**: Automatic textbox populating, sequential local temp-file media upload, and post/tweet click events.
  - [ ] **LinkedIn**: Field focus injection, multi-media uploading, and publish workflows.
  - [x] **Facebook**: Status message automation and media asset attachment.
  - [x] **Instagram**: Automation for photo/video posts and caption injection.
  - [x] **Bluesky**: Direct AT Protocol API integration for high-reliability publishing with custom handles support and sharp-powered automatic image scaling and compression.
  - [x] **Pinterest**: Automated Pin creation tool navigation, high-reliability file upload sequence, automated title/description injection, board selection dropdown, and publish dispatch flow.
- [x] **Automated Background Scheduling Worker**: Server-side chronologically active cron loop (running every 10s) that pulls due posts, downloads any secure media files, decrypts credentials, and publishes them automatically.
- [x] **Visual Lifecycle State Tracker**: Real-time reactive labels highlighting progress status (`Queued`, `Processing`, `Scheduled`, `Published`, `Failed`) directly in the user feed.

### 🧪 Upcoming / Experimental (In-Progress) Features
- [ ] **Rich Media Video Uploading**: Support for heavier `.mp4` and `.mov` media uploads through optimal chunking.
- [ ] **Analytics & Performance Tracking**: Retroactive extraction of post reach, impressions, and engagements directly from automated scraping or platform APIs.
- [ ] **AI-Powered Hook Writer**: Integrating server-side Gemini models to suggest engaging post variations and optimize content lengths for each target platform.

---

## 📄 License
This project is licensed under the Apache License, Version 2.0. See the [LICENSE](./LICENSE) file for the full license text.



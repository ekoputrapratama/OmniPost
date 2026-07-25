# OmniPost Automation Hub (Experimental)

**Demo URL:** [https://omnipost-hub.ai.studio](https://omnipost-hub.ai.studio)

OmniPost Automation Hub is a modern, high-performance, full-stack cross-platform social publishing dashboard and API. Designed to eliminate manual repetition across social platforms, OmniPost enables creators, marketers, and developers to draft content once, select target platforms, and seamlessly dispatch or schedule posts. It powers publishes through headless browser automation (Puppeteer) and handles reliable post delivery with robust state tracking.

## Notice
This platform is made using gemini ai and not fully tested yet, so there will be a feature that may not work yet.
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

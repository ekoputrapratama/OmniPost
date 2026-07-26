
const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID,
  appId: metaEnv.VITE_FIREBASE_APP_ID,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_FIRESTORE_ID,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  oAuthClientId: metaEnv.VITE_FIREBASE_OAUTH_CLIENT_ID,
};

export default firebaseConfig;
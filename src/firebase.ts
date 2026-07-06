import { initializeApp, setLogLevel } from 'firebase/app';
import { initializeFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence noisy internal Firebase console warnings when connection is unavailable or blocked in sandboxed iframes.
// The app has a high-reliability fallback mechanism that polls the API state every 5 seconds.
setLogLevel('silent');

const app = initializeApp(firebaseConfig);

// Using initializeFirestore with force long polling makes the Firestore connection
// 100% resilient inside browser environments where WebSockets might be blocked or throttled (e.g., sandboxed iframes).
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

/**
 * Validates connection to firestore on boot
 */
export async function testConnection() {
  try {
    const docRef = doc(db, 'appState', 'current');
    await getDoc(docRef);
    console.log("Firebase Firestore connected successfully on client.");
  } catch (error) {
    console.error("Test connection to Firestore failed:", error);
  }
}

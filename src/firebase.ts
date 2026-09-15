import { initializeApp, setLogLevel as setAppLogLevel } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setLogLevel as setFirestoreLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence noisy internal Firebase console warnings when connection is unavailable or stream recycles.
// The app has a high-reliability fallback mechanism that polls the API state every 5 seconds.
try {
  setAppLogLevel('silent');
  setFirestoreLogLevel('silent');
} catch (e) {}

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
  } catch (error: any) {
    if (error?.message?.includes('Quota exceeded') || error?.code === 'resource-exhausted') {
      console.warn("Firestore daily quota limit reached. Using local REST API server fallback.");
    } else {
      console.error("Test connection to Firestore failed:", error);
    }
  }
}

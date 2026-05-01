import { initializeApp, getApps, getApp } from 'firebase/app';
import { Platform } from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAplKriWNbFnxLXhj7HFnpzCLMh0xetb3I",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "sakuchile.firebaseapp.com",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "sakuchile",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "sakuchile.appspot.com",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "936867850434",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:936867850434:web:672ea30a8ce4196bee735b",
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-E18Y924S9N"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
const storage = getStorage(app);
const messaging = Platform.OS === 'web' && typeof window !== 'undefined' ? getMessaging(app) : null;

export { app, auth, db, functions, storage, messaging };

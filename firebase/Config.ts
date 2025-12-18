import { initializeApp } from "firebase/app";
import { getFirestore, Firestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
// @ts-ignore
import { initializeAuth, getAuth, Auth } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';


const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const firestore: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);


const BOOKCOLLECTION = collection(firestore, 'books');

export {
    firestore,
    auth,
    BOOKCOLLECTION,
    addDoc,
    serverTimestamp,
    collection
}

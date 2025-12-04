import { initializeApp } from "firebase/app";
import { getFirestore, Firestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";


const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
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

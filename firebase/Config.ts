import { initializeApp } from "firebase/app";
import { getFirestore, Firestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";


const firebaseConfig = {
    apiKey: "AIzaSyB1NBThUvOuKL6U42OwwABgjvTs0TvG84E",
    authDomain: "bookshelf-d365f.firebaseapp.com",
    projectId: "bookshelf-d365f",
    storageBucket: "bookshelf-d365f.firebasestorage.app",
    messagingSenderId: "115274595462",
    appId: "1:115274595462:web:2ed15b7780f885fb9ca507"
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

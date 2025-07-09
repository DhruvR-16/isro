// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB18DxD4Go_vN9S-_X7pgu-wXg7f3joxHM",
  authDomain: "vayu-drishti.firebaseapp.com",
  projectId: "vayu-drishti",
  storageBucket: "vayu-drishti.appspot.com",
  messagingSenderId: "531660298519",
  appId: "1:531660298519:web:51c4ce09e19bfd8572bf52",
  measurementId: "G-QZWX36NP73",
  // Add databaseURL if you plan to use Realtime Database
  databaseURL: "https://vayu-drishti-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
const firestore = getFirestore(app);

export { app, analytics, database, firestore };
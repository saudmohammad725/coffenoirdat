// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDBlGaghNVTvLXiykCaIrTszEVuHd5TG4U",
  authDomain: "coffeenoir-1fe6b.firebaseapp.com",
  projectId: "coffeenoir-1fe6b",
  storageBucket: "coffeenoir-1fe6b.firebasestorage.app",
  messagingSenderId: "846057487909",
  appId: "1:846057487909:web:37490e1ef5d53ebc4989cc",
  measurementId: "G-4XB0L1T0XM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics
export const analytics = getAnalytics(app);

export default app;

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCyctIVY9QFfZwBMCqvKlNqL6ydlBHCPsM",
  authDomain: "crivopactoipiranga.firebaseapp.com",
  projectId: "crivopactoipiranga",
  storageBucket: "crivopactoipiranga.firebasestorage.app",
  messagingSenderId: "598010811027",
  appId: "1:598010811027:web:eddcea35e691b4e3d37366",
  measurementId: "G-6RBV9PXJX2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
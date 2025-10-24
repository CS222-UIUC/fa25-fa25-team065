import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAYFuCwzvyWhUorwDVKf1s_6YXsQ6HWjuA",
  authDomain: "splitify-a968e.firebaseapp.com",
  projectId: "splitify-a968e",
  storageBucket: "splitify-a968e.firebasestorage.app",
  messagingSenderId: "34855209839",
  appId: "1:34855209839:web:6006f139e19acb2c9cb69a",
  measurementId: "G-CJDBW69DCV"
};


// Firebase is properly configured! 🎉

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;

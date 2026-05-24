import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB8N5AwWACU4RoraFGta8YCYh1Sey0U22c",
  authDomain: "attendance-management-2baa6.firebaseapp.com",
  projectId: "attendance-management-2baa6",
  storageBucket: "attendance-management-2baa6.firebasestorage.app",
  messagingSenderId: "280834531902",
  appId: "1:280834531902:web:8e8984b6cb5a30eba7a76f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
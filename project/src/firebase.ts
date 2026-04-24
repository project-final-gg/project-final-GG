import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCacFkQJJqEmWR9_u6rJyI-2ckFZUv1ppg",
  authDomain: "logs-b100c.firebaseapp.com",
  projectId: "logs-b100c",
  storageBucket: "logs-b100c.firebasestorage.app",
  messagingSenderId: "512529742838",
  appId: "1:512529742838:web:b830cb21742125a04c25d7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
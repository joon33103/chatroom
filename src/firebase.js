// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth} from "firebase/auth";
import {getStorage} from "firebase/storage"
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCl4zQY27iIi3kKxUab-Jwf1D72UJijdPM",
  authDomain: "chat-room-6be33.firebaseapp.com",
  projectId: "chat-room-6be33",
  storageBucket: "chat-room-6be33.appspot.com",
  messagingSenderId: "398149429983",
  appId: "1:398149429983:web:945831aa59e5ccef3d576a",
  measurementId: "G-3EFFW0TJSL"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth()
export const storage = getStorage(app);
export const db = getFirestore(app)
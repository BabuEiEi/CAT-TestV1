// firebase.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export cconst firebaseConfig = {
  apiKey: "AIzaSyBRFDcGXLIyDRJnYkx-VXs8zggHFVTVr4c",
  authDomain: "cat-demo-i-b9d84.firebaseapp.com",
  projectId: "cat-demo-i-b9d84",
  storageBucket: "cat-demo-i-b9d84.firebasestorage.app",
  messagingSenderId: "61384012079",
  appId: "1:61384012079:web:585229e8fad6590276b1da",
  measurementId: "G-CL87G5M4YZ"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

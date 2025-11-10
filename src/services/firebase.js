// src/services/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';


const firebaseConfig = {
  apiKey: 'AIzaSyBwW2FS41yvxxkK6sAAUimKF-NYBh4slyI',
  authDomain: 'ecofin-157f4.firebaseapp.com',
  projectId: 'ecofin-157f4',
  storageBucket: 'ecofin-157f4.appspot.com', 
  messagingSenderId: '899150807587',
  appId: '1:899150807587:web:ff4d9a94ca8d0dd4d9e796',
  measurementId: 'G-DR9FL4BNR2',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Analytics só funciona no Web. Em React Native/Expo, ignore.
let analytics = null;
if (typeof window !== 'undefined' && 'measurementId' in firebaseConfig) {
  try {
    analytics = getAnalytics(app);
  } catch {
    
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { analytics };

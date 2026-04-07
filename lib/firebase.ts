import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBXJhoZbodKpYDPtgZO7gpdLpBPg2S5ncU",
  authDomain: "nestlink-8d9ad.firebaseapp.com",
  projectId: "nestlink-8d9ad",
  storageBucket: "nestlink-8d9ad.firebasestorage.app",
  messagingSenderId: "795477190532",
  appId: "1:795477190532:web:f8269a29b9d99f85021fd1",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

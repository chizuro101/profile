import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getCountFromServer,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB7gF_GwHbDxmodyzE1WCDqj3SiWwyidIU",
  authDomain: "chatbox-99f9e.firebaseapp.com",
  projectId: "chatbox-99f9e",
  storageBucket: "chatbox-99f9e.firebasestorage.app",
  messagingSenderId: "1080783543703",
  appId: "1:1080783543703:web:bf3377a4cb2235421ff8d2"
};

let app, db, auth;
let firebaseReady = false;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  firebaseReady = true;
} catch (e) {
  console.warn("Firebase failed to initialize — check firebaseConfig.", e);
}

export {
  app,
  db,
  auth,
  firebaseReady,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getCountFromServer,
  serverTimestamp,
  Timestamp,
  signInAnonymously,
};

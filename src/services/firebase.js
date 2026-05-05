// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "../../firebase.config"; // user creates this file based on example

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };

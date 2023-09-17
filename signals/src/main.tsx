import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from 'firebase/database';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAite-peeC9kkgfs_KgcbbLZ-G4K5Aa-VU",
  authDomain: "signals-10b17.firebaseapp.com",
  databaseURL: "https://signals-10b17-default-rtdb.firebaseio.com",
  projectId: "signals-10b17",
  storageBucket: "signals-10b17.appspot.com",
  messagingSenderId: "715260614346",
  appId: "1:715260614346:web:63433ff1bdcb1099edc633"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

getDatabase(app);

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>,
)

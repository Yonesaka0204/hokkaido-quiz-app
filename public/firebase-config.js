// public/firebase-config.js

const firebaseConfig = {
    apiKey: "AIzaSyDt92CKIkB48Bf6gXAlaeZYF7uNwT6gEp4",
    authDomain: "quizhokkaido.firebaseapp.com",
    projectId: "quizhokkaido",
    storageBucket: "quizhokkaido.firebasestorage.app",
    messagingSenderId: "570677049102",
    appId: "1:570677049102:web:d66b9d3a1e525d2428c95f",
    measurementId: "G-QZJDP1DB32"
  };
  
  // Firebaseを初期化 (既に初期化済みでなければ)
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  // 他ファイルで使えるように、authとdbのインスタンスを定数として宣言
  const auth = firebase.auth();
  const db = firebase.firestore();
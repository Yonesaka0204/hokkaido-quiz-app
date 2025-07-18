// ★★★ ご提供いただいた情報に、基づいて設定を反映しました ★★★
const firebaseConfig = {
    apiKey: "AIzaSyDt92CKIkB48Bf6gXAlaeZYF7uNwT6gEp4",
    authDomain: "quizhokkaido.firebaseapp.com",
    projectId: "quizhokkaido",
    storageBucket: "quizhokkaido.firebasestorage.app",
    messagingSenderId: "570677049102",
    appId: "1:570677049102:web:d66b9d3a1e525d2428c95f",
    measurementId: "G-QZJDP1DB32"
  };
  
  // Firebaseを初期化
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  function showAuthError(error) {
      console.error("Authentication Error:", error.code, error.message);
      alert(`エラー (${error.code}): ${error.message.split('(')[0]}`);
  }
  
  // --- 新規登録ページのロジック ---
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const username = document.getElementById('username').value.trim();
          const email = document.getElementById('email').value.trim();
          const password = document.getElementById('password').value;
  
          if (!username) {
              alert('ユーザー名を入力してください。');
              return;
          }
  
          auth.createUserWithEmailAndPassword(email, password)
              .then((userCredential) => {
                  const user = userCredential.user;
                  return db.collection("users").doc(user.uid).set({
                      username: username,
                      level: 1,
                      xp: 0,
                      rating: 1500,
                      createdAt: firebase.firestore.FieldValue.serverTimestamp()
                  });
              })
              .then(() => {
                  alert('登録が完了しました！トップページに戻ります。');
                  window.location.href = '/';
              })
              .catch(showAuthError);
      });
  }
  
  // --- ログインページのロジック ---
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;
  
          auth.signInWithEmailAndPassword(email, password)
              .then(() => {
                  alert('ログインしました！');
                  window.location.href = '/';
              })
              .catch(showAuthError);
      });
  }
// Firebaseプロジェクトの設定
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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// DOM要素を取得
const userStatusDiv = document.getElementById('user-status');
const loadingMessage = document.getElementById('loading-message');
const usernameDisplay = document.getElementById('username-display');
const levelDisplay = document.getElementById('level-display');
const ratingDisplay = document.getElementById('rating-display');
const xpDisplay = document.getElementById('xp-display');
const xpNextDisplay = document.getElementById('xp-next-display');
const xpProgress = document.getElementById('xp-progress');

// ログイン状態を監視
auth.onAuthStateChanged(user => {
    if (user) {
        // ログインしている場合、Firestoreからユーザー情報を取得
        const userRef = db.collection('users').doc(user.uid);
        userRef.get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const currentLevel = data.level || 1;
                const currentRating = data.rating || 1500;
                const currentXp = data.xp || 0;

                // 次のレベルに必要なXPを計算 (サーバー側と同じロジック)
                const xpForNextLevel = Math.floor(100 * Math.pow(currentLevel, 1.5));
                const progressPercentage = Math.min((currentXp / xpForNextLevel) * 100, 100);

                // 画面に情報を表示
                usernameDisplay.textContent = data.username;
                levelDisplay.textContent = currentLevel;
                ratingDisplay.textContent = currentRating;
                xpDisplay.textContent = currentXp;
                xpNextDisplay.textContent = `${currentXp} / ${xpForNextLevel}`;
                
                // プログレスバーを更新
                xpProgress.style.width = `${progressPercentage}%`;
                xpProgress.textContent = `${Math.floor(progressPercentage)}%`;
                
                // 表示を切り替え
                loadingMessage.style.display = 'none';
                userStatusDiv.style.display = 'block';

            } else {
                loadingMessage.textContent = 'ユーザー情報が見つかりませんでした。';
            }
        }).catch(error => {
            console.error("ユーザー情報の取得エラー:", error);
            loadingMessage.textContent = 'エラーが発生しました。トップページに戻って再試行してください。';
        });
    } else {
        // ログインしていない場合、ログインページにリダイレクト
        loadingMessage.textContent = 'ログインしていません。トップページに戻ります...';
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
    }
});
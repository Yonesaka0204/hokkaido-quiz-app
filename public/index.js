// public/index.js

// --- DOM要素を取得 ---
const loggedInView = document.getElementById('logged-in-view');
const loggedOutView = document.getElementById('logged-out-view');
const usernameDisplay = document.getElementById('username-display');
const levelDisplay = document.getElementById('level-display');
const logoutBtn = document.getElementById('logout-btn');

// ログイン後メニューの要素
const loggedInMenu = document.getElementById('logged-in-menu');
const singlePlayBtn = document.getElementById('single-play-btn');
const multiPlayBtn = document.getElementById('multi-play-btn');

// マルチプレイ用フォームの要素
const multiplayerJoinForm = document.getElementById('multiplayer-join-form');
const roomIdInputMulti = document.getElementById('room-id-input-multi');
const backToMenuBtn = document.getElementById('back-to-menu-btn');

// ゲスト用フォームの要素
const joinRoomFormGuest = document.getElementById('join-room-form-guest');

// --- ログイン状態の監視 ---
auth.onAuthStateChanged(user => {
    if (user) {
        loggedOutView.style.display = 'none';
        loggedInView.style.display = 'block';

        db.collection("users").doc(user.uid).get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                usernameDisplay.textContent = userData.username;
                levelDisplay.textContent = userData.level || 1;
            }
        }).catch(e => console.error("ユーザー情報の取得に失敗:", e));
    } else {
        loggedInView.style.display = 'none';
        loggedOutView.style.display = 'block';
    }
});

// --- イベントリスナー ---

// ログアウトボタン
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        alert('ログアウトしました。');
        window.location.reload();
    });
});

// シングルプレイボタン
singlePlayBtn.addEventListener('click', () => {
    // ランダムなルームIDを生成 (例: "quiz" + 8桁のランダムな英数字)
    const roomId = 'quiz' + Math.random().toString(36).substring(2, 10);
    
    // シングルプレイであることをセッションストレージに記録
    sessionStorage.setItem('isSinglePlayer', 'true');
    
    window.location.href = `/room/${roomId}`;
});

// マルチプレイボタン
multiPlayBtn.addEventListener('click', () => {
    loggedInMenu.style.display = 'none';
    multiplayerJoinForm.style.display = 'block';
});

// (マルチプレイフォームの) 戻るボタン
backToMenuBtn.addEventListener('click', () => {
    multiplayerJoinForm.style.display = 'none';
    loggedInMenu.style.display = 'block';
});

// マルチプレイフォームの送信
multiplayerJoinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const roomId = roomIdInputMulti.value.trim();
    if (roomId) {
        // シングルプレイの記録を削除
        sessionStorage.removeItem('isSinglePlayer');
        window.location.href = `/room/${roomId}`;
    }
});

// ゲストフォームの送信
joinRoomFormGuest.addEventListener('submit', (e) => {
    e.preventDefault();
    const guestName = document.getElementById('guest-name-input').value.trim();
    const roomId = document.getElementById('room-id-input-guest').value.trim();
    if (roomId && guestName) {
        sessionStorage.setItem('guestName', guestName);
        // シングルプレイの記録を削除
        sessionStorage.removeItem('isSinglePlayer');
        window.location.href = `/room/${roomId}`;
    }
});
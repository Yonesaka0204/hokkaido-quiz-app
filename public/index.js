// public/index.js

// --- DOM要素を取得 ---
const loggedInView = document.getElementById('logged-in-view');
const loggedOutView = document.getElementById('logged-out-view');
const usernameDisplay = document.getElementById('username-display');
const levelDisplay = document.getElementById('level-display');
const logoutBtn = document.getElementById('logout-btn');
const loggedInMenu = document.getElementById('logged-in-menu');
const singlePlayBtn = document.getElementById('single-play-btn');
const multiPlayBtn = document.getElementById('multi-play-btn');
const multiplayerJoinForm = document.getElementById('multiplayer-join-form');
const roomIdInputMulti = document.getElementById('room-id-input-multi');
const joinRoomFormGuest = document.getElementById('join-room-form-guest');
const typingGameBtn = document.getElementById('typing-game-btn');
const guestTypingBtn = document.getElementById('guest-typing-btn');

// ▼▼▼ チュートリアル関連の要素を取得 ▼▼▼
const helpBtn = document.getElementById('help-btn');
const tutorialModal = document.getElementById('tutorial-modal');
const closeTutorialIcon = document.getElementById('close-tutorial');
const closeTutorialBtn = document.getElementById('close-tutorial-btn');
// ▲▲▲ ここまで ▲▲▲

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
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        alert('ログアウトしました。');
        window.location.reload();
    });
});
singlePlayBtn.addEventListener('click', () => {
    const roomId = 'quiz' + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('isSinglePlayer', 'true');
    window.location.href = `/room/${roomId}`;
});
multiPlayBtn.addEventListener('click', () => {
    loggedInMenu.style.display = 'none';
    multiplayerJoinForm.style.display = 'block';
});
multiplayerJoinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const roomId = roomIdInputMulti.value.trim();
    if (roomId) {
        sessionStorage.removeItem('isSinglePlayer');
        window.location.href = `/room/${roomId}`;
    }
});
joinRoomFormGuest.addEventListener('submit', (e) => {
    e.preventDefault();
    const guestName = document.getElementById('guest-name-input').value.trim();
    const roomId = document.getElementById('room-id-input-guest').value.trim();
    if (roomId && guestName) {
        sessionStorage.setItem('guestName', guestName);
        sessionStorage.removeItem('isSinglePlayer');
        window.location.href = `/room/${roomId}`;
    }
});
typingGameBtn.addEventListener('click', () => {
    window.location.href = '/typing';
});
if (guestTypingBtn) {
    guestTypingBtn.addEventListener('click', () => {
        window.location.href = '/typing';
    });
}

// ▼▼▼ チュートリアル機能の実装 ▼▼▼

// モーダルを表示する関数
function showTutorial() {
    tutorialModal.style.display = 'flex';
}

// モーダルを閉じる関数
function closeTutorial() {
    tutorialModal.style.display = 'none';
    // 「見た」という記録をブラウザに残す
    localStorage.setItem('tutorialSeen', 'true');
}

// 初回アクセス判定
window.addEventListener('DOMContentLoaded', () => {
    const hasSeenTutorial = localStorage.getItem('tutorialSeen');
    if (!hasSeenTutorial) {
        // まだ見ていない場合のみ自動表示
        showTutorial();
    }
});

// ボタン操作
helpBtn.addEventListener('click', showTutorial);
closeTutorialIcon.addEventListener('click', closeTutorial);
closeTutorialBtn.addEventListener('click', closeTutorial);

// 背景クリックでも閉じるようにする
tutorialModal.addEventListener('click', (e) => {
    if (e.target === tutorialModal) {
        closeTutorial();
    }
});
// ▲▲▲ ここまで ▲▲▲
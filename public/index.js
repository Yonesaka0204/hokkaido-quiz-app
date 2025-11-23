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
const typingGameBtn = document.getElementById('typing-game-btn');

// ▼▼▼ ゲストモード用の要素を取得 ▼▼▼
const guestNameInput = document.getElementById('guest-name-input');
const guestSingleBtn = document.getElementById('guest-single-btn');
const guestTypingBtn = document.getElementById('guest-typing-btn');
const guestMultiBtn = document.getElementById('guest-multi-btn');
const guestRoomIdInput = document.getElementById('guest-room-id');
// ▲▲▲ ここまで ▲▲▲

const helpBtn = document.getElementById('help-btn');
const tutorialModal = document.getElementById('tutorial-modal');
const closeTutorialIcon = document.getElementById('close-tutorial');
const closeTutorialBtn = document.getElementById('close-tutorial-btn');

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

// --- イベントリスナー (ログイン時) ---
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
typingGameBtn.addEventListener('click', () => {
    window.location.href = '/typing';
});

// ▼▼▼ イベントリスナー (ゲスト時) ▼▼▼

// ゲスト名の保存ヘルパー関数
function saveGuestName() {
    const name = guestNameInput.value.trim() || 'ゲスト';
    sessionStorage.setItem('guestName', name);
    return name;
}

// ゲスト：シングルプレイ
guestSingleBtn.addEventListener('click', () => {
    saveGuestName();
    const roomId = 'quiz' + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('isSinglePlayer', 'true');
    window.location.href = `/room/${roomId}`;
});

// ゲスト：タイピング
guestTypingBtn.addEventListener('click', () => {
    saveGuestName();
    window.location.href = '/typing';
});

// ゲスト：マルチプレイ参加
guestMultiBtn.addEventListener('click', () => {
    const roomId = guestRoomIdInput.value.trim();
    if (roomId) {
        saveGuestName();
        sessionStorage.removeItem('isSinglePlayer');
        window.location.href = `/room/${roomId}`;
    } else {
        alert('部屋IDを入力してください。');
    }
});
// ▲▲▲ ここまで ▲▲▲


// --- チュートリアル機能 ---
function showTutorial() {
    tutorialModal.style.display = 'flex';
}
function closeTutorial() {
    tutorialModal.style.display = 'none';
    localStorage.setItem('tutorialSeen', 'true');
}

window.addEventListener('DOMContentLoaded', () => {
    const hasSeenTutorial = localStorage.getItem('tutorialSeen');
    if (!hasSeenTutorial) {
        showTutorial();
    }
});

helpBtn.addEventListener('click', showTutorial);
closeTutorialIcon.addEventListener('click', closeTutorial);
closeTutorialBtn.addEventListener('click', closeTutorial);

tutorialModal.addEventListener('click', (e) => {
    if (e.target === tutorialModal) {
        closeTutorial();
    }
});
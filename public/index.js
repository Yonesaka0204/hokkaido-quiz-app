// public/index.js

const loggedInView = document.getElementById('logged-in-view');
const loggedOutView = document.getElementById('logged-out-view');
const usernameDisplay = document.getElementById('username-display');
const levelDisplay = document.getElementById('level-display');
const logoutBtn = document.getElementById('logout-btn');
const joinRoomFormAuthed = document.getElementById('join-room-form-authed');
const joinRoomFormGuest = document.getElementById('join-room-form-guest');

// URLからルームIDを自動入力する処理
const pathRoomId = window.location.pathname.split('/')[2];
if (pathRoomId && pathRoomId !== 'room') {
    document.getElementById('room-id-input-authed').value = pathRoomId;
    document.getElementById('room-id-input-guest').value = pathRoomId;
}

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

logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        alert('ログアウトしました。');
        window.location.reload();
    });
});

joinRoomFormAuthed.addEventListener('submit', (e) => {
    e.preventDefault();
    const roomId = document.getElementById('room-id-input-authed').value.trim();
    if (roomId) window.location.href = `/room/${roomId}`;
});

joinRoomFormGuest.addEventListener('submit', (e) => {
    e.preventDefault();
    const guestName = document.getElementById('guest-name-input').value.trim();
    const roomId = document.getElementById('room-id-input-guest').value.trim();
    if (roomId && guestName) {
        sessionStorage.setItem('guestName', guestName);
        window.location.href = `/room/${roomId}`;
    }
});
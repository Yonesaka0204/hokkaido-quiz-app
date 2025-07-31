// public/room.js

const roomId = window.location.pathname.split('/')[2];
const decodedRoomId = decodeURIComponent(roomId);
document.getElementById('room-title').textContent = `待機部屋: ${decodedRoomId}`;

const socket = io();

// --- シングルプレイかマルチプレイかを判定し、ボタン表示を切り替える ---
const isSinglePlayer = sessionStorage.getItem('isSinglePlayer') === 'true';

const startRankedButton = document.getElementById('start-ranked-button');
const startFreeButton = document.getElementById('start-free-button');
const matchTypeSelector = document.getElementById('match-type-selector');

if (isSinglePlayer) {
    // シングルプレイの場合
    matchTypeSelector.innerHTML = '<button id="start-single-button" class="auth-button">クイズを開始</button>';
    const startSingleButton = document.getElementById('start-single-button');
    startSingleButton.addEventListener('click', () => {
        startSingleButton.disabled = true;
        startSingleButton.textContent = '準備中...';
        
        const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked').value;
        const selectedFormat = document.querySelector('input[name="answerFormat"]:checked').value;
        
        socket.emit('start-quiz', { 
            roomId, 
            difficulty: selectedDifficulty, 
            answerFormat: selectedFormat,
            isRanked: false // シングルプレイは常にフリーマッチ
        });
    });
} else {
    // マルチプレイの場合 (既存のロジック)
    startRankedButton.addEventListener('click', () => startQuiz(true));
    startFreeButton.addEventListener('click', () => startQuiz(false));
}


socket.on('connect', () => {
    auth.onAuthStateChanged((user) => {
        const guestName = sessionStorage.getItem('guestName');
        if (user) {
            user.getIdToken(true).then(idToken => {
                socket.emit('join-room', { roomId, idToken });
            }).catch(error => {
                console.error("認証エラー:", error);
                alert('認証情報の取得に失敗しました。再度ログインしてください。');
                window.location.href = '/login';
            });
        } else if (guestName) {
            socket.emit('join-room', { roomId, name: guestName });
        } else {
            // シングルプレイ時はログイン必須なので、このルートは主にURL直叩きなどのケース
            alert('参加情報がないため、トップページに戻ります。');
            window.location.href = '/';
        }
    });
});

socket.on('room-users', (users) => {
    const ul = document.getElementById('userList');
    if(!ul) return;
    ul.innerHTML = '';
    users.forEach(u => {
        const li = document.createElement('li');
        li.textContent = `${u.name} (Lv. ${u.level}) ${u.isGuest ? '(ゲスト)' : ''}`;
        ul.appendChild(li);
    });
});


// マルチプレイ用の関数 (isSinglePlayerがfalseの場合のみ使われる)
function startQuiz(isRanked) {
    startRankedButton.disabled = true;
    startFreeButton.disabled = true;
    startRankedButton.textContent = '準備中...';
    startFreeButton.textContent = '準備中...';

    const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked').value;
    const selectedFormat = document.querySelector('input[name="answerFormat"]:checked').value;
    
    socket.emit('start-quiz', { 
        roomId, 
        difficulty: selectedDifficulty, 
        answerFormat: selectedFormat,
        isRanked: isRanked
    });
}

socket.on('quiz-start', ({ roomId }) => {
    // // クイズ開始時にシングルプレイの記録を削除
    // sessionStorage.removeItem('isSinglePlayer');
    window.location.href = `/room/${roomId}/quiz`;
});

socket.on('quiz-start-failed', (data) => {
    alert(data.message);
    
    // ボタンの状態を元に戻す
    if (isSinglePlayer) {
        const startSingleButton = document.getElementById('start-single-button');
        if(startSingleButton) {
            startSingleButton.disabled = false;
            startSingleButton.textContent = 'クイズを開始';
        }
    } else {
        if (startRankedButton && startFreeButton) {
            startRankedButton.disabled = false;
            startFreeButton.disabled = false;
            // ★変更点★ テキストから「！」を削除
            startRankedButton.textContent = 'レートマッチで開始';
            startFreeButton.textContent = 'フリーマッチで開始';
        }
    }
});

socket.on('join-error', (data) => {
    alert(data.message);
    window.location.href = '/';
});

const chatToggleBtn = document.getElementById('chat-toggle-btn');
const chatPanel = document.getElementById('chat-panel');
const openChatIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>`;
const closeChatIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

if (chatToggleBtn) {
    chatToggleBtn.innerHTML = openChatIcon;
    chatToggleBtn.addEventListener('click', () => {
        const isOpen = chatPanel.classList.toggle('is-open');
        document.body.classList.toggle('chat-is-open');
        chatToggleBtn.innerHTML = isOpen ? closeChatIcon : openChatIcon;
    });
}

const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = chatInput.value;
        if (message) {
            socket.emit('send-chat-message', { roomId, message });
            chatInput.value = '';
        }
    });
}

socket.on('new-chat-message', ({ sender, message }) => {
    const p = document.createElement('p');
    const escapedMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    p.innerHTML = `<strong>${sender}:</strong> ${escapedMessage}`;
    chatMessages.appendChild(p);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});
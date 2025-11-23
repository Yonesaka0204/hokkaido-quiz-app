// public/quiz.js

const roomId = window.location.pathname.split('/')[2];
const socket = io();

// ▼▼▼ 設定値を追加 ▼▼▼
// 座標取得ツールで使用した「元の地図画像」のサイズを設定してください
const ORIGINAL_MAP_WIDTH = 2400;  // 例: 800px (座標取得時の画像幅)
const ORIGINAL_MAP_HEIGHT = 1600; // 例: 800px (座標取得時の画像高さ)
// ▲▲▲ ここまで ▲▲▲

let hasProceeded = false;
let isEliminated = false;
let canProceed = false;

const progressEl = document.getElementById('progress');
const questionEl = document.getElementById('question');
const optionsContainer = document.getElementById('options-container');
const resultEl = document.getElementById('result');
const backToLobbyBtn = document.getElementById('back-to-lobby-btn');
const playerStatusContainer = document.getElementById('player-status-container');
const playerStatusList = document.getElementById('player-status-list');

// ▼▼▼ 地図用要素を取得 ▼▼▼
const mapContainer = document.getElementById('map-container');
const mapPin = document.getElementById('map-pin');
// ▲▲▲ ここまで ▲▲▲

socket.on('connect', () => {
    auth.onAuthStateChanged((user) => {
        const guestName = sessionStorage.getItem('guestName');
        if (user) {
            user.getIdToken(true).then(idToken => {
                socket.emit('player-ready', { roomId, idToken });
            }).catch(err => { window.location.href = '/login'; });
        } else if (guestName) {
            socket.emit('player-ready', { roomId, name: guestName });
        } else {
            window.location.href = '/';
        }
    });
});

if(backToLobbyBtn) {
    backToLobbyBtn.addEventListener('click', () => {
        if (confirm('クイズを中断して全員でロビーに戻りますか？')) {
            socket.emit('return-to-lobby', { roomId });
        }
    });
}

socket.on('new-question', (data) => {
    document.removeEventListener('click', proceedToNext);
    document.removeEventListener('keydown', handleKeydown);

    hasProceeded = false;
    canProceed = false; 
    resultEl.innerHTML = '';
    
    // ▼▼▼ 地図を隠す ▼▼▼
    if (mapContainer) mapContainer.style.display = 'none';
    // ▲▲▲ ここまで ▲▲▲

    if (!isEliminated) {
        optionsContainer.innerHTML = '';
        questionEl.style.display = 'block';
    }
    if(backToLobbyBtn) backToLobbyBtn.disabled = false;
    
    progressEl.textContent = `第 ${data.questionNumber} / ${data.totalQuestions} 問`;
    questionEl.textContent = data.question.question;

    questionEl.className = 'quiz-item-enter';

    playerStatusContainer.style.display = 'block';
    playerStatusList.innerHTML = '';
    data.users.forEach(user => {
        const li = document.createElement('li');
        li.id = 'status-' + user.name;
        let statusText = user.eliminated ? '脱落' : '回答待...';
        li.innerHTML = `<span class="player-name">${user.name}</span><span class="player-answer-status">${statusText}</span>`;
        playerStatusList.appendChild(li);
    });

    if (!isEliminated && data.answerFormat === 'multiple-choice') {
        data.options.forEach((optionText, index) => {
            const button = document.createElement('button');
            button.textContent = optionText;
            button.className = 'option-btn';
            button.classList.add('quiz-item-enter', `delay-${index + 1}`);
            button.addEventListener('click', () => handleSubmit(optionText, data.question.question));
            optionsContainer.appendChild(button);
        });
    } else if (!isEliminated) {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'answer-input';
        input.placeholder = 'ひらがなで入力';
        input.autocomplete = 'new-password';
        input.autocorrect = 'off';
        input.autocapitalize = 'off';
        input.spellcheck = false;
        
        input.readOnly = true;
        input.onfocus = () => { 
            input.readOnly = false;
            input.onfocus = null; 
        };
        
        input.classList.add('quiz-item-enter', 'delay-1');

        const submitButton = document.createElement('button');
        submitButton.textContent = '解答する';
        submitButton.className = 'option-btn';

        submitButton.classList.add('quiz-item-enter', 'delay-2');

        const submitHandler = () => handleSubmit(input.value, data.question.question);
        submitButton.addEventListener('click', submitHandler);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); submitHandler(); }
        });
        optionsContainer.appendChild(input);
        optionsContainer.appendChild(submitButton);
        input.focus();
    }
});

function handleSubmit(answer, questionText) {
    if (!answer || !answer.trim() || isEliminated) return;
    socket.emit('submit-answer', { roomId, answer, questionText });
    Array.from(optionsContainer.children).forEach(child => child.disabled = true);
}

socket.on('player-answered', ({ name, isCorrect, eliminated }) => {
    const playerLi = document.getElementById('status-' + name);
    if (playerLi) {
        const statusSpan = playerLi.querySelector('.player-answer-status');
        if (eliminated) {
            statusSpan.textContent = '脱落';
            statusSpan.classList.add('incorrect');
        } else if (isCorrect) {
            statusSpan.textContent = '正解';
            statusSpan.classList.add('correct');
        } else {
            statusSpan.textContent = '不正解';
            statusSpan.classList.add('incorrect');
        }
    }
});

// ▼▼▼ answer-result 受信時の処理 (修正) ▼▼▼
socket.on('answer-result', ({ correct, correctAnswer, trivia, eliminated, region, x, y }) => {
    if (isEliminated) return;
    
    if (eliminated) {
        isEliminated = true;
        optionsContainer.innerHTML = '';
    }

    questionEl.style.display = 'none';
    resultEl.innerHTML = '';

    // --- 地図表示ロジック ---
    if (mapContainer && x !== undefined && y !== undefined) {
        mapContainer.style.display = 'block';
        
        // 座標をパーセンテージに変換
        const leftPercent = (x / ORIGINAL_MAP_WIDTH) * 100;
        const topPercent = (y / ORIGINAL_MAP_HEIGHT) * 100;
        
        mapPin.style.left = `${leftPercent}%`;
        mapPin.style.top = `${topPercent}%`;
    }
    // ---------------------

    const resultContainer = document.createElement('div');
    resultContainer.className = 'result-container';

    const verdictEl = document.createElement('h3');
    verdictEl.className = 'result-verdict';
    resultContainer.appendChild(verdictEl);
    
    verdictEl.classList.add('verdict-pop-animation');
    
    if (correct) {
        verdictEl.textContent = '正解！';
        verdictEl.classList.add('correct');
    } else {
        verdictEl.textContent = eliminated ? 'ここで脱落！' : '残念！';
        verdictEl.classList.add('incorrect');
        const correctAnswerEl = document.createElement('p');
        correctAnswerEl.className = 'result-correct-answer';
        correctAnswerEl.innerHTML = `正解は「<span>${correctAnswer}</span>」でした。`;
        resultContainer.appendChild(correctAnswerEl);
    }
    
    setTimeout(() => {
        verdictEl.classList.remove('verdict-pop-animation');
    }, 500);
    
    const triviaContainer = document.createElement('div');
    triviaContainer.className = 'result-trivia';
    triviaContainer.innerHTML = `<div class="result-trivia-title">【豆知識】</div><p class="result-trivia-body">${trivia}</p>`;
    resultContainer.appendChild(triviaContainer);

    const promptEl = document.createElement('p');
    promptEl.id = 'result-prompt';
    promptEl.className = 'result-prompt';
    promptEl.textContent = isEliminated ? '他のプレイヤーの挑戦を見届けましょう！' : '他のプレイヤーの回答を待っています...';
    resultContainer.appendChild(promptEl);
    
    resultEl.appendChild(resultContainer);
});
// ▲▲▲ ここまで ▲▲▲

socket.on('all-answers-in', () => {
    const promptEl = document.getElementById('result-prompt');
    if (promptEl) {
        if (!isEliminated) {
             promptEl.textContent = 'クリック、または Enterキーで次に進みます (7秒後に自動進行)';
             promptEl.style.color = '#3498db';
        }
    }
    if (!isEliminated) {
        canProceed = true; 
        document.addEventListener('click', proceedToNext);
        document.addEventListener('keydown', handleKeydown);
    }
});

function proceedToNext() {
    if (hasProceeded || isEliminated || !canProceed) return;
    hasProceeded = true;

    document.removeEventListener('click', proceedToNext);
    document.removeEventListener('keydown', handleKeydown);

    const promptEl = document.getElementById('result-prompt');
    if (promptEl) {
        promptEl.textContent = '準備完了！他のプレイヤーを待っています...';
        promptEl.style.color = '#2ecc71';
    } else {
        resultEl.textContent = '準備完了！他のプレイヤーを待っています...';
    }
    
    socket.emit('ready-for-next-question', { roomId });
}

function handleKeydown(e) {
    if (e.key === 'Enter') {
        proceedToNext();
    }
}

socket.on('lobby-redirect', (targetRoomId) => {
    alert('クイズが中断されました。ロビーに戻ります。');
    window.location.href = `/room/${targetRoomId}`;
});

socket.on('quiz-end', ({ finalResults, roomId }) => {
    playerStatusContainer.style.display = 'none';
    resultEl.textContent = 'クイズ終了！結果画面に移動します...';
    sessionStorage.setItem('finalResults', JSON.stringify(finalResults));
    window.location.href = `/room/${roomId}/results`;
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
            chatInput.blur();
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
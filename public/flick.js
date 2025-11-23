// public/flick.js

// --- DOM要素の取得 ---
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const resultsScreen = document.getElementById('results-screen');
const startBtn = document.getElementById('start-btn');
const timerDisplay = document.querySelector('#timer span');
const scoreDisplay = document.querySelector('#score span');
const comboDisplay = document.querySelector('#combo span');
const kanjiDisplay = document.getElementById('kanji-display');
const hiraganaDisplay = document.getElementById('hiragana-display');
const inputFeedback = document.getElementById('input-feedback');
const flickInput = document.getElementById('flick-input');
const finalScoreDisplay = document.getElementById('final-score');
const maxComboDisplay = document.getElementById('max-combo');
const highscoreDisplay = document.getElementById('highscore-message');
const xpMessage = document.getElementById('xp-message');
const playAgainBtn = document.getElementById('play-again-btn');

// ゲスト用要素
const guestScoreForm = document.getElementById('guest-score-form');
const guestNameInput = document.getElementById('guest-name');
const submitGuestScoreBtn = document.getElementById('submit-guest-score-btn');
const skipGuestScoreBtn = document.getElementById('skip-guest-score-btn');
const loggedInActions = document.getElementById('logged-in-actions');

// --- グローバル変数 ---
let allQuizData = [], currentGameTime = 60, timerInterval = null, isTimerActive = false;
let currentQuestion = null;
let score = 0, combo = 0, maxCombo = 0;
let previousInput = '';
const socket = io();
let currentUser = null;

// --- スコアリング ---
function getComboMultiplier(c) {
    if (c >= 50) return 2.5; if (c >= 30) return 2.0;
    if (c >= 20) return 1.5; if (c >= 10) return 1.2;
    return 1.0;
}

// --- ゲームロジック ---
function chooseNewQuestion() {
    const randomIndex = Math.floor(Math.random() * allQuizData.length);
    currentQuestion = allQuizData[randomIndex];
    kanjiDisplay.textContent = currentQuestion.question;
    hiraganaDisplay.textContent = currentQuestion.answer;
    
    // 入力欄と変数をリセット
    flickInput.value = '';
    previousInput = '';
    updateInputFeedback('');
}

// 入力状況の視覚フィードバックのみ行う
function updateInputFeedback(currentValue) {
    inputFeedback.innerHTML = '';
    const answer = currentQuestion.answer;
    
    for (let i = 0; i < Math.max(answer.length, currentValue.length); i++) {
        const span = document.createElement('span');
        
        if (i < currentValue.length) {
            span.textContent = currentValue[i];
            if (i < answer.length && currentValue[i] === answer[i]) {
                span.className = 'correct'; 
            } else {
                span.className = 'untyped'; 
            }
        } else {
            // 未入力部分は表示なし
        }
        inputFeedback.appendChild(span);
    }
}

// 入力イベント
function handleInput() {
    if (!isTimerActive && allQuizData.length > 0) {
        isTimerActive = true;
        timerInterval = setInterval(() => {
            currentGameTime--;
            timerDisplay.textContent = currentGameTime;
            if (currentGameTime <= 0) endGame();
        }, 1000);
    }
    
    const currentValue = flickInput.value;
    updateInputFeedback(currentValue);
    previousInput = currentValue;
}

// Enterキー判定
function handleKeydown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        checkAnswer();
    }
}

function checkAnswer() {
    const value = flickInput.value;
    const answer = currentQuestion.answer;

    if (value === answer) {
        // 正解
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        
        const comboMultiplier = getComboMultiplier(combo);
        const points = Math.round(answer.length * 100 * comboMultiplier);
        score += points;
        
        scoreDisplay.textContent = score;
        comboDisplay.textContent = combo;
        
        chooseNewQuestion();
    } else {
        // 不正解
        score -= 100;
        if (score < 0) score = 0;
        combo = 0;
        
        scoreDisplay.textContent = score;
        comboDisplay.textContent = combo;
        
        inputFeedback.classList.add('shake-animation');
        setTimeout(() => inputFeedback.classList.remove('shake-animation'), 200);
        
        flickInput.value = '';
        updateInputFeedback('');
    }
}

function startGame() {
    currentGameTime = 60; score = 0; combo = 0; maxCombo = 0;
    isTimerActive = false; previousInput = '';
    
    timerDisplay.textContent = 60;
    scoreDisplay.textContent = 0;
    comboDisplay.textContent = 0;
    highscoreDisplay.style.display = 'none';
    xpMessage.style.display = 'none';
    startScreen.style.display = 'none';
    resultsScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    
    flickInput.setAttribute('enterkeyhint', 'done');
    flickInput.focus();
    
    chooseNewQuestion();
}

function endGame() {
    clearInterval(timerInterval);
    
    flickInput.blur();
    finalScoreDisplay.textContent = score;
    maxComboDisplay.textContent = maxCombo;
    gameScreen.style.display = 'none';
    resultsScreen.style.display = 'block';
    
    if (currentUser) {
        loggedInActions.style.display = 'block';
        guestScoreForm.style.display = 'none';
        const xpGained = 20 + Math.floor(score / 200);
        xpMessage.textContent = `+${xpGained} XP を獲得しました！`;
        xpMessage.style.display = 'block';
        currentUser.getIdToken(true).then(idToken => {
            socket.emit('submit-flick-score', {
                idToken: idToken, score: score
            });
        });
    } else {
        loggedInActions.style.display = 'none';
        guestScoreForm.style.display = 'block';
        
        submitGuestScoreBtn.onclick = () => {
            const name = document.getElementById('guest-name').value.trim();
            if (name) {
                socket.emit('submit-guest-score', {
                    name: name,
                    score: score,
                    timeMode: 60,
                    mode: 'flick'
                });
                alert('登録しました！');
                guestScoreForm.style.display = 'none';
                loggedInActions.style.display = 'block';
            } else {
                alert('名前を入力してください。');
            }
        };
        
        skipGuestScoreBtn.onclick = () => {
            guestScoreForm.style.display = 'none';
            loggedInActions.style.display = 'block';
        };
    }
}

// --- 初期化処理 ---
auth.onAuthStateChanged(user => {
    if (user) currentUser = user;
});
socket.on('connect', () => {
    socket.emit('get-typing-data');
});
socket.on('typing-data', (data) => {
    allQuizData = data;
    startBtn.disabled = false;
    startBtn.textContent = '60秒チャレンジ スタート';
});
socket.on('typing-score-saved', ({ isNewHighscore }) => {
    if (isNewHighscore) {
        highscoreDisplay.textContent = '🎉 ハイスコア更新！';
        highscoreDisplay.style.display = 'block';
    }
});

const handleStart = (event) => {
    event.preventDefault();
    startScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    flickInput.focus();
    startGame();
};

startBtn.addEventListener('click', handleStart);
startBtn.addEventListener('touchstart', handleStart);
playAgainBtn.addEventListener('click', handleStart);
playAgainBtn.addEventListener('touchstart', handleStart);

flickInput.addEventListener('input', handleInput);
flickInput.addEventListener('keydown', handleKeydown);

// ★★★ 追加: 画面タップでキーボードを再表示する処理 ★★★
document.addEventListener('click', (e) => {
    // ゲーム画面が表示されている時のみ有効
    if (gameScreen.style.display !== 'none') {
        // ボタン等の操作パーツ以外の場所をタップしたらフォーカスを戻す
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A' && e.target !== flickInput) {
            flickInput.focus();
        }
    }
});
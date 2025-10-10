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
    flickInput.value = '';
    previousInput = '';
    updateInputFeedback('');
}

function updateInputFeedback(currentValue) {
    inputFeedback.innerHTML = '';
    const answer = currentQuestion.answer;
    for (let i = 0; i < answer.length; i++) {
        const span = document.createElement('span');
        span.textContent = answer[i];
        if (i < currentValue.length) {
            span.className = 'correct';
        } else {
            span.className = 'untyped';
        }
        inputFeedback.appendChild(span);
    }
}

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
    const diff = currentValue.length - previousInput.length;
    if (diff > 1) {
        flickInput.value = previousInput;
        inputFeedback.classList.add('shake-animation');
        setTimeout(() => inputFeedback.classList.remove('shake-animation'), 200);
        return;
    }
    if (currentQuestion.answer.startsWith(currentValue)) {
        if (diff > 0) {
            const comboMultiplier = getComboMultiplier(combo);
            score += Math.round(100 * comboMultiplier);
        }
    } else {
        score -= 100;
        if (score < 0) score = 0;
        combo = 0;
        flickInput.value = '';
        previousInput = '';
        inputFeedback.classList.add('shake-animation');
        setTimeout(() => inputFeedback.classList.remove('shake-animation'), 200);
        updateInputFeedback('');
        return;
    }
    scoreDisplay.textContent = score;
    comboDisplay.textContent = combo;
    updateInputFeedback(flickInput.value);
    if (flickInput.value === currentQuestion.answer) {
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        comboDisplay.textContent = combo;
        chooseNewQuestion();
    }
    previousInput = flickInput.value;
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
    chooseNewQuestion();
    flickInput.focus();
}

function endGame() {
    clearInterval(timerInterval);
    flickInput.blur();
    finalScoreDisplay.textContent = score;
    maxComboDisplay.textContent = maxCombo;
    gameScreen.style.display = 'none';
    resultsScreen.style.display = 'block';
    if (currentUser) {
        const xpGained = 20 + Math.floor(score / 200);
        xpMessage.textContent = `+${xpGained} XP を獲得しました！`;
        xpMessage.style.display = 'block';
        currentUser.getIdToken(true).then(idToken => {
            // ▼▼▼ イベント名を変更 ▼▼▼
            socket.emit('submit-flick-score', {
                idToken: idToken, score: score
            });
        });
    }
}

// --- 初期化処理 ---
auth.onAuthStateChanged(user => {
    if (user) currentUser = user;
    else window.location.href = '/login';
});
socket.on('connect', () => {
    socket.emit('get-typing-data');
});
socket.on('typing-data', (data) => {
    allQuizData = data;
    startBtn.disabled = false;
    startBtn.textContent = '60秒チャレンジ スタート';
});
socket.on('typing-score-saved', ({ isNewHighscore }) => { // このイベント名は共通でOK
    if (isNewHighscore) {
        highscoreDisplay.textContent = '🎉 ハイスコア更新！';
        highscoreDisplay.style.display = 'block';
    }
});
startBtn.disabled = true;
startBtn.textContent = '問題データ読込中...';
startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', startGame);
flickInput.addEventListener('input', handleInput);
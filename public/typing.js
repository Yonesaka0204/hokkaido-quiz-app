// public/typing.js

// --- DOM要素の取得 ---
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const resultsScreen = document.getElementById('results-screen');
const timeButtons = document.querySelectorAll('.time-btn');
const flickModeBtn = document.getElementById('flick-mode-btn');
const timerDisplay = document.querySelector('#timer span');
const kpmDisplay = document.querySelector('#kpm span');
const accuracyDisplay = document.querySelector('#accuracy span');
const kanjiDisplay = document.getElementById('kanji-display');
const hiraganaDisplay = document.getElementById('hiragana-display');
const romajiDisplay = document.getElementById('romaji-display');
const scoreDisplay = document.getElementById('score-display');
const comboDisplay = document.getElementById('combo-display');
const wordContainer = document.getElementById('word-container');
const virtualKeyboard = document.getElementById('virtual-keyboard');
const finalScoreDisplay = document.getElementById('final-score');
const maxComboDisplay = document.getElementById('max-combo');
const avgKpmDisplay = document.getElementById('avg-kpm');
const finalAccuracyDisplay = document.getElementById('final-accuracy');
const highscoreDisplay = document.getElementById('highscore-message');
const xpMessage = document.getElementById('xp-message');
const playAgainBtn = document.getElementById('play-again-btn');

// ゲスト用要素
const guestScoreForm = document.getElementById('guest-score-form');
const guestNameInput = document.getElementById('guest-name');
const submitGuestScoreBtn = document.getElementById('submit-guest-score-btn');
const skipGuestScoreBtn = document.getElementById('skip-guest-score-btn');
const loggedInActions = document.getElementById('logged-in-actions');

// --- 効果音関連 ---
const sounds = {
    type: new Audio('/sounds/type.mp3'),
    error: new Audio('/sounds/error.mp3'),
    complete: new Audio('/sounds/complete.mp3'),
    combo: new Audio('/sounds/combo.mp3')
};
function playSound(sound) {
    if (!sound) return;
    sound.currentTime = 0; 
    sound.play().catch(error => console.error("音声の再生に失敗しました:", error));
}

// --- グローバル変数 ---
let allQuizData = [], currentGameTime = 0, timeLimit = 0, timerInterval = null, isTimerActive = false;
let currentQuestion = null, remainingHiragana = '', pendingRomajiOptions = [], currentTypedRomaji = '', fullRomajiToDisplay = '';
let currentHiraChunk = ''; // ★★★ 修正点：現在入力中のひらがなを記憶する変数 ★★★
let score = 0, combo = 0, maxCombo = 0, totalTyped = 0, correctTyped = 0;
const socket = io();
let currentUser = null;
let tabPressTimer = null;
const LONG_PRESS_DURATION = 500;

// --- ひらがな→ローマ字変換マップ ---
const romajiMap = {
    'あ': ['a'], 'い': ['i'], 'う': ['u'], 'え': ['e'], 'お': ['o'],
    'か': ['ka', 'ca'], 'き': ['ki'], 'く': ['ku', 'cu', 'qu'], 'け': ['ke'], 'こ': ['ko', 'co'],
    'さ': ['sa'], 'し': ['shi', 'si', 'ci'], 'す': ['su'], 'せ': ['se', 'ce'], 'そ': ['so'],
    'た': ['ta'], 'ち': ['chi', 'ti'], 'つ': ['tsu', 'tu'], 'て': ['te'], 'と': ['to'],
    'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
    'は': ['ha'], 'ひ': ['hi'], 'ふ': ['fu', 'hu'], 'へ': ['he'], 'ほ': ['ho'],
    'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
    'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
    'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
    'わ': ['wa'], 'を': ['wo'], 'ん': ["n", "n'", "nn"],
    'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
    'ざ': ['za'], 'じ': ['ji', 'zi'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
    'だ': ['da'], 'ぢ': ['di'], 'づ': ['du'], 'de': ['de'], 'ど': ['do'],
    'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
    'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
    'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
    'しゃ': ['sha', 'sya'], 'しゅ': ['shu', 'syu'], 'しょ': ['sho', 'syo'],
    'ちゃ': ['cha', 'tya'], 'ちゅ': ['chu', 'tyu'], 'ちょ': ['cho', 'tyo'],
    'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
    'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
    'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
    'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
    'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
    'じゃ': ['ja', 'jya', 'zya'], 'じゅ': ['ju', 'jyu', 'zyu'], 'じょ': ['jo', 'jyo', 'zyo'],
    'ぢゃ': ['dya'], 'ぢゅ': ['dyu'], 'ぢょ': ['dyo'],
    'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
    'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
    'ー': ['-']
};

// --- ゲームロジック ---

function getComboMultiplier(currentCombo) {
    if (currentCombo >= 50) return 2.5;
    if (currentCombo >= 30) return 2.0;
    if (currentCombo >= 20) return 1.5;
    if (currentCombo >= 10) return 1.2;
    return 1.0;
}

function generateFullRomajiDisplay(hiragana) {
    let result = '';
    for (let i = 0; i < hiragana.length; i++) {
        let chunk = hiragana.substring(i, i + 2);
        if (romajiMap[chunk]) {
            result += romajiMap[chunk][0]; i++; continue;
        }
        chunk = hiragana[i];
        if (chunk === 'っ') {
            if (i + 1 < hiragana.length) {
                let nextChunk = hiragana.substring(i + 1, i + 3);
                let nextRomaji = romajiMap[nextChunk]?.[0] || romajiMap[hiragana[i+1]]?.[0] || '';
                result += nextRomaji[0] || '';
            }
        } else if (chunk === 'ん') {
            const nextHira = hiragana[i+1];
            if (nextHira && 'あいうえおやゆよなにぬねの'.includes(nextHira)) result += 'n';
            result += 'n';
        } else {
             result += romajiMap[chunk]?.[0] || '';
        }
    }
    return result;
}

function updateRomajiDisplay() {
    romajiDisplay.innerHTML = '';
    const typedHiragana = currentQuestion.answer.slice(0, currentQuestion.answer.length - remainingHiragana.length);
    const typedFullRomaji = generateFullRomajiDisplay(typedHiragana);
    typedFullRomaji.split('').forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        span.className = 'typed';
        romajiDisplay.appendChild(span);
    });
    const guideText = pendingRomajiOptions[0] || '';
    guideText.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char;
        if (index < currentTypedRomaji.length) span.className = 'typed';
        romajiDisplay.appendChild(span);
    });
    
    // 残りの文字の表示（現在のチャンクを除いた部分）
    // ★修正: currentHiraChunkを使用
    const futureHiragana = remainingHiragana.substring(currentHiraChunk.length);
    const futureRomaji = generateFullRomajiDisplay(futureHiragana);
    futureRomaji.split('').forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        romajiDisplay.appendChild(span);
    });
}

// ★★★ 修正点：逆算ロジックを廃止し、記憶しておいたチャンク長を使用 ★★★
function completeChunk() {
    // 安全策：もしcurrentHiraChunkが空なら強制的に1文字進める
    const chunkLength = currentHiraChunk.length > 0 ? currentHiraChunk.length : 1;
    
    remainingHiragana = remainingHiragana.substring(chunkLength);
    
    // 単語が完了したかどうかをチェックして返す
    const isWordComplete = (remainingHiragana.length === 0);
    prepareNextChunk();
    return isWordComplete;
}
// ▲▲▲ ここまで ▲▲▲

function prepareNextChunk() {
    currentTypedRomaji = '';
    if (remainingHiragana.length === 0) {
        playSound(sounds.complete);
        combo++;
        if (combo > maxCombo) maxCombo = combo;

        comboDisplay.textContent = `${combo} Combo`;
        if (combo > 0 && combo % 10 === 0) {
             playSound(sounds.combo);
             comboDisplay.classList.add('combo-animation');
        } else {
             comboDisplay.classList.remove('combo-animation');
        }
        chooseNewQuestion();
        return;
    }
    
    // ★★★ 修正点：ここでチャンクを決定し、グローバル変数に保存する ★★★
    let chunk = remainingHiragana.substring(0, 2);
    if (!romajiMap[chunk]) chunk = remainingHiragana.substring(0, 1);
    
    // 特殊な「っ」と「ん」の処理
    if (chunk === 'っ') {
        let nextChunk = remainingHiragana.substring(1, 3);
        let nextOptions = romajiMap[nextChunk];
        if (!nextOptions) {
            nextChunk = remainingHiragana.substring(1, 2);
            nextOptions = romajiMap[nextChunk];
        }
        // 「っ」の次は子音を重ねる
        pendingRomajiOptions = nextOptions ? nextOptions.map(opt => opt[0]) : [];
    } else if (chunk === 'ん') {
        const nextHira = remainingHiragana[1];
        if (nextHira && 'あいうえおやゆよなにぬねの'.includes(nextHira)) {
            pendingRomajiOptions = ["nn", "n'"];
        } else {
            pendingRomajiOptions = ["n", "n'", "nn"];
        }
    } else {
        pendingRomajiOptions = [...(romajiMap[chunk] || [])];
    }
    
    // 決定したチャンクを保存
    currentHiraChunk = chunk;
    // ▲▲▲ ここまで ▲▲▲

    updateRomajiDisplay();
}

function chooseNewQuestion() {
    const randomIndex = Math.floor(Math.random() * allQuizData.length);
    currentQuestion = allQuizData[randomIndex];
    remainingHiragana = currentQuestion.answer;
    fullRomajiToDisplay = generateFullRomajiDisplay(currentQuestion.answer);
    kanjiDisplay.textContent = currentQuestion.question;
    hiraganaDisplay.textContent = currentQuestion.answer;
    prepareNextChunk();
}

function updateStats() {
    const elapsedMinutes = (timeLimit - currentGameTime) / 60;
    const kpm = elapsedMinutes > 0 ? Math.round((correctTyped / elapsedMinutes)) : 0;
    kpmDisplay.textContent = kpm;
    const accuracy = totalTyped > 0 ? Math.round((correctTyped / totalTyped) * 100) : 100;
    accuracyDisplay.textContent = `${accuracy}%`;
}

function handleKeyPress(e) {
    if(e.preventDefault) e.preventDefault();
    if (!isTimerActive) {
        isTimerActive = true;
        timerInterval = setInterval(() => {
            currentGameTime--;
            timerDisplay.textContent = currentGameTime;
            updateStats();
            if (currentGameTime <= 0) endGame();
        }, 1000);
    }
    const key = e.key.toLowerCase();
    if (!"abcdefghijklmnopqrstuvwxyz'-".includes(key)) return;
    totalTyped++;
    const nextTyped = currentTypedRomaji + key;
    const possibleOptions = pendingRomajiOptions.filter(opt => opt.startsWith(nextTyped));
    
    if (possibleOptions.length > 0) {
        playSound(sounds.type);
        correctTyped++;
        const comboMultiplier = getComboMultiplier(combo);
        score += Math.round(100 * comboMultiplier);
        scoreDisplay.textContent = `SCORE: ${score}`;
        currentTypedRomaji = nextTyped;
        pendingRomajiOptions = possibleOptions;
        if (possibleOptions.length === 1 && possibleOptions[0] === currentTypedRomaji) {
            completeChunk();
        }
    } else {
        // 「ん」の自動確定ロジック
        if (pendingRomajiOptions.includes(currentTypedRomaji)) {
            const isWordComplete = completeChunk();
            if (isWordComplete) {
                return; // 単語完了時は再帰呼び出ししない
            }
            handleKeyPress(e); // 次の文字として再判定
            return;
        }
        
        playSound(sounds.error);
        combo = 0;
        score -= 100;
        if (score < 0) score = 0;
        scoreDisplay.textContent = `SCORE: ${score}`;
        comboDisplay.textContent = '';
        wordContainer.classList.add('shake-animation');
        setTimeout(() => wordContainer.classList.remove('shake-animation'), 200);
    }
    updateRomajiDisplay();
    updateStats();
}

function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        if (confirm('ゲームを中断して選択画面に戻りますか？')) {
            returnToStartScreen();
        }
    }
}

function quickRetry() {
    clearInterval(timerInterval);
    timerInterval = null;
    document.removeEventListener('keydown', handleKeyPress);
    document.removeEventListener('keydown', handleEscapeKey);
    document.removeEventListener('keydown', handleTabKeyDown);
    document.removeEventListener('keyup', handleTabKeyUp);
    startGame(timeLimit);
}

function handleTabKeyDown(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        if (!tabPressTimer) {
            tabPressTimer = setTimeout(quickRetry, LONG_PRESS_DURATION);
        }
    }
}

function handleTabKeyUp(e) {
    if (e.key === 'Tab') {
        clearTimeout(tabPressTimer);
        tabPressTimer = null;
    }
}

function returnToStartScreen() {
    clearInterval(timerInterval);
    clearTimeout(tabPressTimer);
    tabPressTimer = null;
    document.removeEventListener('keydown', handleKeyPress);
    document.removeEventListener('keydown', handleEscapeKey);
    document.removeEventListener('keydown', handleTabKeyDown);
    document.removeEventListener('keyup', handleTabKeyUp);
    virtualKeyboard.classList.remove('visible');
    gameScreen.style.display = 'none';
    resultsScreen.style.display = 'none';
    startScreen.style.display = 'block';
}

function startGame(time) {
    // ★★★ 修正点：データ読み込み待ちのチェックを追加 ★★★
    if (!allQuizData || allQuizData.length === 0) {
        alert("問題データを読み込んでいます。少々お待ちください。");
        return;
    }
    // ▲▲▲ ここまで ▲▲▲

    timeLimit = time;
    currentGameTime = time;
    score = 0; combo = 0; maxCombo = 0;
    totalTyped = 0; correctTyped = 0;
    isTimerActive = false;
    
    // 前回のタイマーが残っていたら消す
    if (timerInterval) clearInterval(timerInterval);

    scoreDisplay.textContent = 'SCORE: 0';
    comboDisplay.textContent = '';
    highscoreDisplay.style.display = 'none';
    xpMessage.style.display = 'none';
    startScreen.style.display = 'none';
    resultsScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    virtualKeyboard.classList.add('visible');
    chooseNewQuestion();
    updateStats();
    timerDisplay.textContent = currentGameTime;
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('keydown', handleTabKeyDown);
    document.addEventListener('keyup', handleTabKeyUp);
}

function endGame() {
    clearInterval(timerInterval);
    timerInterval = null; // タイマーIDをクリア
    clearTimeout(tabPressTimer);
    tabPressTimer = null;
    document.removeEventListener('keydown', handleKeyPress);
    document.removeEventListener('keydown', handleEscapeKey);
    document.removeEventListener('keydown', handleTabKeyDown);
    document.removeEventListener('keyup', handleTabKeyUp);
    virtualKeyboard.classList.remove('visible');
    const finalScore = score;
    const finalKpm = timeLimit > 0 ? (correctTyped / timeLimit) * 60 : 0;
    const finalAccuracyRate = totalTyped > 0 ? correctTyped / totalTyped : 0;
    finalScoreDisplay.textContent = finalScore;
    maxComboDisplay.textContent = maxCombo;
    avgKpmDisplay.textContent = Math.round(finalKpm);
    finalAccuracyDisplay.textContent = `${Math.round(finalAccuracyRate * 100)}%`;
    gameScreen.style.display = 'none';
    resultsScreen.style.display = 'block';
    
    if (currentUser) {
        loggedInActions.style.display = 'block';
        guestScoreForm.style.display = 'none';
        currentUser.getIdToken(true).then(idToken => {
            socket.emit('submit-typing-score', {
                idToken: idToken,
                timeMode: timeLimit,
                score: finalScore
            });
        }).catch(error => console.error("IDトークンの取得に失敗:", error));
    } else {
        loggedInActions.style.display = 'none';
        guestScoreForm.style.display = 'block';
        
        // イベントリスナーの重複登録を防ぐため、onclickプロパティを使用
        submitGuestScoreBtn.onclick = () => {
            const name = guestNameInput.value.trim();
            if (name) {
                socket.emit('submit-guest-score', {
                    name: name,
                    score: finalScore,
                    timeMode: timeLimit,
                    mode: 'typing'
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

// --- イベントリスナー設定 ---
timeButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (button.disabled) return;
        const time = parseInt(button.dataset.time, 10);
        startGame(time);
    });
});

if (flickModeBtn) {
    flickModeBtn.addEventListener('click', () => {
        window.location.href = '/flick';
    });
}

playAgainBtn.addEventListener('click', () => {
    resultsScreen.style.display = 'none';
    startScreen.style.display = 'block';
});

virtualKeyboard.addEventListener('click', (e) => {
    if (e.target.classList.contains('key')) {
        handleKeyPress({ key: e.target.dataset.key, preventDefault: () => {} });
    }
});

auth.onAuthStateChanged(user => {
    if (user) currentUser = user;
});

socket.on('connect', () => {
    socket.emit('get-typing-data');
});

socket.on('typing-data', (data) => {
    allQuizData = data;
    timeButtons.forEach(b => {
        if (b.id !== 'flick-mode-btn') b.disabled = false;
    });
});

socket.on('typing-score-saved', ({ isNewHighscore, xpGained }) => {
    if (isNewHighscore) {
        highscoreDisplay.textContent = '🎉 ハイスコア更新！';
        highscoreDisplay.style.display = 'block';
    } else {
        highscoreDisplay.style.display = 'none';
    }
    if (xpGained > 0) {
        xpMessage.textContent = `+${xpGained} XP を獲得しました！`;
        xpMessage.style.display = 'block';
    } else {
        xpMessage.style.display = 'none';
    }
});
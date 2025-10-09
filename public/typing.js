// public/typing.js (バーチャルキーボード対応・全文)

// --- DOM要素の取得 ---
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const resultsScreen = document.getElementById('results-screen');
const timeButtons = document.querySelectorAll('.time-btn');

const timerDisplay = document.querySelector('#timer span');
const kpmDisplay = document.querySelector('#kpm span');
const accuracyDisplay = document.querySelector('#accuracy span');
const kanjiDisplay = document.getElementById('kanji-display');
const hiraganaDisplay = document.getElementById('hiragana-display');
const romajiDisplay = document.getElementById('romaji-display');
const scoreDisplay = document.getElementById('score-display');
const comboDisplay = document.getElementById('combo-display');
const wordContainer = document.getElementById('word-container');
const virtualKeyboard = document.getElementById('virtual-keyboard'); // キーボード要素を取得

const finalScoreDisplay = document.getElementById('final-score');
const maxComboDisplay = document.getElementById('max-combo');
const avgKpmDisplay = document.getElementById('avg-kpm');
const finalAccuracyDisplay = document.getElementById('final-accuracy');
const highscoreDisplay = document.getElementById('highscore-message');
const playAgainBtn = document.getElementById('play-again-btn');

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
let allQuizData = [];
let currentGameTime = 0;
let timeLimit = 0;
let timerInterval = null;
let isTimerActive = false;
let currentQuestion = null;
let remainingHiragana = '';
let pendingRomajiOptions = [];
let currentTypedRomaji = '';
let fullRomajiToDisplay = '';
let score = 0;
let combo = 0;
let maxCombo = 0;
let totalTyped = 0;
let correctTyped = 0;
const socket = io();
let currentUser = null;

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
    'だ': ['da'], 'ぢ': ['di'], 'づ': ['du'], 'で': ['de'], 'ど': ['do'],
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
    'ー': ['']
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
    let i = 0;
    while (i < hiragana.length) {
        let chunk = hiragana.substring(i, i + 2);
        if (romajiMap[chunk]) {
            result += romajiMap[chunk][0];
            i += 2;
        } else {
            chunk = hiragana[i];
            if (chunk === 'っ') {
                if (i + 1 < hiragana.length) {
                    let nextChunk = hiragana.substring(i + 1, i + 3);
                    let nextRomaji = romajiMap[nextChunk] ? romajiMap[nextChunk][0] : (romajiMap[hiragana[i+1]] ? romajiMap[hiragana[i+1]][0] : '');
                    result += nextRomaji[0] || '';
                }
            } else {
                 result += romajiMap[chunk] ? romajiMap[chunk][0] : '';
            }
            i++;
        }
    }
    return result;
}

function updateRomajiDisplay() {
    romajiDisplay.innerHTML = '';
    let typedRomajiLength = 0;

    const typedHiragana = currentQuestion.answer.slice(0, currentQuestion.answer.length - remainingHiragana.length);
    if(typedHiragana){
        const typedFullRomaji = generateFullRomajiDisplay(typedHiragana);
        typedFullRomaji.split('').forEach(char => {
            const span = document.createElement('span');
            span.textContent = char;
            span.className = 'typed';
            romajiDisplay.appendChild(span);
        });
        typedRomajiLength = typedFullRomaji.length;
    }

    if (currentTypedRomaji) {
        currentTypedRomaji.split('').forEach(char => {
            const span = document.createElement('span');
            span.textContent = char;
            span.className = 'typed';
            romajiDisplay.appendChild(span);
        });
    }

    const remainingRomajiToDisplay = fullRomajiToDisplay.substring(typedRomajiLength + currentTypedRomaji.length);
     remainingRomajiToDisplay.split('').forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        romajiDisplay.appendChild(span);
    });
}

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

    let chunk = remainingHiragana.substring(0, 2);
    if (!romajiMap[chunk]) {
        chunk = remainingHiragana.substring(0, 1);
    }
    
    if (chunk === 'っ') {
        let nextChunk = remainingHiragana.substring(1, 3);
        let nextOptions = romajiMap[nextChunk];
        if (!nextOptions) {
            nextChunk = remainingHiragana.substring(1, 2);
            nextOptions = romajiMap[nextChunk];
        }
        pendingRomajiOptions = nextOptions ? nextOptions.map(opt => opt[0]) : [];
    } else {
        pendingRomajiOptions = [...(romajiMap[chunk] || [])];
    }
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
            
            if (currentGameTime <= 0) {
                endGame();
            }
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

        if (possibleOptions.includes(currentTypedRomaji)) {
            let chunkLength = 1;
            if (remainingHiragana.startsWith('っ')) {
                chunkLength = 1;
            } else {
                for (const hira in romajiMap) {
                    if (romajiMap[hira].includes(currentTypedRomaji)) {
                        chunkLength = hira.length;
                        break;
                    }
                }
            }
            remainingHiragana = remainingHiragana.substring(chunkLength);
            prepareNextChunk();
        }
    } else {
        playSound(sounds.error);
        combo = 0;
        score -= 500;
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

function returnToStartScreen() {
    clearInterval(timerInterval);
    document.removeEventListener('keydown', handleKeyPress);
    document.removeEventListener('keydown', handleEscapeKey);
    virtualKeyboard.classList.remove('visible');
    gameScreen.style.display = 'none';
    resultsScreen.style.display = 'none';
    startScreen.style.display = 'block';
}

function startGame(time) {
    timeLimit = time;
    currentGameTime = time;
    score = 0;
    combo = 0;
    maxCombo = 0;
    totalTyped = 0;
    correctTyped = 0;
    isTimerActive = false;
    scoreDisplay.textContent = 'SCORE: 0';
    comboDisplay.textContent = '';

    startScreen.style.display = 'none';
    resultsScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    virtualKeyboard.classList.add('visible');

    chooseNewQuestion();
    updateStats();
    timerDisplay.textContent = currentGameTime;
    
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keydown', handleEscapeKey);
}

function endGame() {
    clearInterval(timerInterval);
    document.removeEventListener('keydown', handleKeyPress);
    document.removeEventListener('keydown', handleEscapeKey);
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
        currentUser.getIdToken(true).then(idToken => {
            socket.emit('submit-typing-score', {
                idToken: idToken,
                timeMode: timeLimit,
                score: finalScore
            });
        }).catch(error => {
            console.error("IDトークンの取得に失敗:", error);
        });
    }
}

// --- イベントリスナー設定 ---
timeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const time = parseInt(button.dataset.time, 10);
        startGame(time);
    });
});

playAgainBtn.addEventListener('click', () => {
    resultsScreen.style.display = 'none';
    startScreen.style.display = 'block';
});

virtualKeyboard.addEventListener('click', (e) => {
    if (e.target.classList.contains('key')) {
        const key = e.target.dataset.key;
        const fakeEvent = {
            key: key,
            preventDefault: () => {}
        };
        handleKeyPress(fakeEvent);
    }
});

// --- Socket.IO & Firebase ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
    }
});

socket.on('connect', () => {
    socket.emit('get-typing-data');
});

socket.on('typing-data', (data) => {
    allQuizData = data;
    timeButtons.forEach(b => b.disabled = false);
});

socket.on('typing-score-saved', ({ isNewHighscore }) => {
    if (isNewHighscore) {
        highscoreDisplay.textContent = '🎉 ハイスコア更新！';
        highscoreDisplay.style.display = 'block';
    } else {
        highscoreDisplay.style.display = 'none';
    }
});
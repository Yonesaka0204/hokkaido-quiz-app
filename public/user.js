const socket = io();
const uid = window.location.pathname.split('/')[2];

// DOM要素を取得
const usernameHeader = document.getElementById('username-header');
const userStatusDiv = document.getElementById('user-status');
const loadingMessage = document.getElementById('loading-message');
const levelDisplay = document.getElementById('level-display');
const ratingDisplay = document.getElementById('rating-display');
const totalCorrectDisplay = document.getElementById('total-correct-display');
const endlessDisplay = document.getElementById('endless-display');
const bioCard = document.getElementById('bio-card');
const bioDisplay = document.getElementById('bio-display');
const achievementsCard = document.getElementById('achievements-card');
const achRandomSelect = document.getElementById('ach-random-select');
const achRandomInput = document.getElementById('ach-random-input');
const countEasy = document.getElementById('count-easy');
const countNormal = document.getElementById('count-normal');
const countHard = document.getElementById('count-hard');
const countSuper = document.getElementById('count-super');
const countRandom = document.getElementById('count-random');

socket.on('connect', () => {
    if (uid) {
        socket.emit('get-user-profile', { uid });
    } else {
        loadingMessage.textContent = 'ユーザーが見つかりません。';
    }
});

socket.on('user-profile-data', ({ userData }) => {
    loadingMessage.style.display = 'none';

    usernameHeader.textContent = `${userData.username}のプロフィール`;

    levelDisplay.textContent = userData.level || 1;
    ratingDisplay.textContent = userData.rating || 1500;
    totalCorrectDisplay.textContent = userData.totalCorrect || 0;
    endlessDisplay.textContent = userData.endlessHighScore || 0;
    userStatusDiv.style.display = 'block';

    const bio = userData.bio || "自己紹介文は設定されていません。";
    bioDisplay.textContent = bio;
    bioCard.style.display = 'block';

    if (userData.achievements) {
        const achData = userData.achievements;
        achRandomSelect.textContent = achData.perfectRandomSelect ? '🏆 達成済み' : '未達成';
        achRandomInput.textContent = achData.perfectRandomInput ? '🏆 達成済み' : '未達成';

        // ★★★ ここから変更 ★★★
        const counts = achData.perfectCounts || {};

        // 達成回数を整形して表示するヘルパー関数
        const formatCountText = (difficultyKey) => {
            const countData = counts[difficultyKey];
            // 新しいデータ形式 (オブジェクト) の場合
            if (typeof countData === 'object' && countData !== null) {
                const selectCount = countData.select || 0;
                const inputCount = countData.input || 0;
                return `選択 ${selectCount}回 / 入力 ${inputCount}回`;
            }
            // 古いデータ形式 (数値) の場合
            if (typeof countData === 'number') {
                return `合計 ${countData}回`; // 古いデータは合計として表示
            }
            // データがない場合
            return `選択 0回 / 入力 0回`;
        };

        countEasy.textContent = formatCountText('EASY');
        countNormal.textContent = formatCountText('NORMAL');
        countHard.textContent = formatCountText('HARD');
        countSuper.textContent = formatCountText('SUPER');
        countRandom.textContent = formatCountText('RANDOM');
        // ★★★ ここまで変更 ★★★

        achievementsCard.style.display = 'block';
    }
});

socket.on('user-profile-error', ({ message }) => {
    loadingMessage.textContent = message;
});
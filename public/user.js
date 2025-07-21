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
        const counts = achData.perfectCounts || {};
        
        achRandomSelect.textContent = achData.perfectRandomSelect ? '🏆 達成済み' : '未達成';
        achRandomInput.textContent = achData.perfectRandomInput ? '🏆 達成済み' : '未達成';

        countEasy.textContent = (counts.EASY || 0) + ' 回';
        countNormal.textContent = (counts.NORMAL || 0) + ' 回';
        countHard.textContent = (counts.HARD || 0) + ' 回';
        countSuper.textContent = (counts.SUPER || 0) + ' 回';
        countRandom.textContent = (counts.RANDOM || 0) + ' 回';

        achievementsCard.style.display = 'block';
    }
});

socket.on('user-profile-error', ({ message }) => {
    loadingMessage.textContent = message;
});
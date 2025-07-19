const socket = io();

const levelList = document.getElementById('level-ranking-list');
const ratingList = document.getElementById('rating-ranking-list');

socket.on('connect', () => {
    levelList.innerHTML = '<li>読み込み中...</li>';
    ratingList.innerHTML = '<li>読み込み中...</li>';
    socket.emit('get-rankings');
});

socket.on('rankings-data', ({ levelRanking, ratingRanking }) => {
    levelList.innerHTML = '';
    ratingList.innerHTML = '';

    if (levelRanking.length === 0) {
        levelList.innerHTML = '<li>まだデータがありません。</li>';
    } else {
        levelRanking.forEach((user, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="rank-number">${index + 1}.</span>
                <span class="rank-name">${user.username}</span>
                <span class="rank-stat">Lv. ${user.level}</span>
            `;
            levelList.appendChild(li);
        });
    }

    if (ratingRanking.length === 0) {
        ratingList.innerHTML = '<li>まだデータがありません。</li>';
    } else {
        ratingRanking.forEach((user, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="rank-number">${index + 1}.</span>
                <span class="rank-name">${user.username}</span>
                <span class="rank-stat">R: ${user.rating}</span>
            `;
            ratingList.appendChild(li);
        });
    }
});

socket.on('rankings-error', (data) => {
    levelList.innerHTML = `<li>${data.message}</li>`;
    ratingList.innerHTML = `<li>${data.message}</li>`;
});
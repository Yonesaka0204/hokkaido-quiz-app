const socket = io();

const levelList = document.getElementById('level-ranking-list');
const ratingList = document.getElementById('rating-ranking-list');
const levelPagination = document.getElementById('level-pagination');
const ratingPagination = document.getElementById('rating-pagination');

let fullLevelRanking = [];
let fullRatingRanking = [];
const ITEMS_PER_PAGE = 10;

// --- 特定のリストとページを描画する関数 ---
function renderList(listElement, data, page, type) {
    listElement.innerHTML = '';
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = data.slice(start, end);

    if (pageItems.length === 0 && page === 1) {
        listElement.innerHTML = '<li>まだデータがありません。</li>';
        return;
    }

    pageItems.forEach((user, index) => {
        const rank = start + index + 1;
        const li = document.createElement('li');
        
        let statHtml = '';
        if (type === 'level') {
            statHtml = `<span class="rank-stat">Lv. ${user.level}</span>`;
        } else if (type === 'rating') {
            statHtml = `<span class="rank-stat">R: ${user.rating}</span>`;
        }

        li.innerHTML = `
            <span class="rank-number">${rank}.</span>
            <span class="rank-name">${user.username}</span>
            ${statHtml}
        `;
        listElement.appendChild(li);
    });
}

// --- ページネーションのボタンを描画する関数 ---
function renderPagination(paginationElement, totalItems, currentPage, onPageClick) {
    paginationElement.innerHTML = '';
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    if (totalPages <= 1) return; // 1ページしかない場合は表示しない

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.className = 'pagination-btn';
        button.textContent = i;
        if (i === currentPage) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => onPageClick(i));
        paginationElement.appendChild(button);
    }
}

// --- サーバーからデータを受け取った際のメイン処理 ---
socket.on('rankings-data', ({ levelRanking, ratingRanking }) => {
    fullLevelRanking = levelRanking;
    fullRatingRanking = ratingRanking;

    // レベルランキングのページクリック時の処理
    const handleLevelPageClick = (page) => {
        renderList(levelList, fullLevelRanking, page, 'level');
        renderPagination(levelPagination, fullLevelRanking.length, page, handleLevelPageClick);
    };
    
    // レートランキングのページクリック時の処理
    const handleRatingPageClick = (page) => {
        renderList(ratingList, fullRatingRanking, page, 'rating');
        renderPagination(ratingPagination, fullRatingRanking.length, page, handleRatingPageClick);
    };

    handleLevelPageClick(1); // 初回描画
    handleRatingPageClick(1); // 初回描画
});

socket.on('connect', () => {
    levelList.innerHTML = '<li>読み込み中...</li>';
    ratingList.innerHTML = '<li>読み込み中...</li>';
    socket.emit('get-rankings');
});

socket.on('rankings-error', (data) => {
    levelList.innerHTML = `<li>${data.message}</li>`;
    ratingList.innerHTML = `<li>${data.message}</li>`;
});
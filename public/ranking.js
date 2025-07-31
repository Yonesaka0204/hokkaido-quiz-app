const socket = io();

const levelList = document.getElementById('level-ranking-list');
const ratingList = document.getElementById('rating-ranking-list');
const correctList = document.getElementById('correct-ranking-list');
const endlessList = document.getElementById('endless-ranking-list');
const levelPagination = document.getElementById('level-pagination');
const ratingPagination = document.getElementById('rating-pagination');
const correctPagination = document.getElementById('correct-pagination');
const endlessPagination = document.getElementById('endless-pagination');

let fullLevelRanking = [];
let fullRatingRanking = [];
let fullCorrectRanking = [];
let fullEndlessRanking = [];
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
        } else if (type === 'correct') {
            statHtml = `<span class="rank-stat">${user.totalCorrect}問</span>`;
        } else if (type === 'endless') {
            statHtml = `<span class="rank-stat">${user.endlessHighScore}問</span>`;
        }
        
        // aタグでユーザープロフィールページへのリンクを作成
        li.innerHTML = `
            <span class="rank-number">${rank}.</span>
            <a href="/user/${user.uid}" class="rank-name" style="color: #333; text-decoration: none;">${user.username}</a>
            ${statHtml}
        `;
        listElement.appendChild(li);
    });
}

// --- ページネーションのボタンを描画する関数 (改善案1適用後) ---
function renderPagination(paginationElement, totalItems, currentPage, onPageClick) {
    paginationElement.innerHTML = '';
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    if (totalPages <= 1) return;

    // ヘルパー関数: ボタンを作成して追加する
    const createButton = (text, page, isDisabled = false, isActive = false) => {
        const button = document.createElement('button');
        button.className = 'pagination-btn';
        button.textContent = text;
        if (isActive) button.classList.add('active');
        if (isDisabled) {
            button.disabled = true;
        } else {
            button.addEventListener('click', () => onPageClick(page));
        }
        paginationElement.appendChild(button);
    };

    // ヘルパー関数: 省略記号を作成して追加する
    const createEllipsis = () => {
        const span = document.createElement('span');
        span.className = 'pagination-ellipsis';
        span.textContent = '...';
        span.style.padding = '0.5rem 0.75rem';
        span.style.alignSelf = 'center';
        paginationElement.appendChild(span);
    };

    // 「前へ」ボタン
    createButton('« 前へ', currentPage - 1, currentPage === 1);

    // 表示するページ番号を決定する
    const pageNumbersToShow = new Set();
    pageNumbersToShow.add(1); // 最初のページ
    pageNumbersToShow.add(totalPages); // 最後のページ
    pageNumbersToShow.add(currentPage); // 現在のページ
    if (currentPage > 1) pageNumbersToShow.add(currentPage - 1); // 現在の前
    if (currentPage < totalPages) pageNumbersToShow.add(currentPage + 1); // 現在の次

    const sortedPages = Array.from(pageNumbersToShow).sort((a, b) => a - b);
    
    let lastPage = 0;
    for (const page of sortedPages) {
        if (page > lastPage + 1) {
            // ページ番号が飛んでいる場合、省略記号を追加
            createEllipsis();
        }
        if (page >= 1 && page <= totalPages) {
            createButton(page, page, false, page === currentPage);
        }
        lastPage = page;
    }

    // 「次へ」ボタン
    createButton('次へ »', currentPage + 1, currentPage === totalPages);
}


// --- サーバーからデータを受け取った際のメイン処理 ---
socket.on('rankings-data', ({ levelRanking, ratingRanking, correctRanking, endlessRanking }) => {
    fullLevelRanking = levelRanking;
    fullRatingRanking = ratingRanking;
    fullCorrectRanking = correctRanking;
    fullEndlessRanking = endlessRanking;

    const handleLevelPageClick = (page) => {
        renderList(levelList, fullLevelRanking, page, 'level');
        renderPagination(levelPagination, fullLevelRanking.length, page, handleLevelPageClick);
    };
    
    const handleRatingPageClick = (page) => {
        renderList(ratingList, fullRatingRanking, page, 'rating');
        renderPagination(ratingPagination, fullRatingRanking.length, page, handleRatingPageClick);
    };

    const handleCorrectPageClick = (page) => {
        renderList(correctList, fullCorrectRanking, page, 'correct');
        renderPagination(correctPagination, fullCorrectRanking.length, page, handleCorrectPageClick);
    };

    const handleEndlessPageClick = (page) => {
        renderList(endlessList, fullEndlessRanking, page, 'endless');
        renderPagination(endlessPagination, fullEndlessRanking.length, page, handleEndlessPageClick);
    };

    handleLevelPageClick(1);
    handleRatingPageClick(1);
    handleCorrectPageClick(1);
    handleEndlessPageClick(1);
});

socket.on('connect', () => {
    levelList.innerHTML = '<li>読み込み中...</li>';
    ratingList.innerHTML = '<li>読み込み中...</li>';
    correctList.innerHTML = '<li>読み込み中...</li>';
    endlessList.innerHTML = '<li>読み込み中...</li>';
    socket.emit('get-rankings');
});

socket.on('rankings-error', (data) => {
    levelList.innerHTML = `<li>${data.message}</li>`;
    ratingList.innerHTML = `<li>${data.message}</li>`;
    correctList.innerHTML = `<li>${data.message}</li>`;
    endlessList.innerHTML = `<li>${data.message}</li>`;
});
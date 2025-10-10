// public/ranking.js

const socket = io();

// 既存のランキング要素
const levelList = document.getElementById('level-ranking-list');
const ratingList = document.getElementById('rating-ranking-list');
const correctList = document.getElementById('correct-ranking-list');
const endlessList = document.getElementById('endless-ranking-list');
const levelPagination = document.getElementById('level-pagination');
const ratingPagination = document.getElementById('rating-pagination');
const correctPagination = document.getElementById('correct-pagination');
const endlessPagination = document.getElementById('endless-pagination');

// タイピングランキングの要素
const typing60sList = document.getElementById('typing-60s-list');
const typing120sList = document.getElementById('typing-120s-list');
const typing180sList = document.getElementById('typing-180s-list');
const typing60sPagination = document.getElementById('typing-60s-pagination');
const typing120sPagination = document.getElementById('typing-120s-pagination');
const typing180sPagination = document.getElementById('typing-180s-pagination');

// フリックランキングの要素
const flickList = document.getElementById('flick-ranking-list');
const flickPagination = document.getElementById('flick-pagination');

// データ保持用変数
let fullLevelRanking = [], fullRatingRanking = [], fullCorrectRanking = [], fullEndlessRanking = [];
let fullTyping60sRanking = [], fullTyping120sRanking = [], fullTyping180sRanking = [];
let fullFlickRanking = [];

const ITEMS_PER_PAGE = 10;

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
        if (type === 'level') statHtml = `<span class="rank-stat">Lv. ${user.level}</span>`;
        else if (type === 'rating') statHtml = `<span class="rank-stat">R: ${user.rating}</span>`;
        else if (type === 'correct') statHtml = `<span class="rank-stat">${user.totalCorrect}問</span>`;
        else if (type === 'endless') statHtml = `<span class="rank-stat">${user.endlessHighScore}問</span>`;
        else if (type === 'typing' || type === 'flick') {
            statHtml = `<span class="rank-stat">${(user.score || 0).toLocaleString()}</span>`;
        }

        li.innerHTML = `
            <span class="rank-number">${rank}.</span>
            <a href="/user/${user.uid}" class="rank-name">${user.username}</a>
            ${statHtml}
        `;
        listElement.appendChild(li);
    });
}

function renderPagination(paginationElement, totalItems, currentPage, onPageClick) {
    paginationElement.innerHTML = '';
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return;

    const createButton = (text, page, isDisabled = false, isActive = false) => {
        const button = document.createElement('button');
        button.className = 'pagination-btn';
        button.textContent = text;
        if (isActive) button.classList.add('active');
        if (isDisabled) button.disabled = true;
        else button.addEventListener('click', () => onPageClick(page));
        paginationElement.appendChild(button);
    };

    const createEllipsis = () => {
        const span = document.createElement('span');
        span.className = 'pagination-ellipsis';
        span.textContent = '...';
        paginationElement.appendChild(span);
    };

    createButton('<', currentPage - 1, currentPage === 1);
    const pageNumbersToShow = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
    const sortedPages = Array.from(pageNumbersToShow).sort((a, b) => a - b);
    let lastPage = 0;
    for (const page of sortedPages) {
        if (page > lastPage + 1) createEllipsis();
        if (page >= 1 && page <= totalPages) {
            createButton(page, page, false, page === currentPage);
        }
        lastPage = page;
    }
    createButton('>', currentPage + 1, currentPage === totalPages);
}

socket.on('rankings-data', (data) => {
    fullLevelRanking = data.levelRanking || [];
    fullRatingRanking = data.ratingRanking || [];
    fullCorrectRanking = data.correctRanking || [];
    fullEndlessRanking = data.endlessRanking || [];
    fullTyping60sRanking = data.typing60sRanking || [];
    fullTyping120sRanking = data.typing120sRanking || [];
    fullTyping180sRanking = data.typing180sRanking || [];
    fullFlickRanking = data.flickRanking || [];

    const createHandler = (listEl, data, paginationEl, type) => (page) => {
        renderList(listEl, data, page, type);
        renderPagination(paginationEl, data.length, page, createHandler(listEl, data, paginationEl, type));
    };

    createHandler(levelList, fullLevelRanking, levelPagination, 'level')(1);
    createHandler(ratingList, fullRatingRanking, ratingPagination, 'rating')(1);
    createHandler(correctList, fullCorrectRanking, correctPagination, 'correct')(1);
    createHandler(endlessList, fullEndlessRanking, endlessPagination, 'endless')(1);
    createHandler(typing60sList, fullTyping60sRanking, typing60sPagination, 'typing')(1);
    createHandler(typing120sList, fullTyping120sRanking, typing120sPagination, 'typing')(1);
    createHandler(typing180sList, fullTyping180sRanking, typing180sPagination, 'typing')(1);
    createHandler(flickList, fullFlickRanking, flickPagination, 'flick')(1);
});

socket.on('connect', () => {
    const loadingLi = '<li>読み込み中...</li>';
    [levelList, ratingList, correctList, endlessList, typing60sList, typing120sList, typing180sList, flickList].forEach(list => {
        if(list) list.innerHTML = loadingLi;
    });
    socket.emit('get-rankings');
});

socket.on('rankings-error', (data) => {
    const errorLi = `<li>${data.message}</li>`;
    [levelList, ratingList, correctList, endlessList, typing60sList, typing120sList, typing180sList, flickList].forEach(list => {
        if(list) list.innerHTML = errorLi;
    });
});
// public/results.js

(() => {
    const resultsList = document.getElementById('results-list');
    const finalResults = JSON.parse(sessionStorage.getItem('finalResults'));

    if (finalResults) {
        finalResults.forEach(result => {
            const li = document.createElement('li');
            li.style.fontSize = "1.2rem";
            li.style.marginBottom = "0.5rem";
            li.textContent = `${result.name}: ${result.score}問正解`;
            resultsList.appendChild(li);
        });
    } else {
        resultsList.innerHTML = '<li>結果の表示に失敗しました。再挑戦リンクから部屋に戻ってください。</li>';
    }
    // 不要になったセッションストレージのデータを削除
    sessionStorage.removeItem('finalResults');
    sessionStorage.removeItem('guestName');

    const pathParts = window.location.pathname.split('/');
    const roomId = pathParts[2];
    const backLink = document.getElementById('back-to-room-link');

    if (backLink) {
        if (roomId) {
            backLink.href = `/room/${roomId}`;
        } else {
            backLink.style.display = 'none';
        }
    }
})();
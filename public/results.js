// public/results.js

(() => {
    const resultsList = document.getElementById('results-list');
    const finalResults = JSON.parse(sessionStorage.getItem('finalResults'));

    // ★★★ ここから追加 ★★★
    // 数値をカウントアップさせるアニメーション関数
    const animateCountUp = (element, endValue, name) => {
        let current = 0;
        const duration = 1000; // アニメーション時間 (1秒)
        const stepTime = 20; // 更新間隔 (ミリ秒)
        const totalSteps = duration / stepTime;
        const increment = Math.max(Math.ceil(endValue / totalSteps), 1); // 1ステップあたりの増加量

        const timer = setInterval(() => {
            current += increment;
            if (current >= endValue) {
                current = endValue;
                clearInterval(timer);
            }
            element.textContent = `${name}: ${current}問正解`;
        }, stepTime);
    };
    // ★★★ ここまで追加 ★★★

    if (finalResults) {
        finalResults.forEach(result => {
            const li = document.createElement('li');
            li.style.fontSize = "1.2rem";
            li.style.marginBottom = "0.5rem";
            li.textContent = `${result.name}: 0問正解`; // 初期値を0で表示
            resultsList.appendChild(li);
            
            // ★変更★ アニメーション関数を呼び出す
            animateCountUp(li, result.score, result.name);
        });
    } else {
        resultsList.innerHTML = '<li>結果の表示に失敗しました。再挑戦リンクから部屋に戻ってください。</li>';
    }
    
    // 不要になったセッションストレージのデータを削除
    sessionStorage.removeItem('finalResults');
    // sessionStorage.removeItem('guestName'); // ゲスト名は部屋に戻る際に必要なので削除しない

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
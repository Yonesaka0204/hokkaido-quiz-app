// public/index.js

// --- DOM要素を取得 ---
const loggedInView = document.getElementById('logged-in-view');
const loggedOutView = document.getElementById('logged-out-view');
const usernameDisplay = document.getElementById('username-display');
const levelDisplay = document.getElementById('level-display');
const xpDisplay = document.getElementById('xp-display');
const logoutBtn = document.getElementById('logout-btn');

// ログイン後メニューの要素
const loggedInMenu = document.getElementById('logged-in-menu');
const singlePlayBtn = document.getElementById('single-play-btn');
const multiPlayBtn = document.getElementById('multi-play-btn');

// マルチプレイ用フォームの要素
const multiplayerJoinForm = document.getElementById('multiplayer-join-form');
const roomIdInputMulti = document.getElementById('room-id-input-multi');

// ゲスト用フォームの要素
const joinRoomFormGuest = document.getElementById('join-room-form-guest');

// --- ユーティリティ関数 ---

// 通知を表示する関数
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--hokkaido-grass)' : type === 'error' ? '#dc2626' : 'var(--hokkaido-light-blue)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 25px var(--hokkaido-shadow);
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        font-weight: 500;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // アニメーションで表示
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 3秒後に自動削除
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// ボタンにローディング状態を追加する関数
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<span class="loading" style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: white; animation: spin 1s ease-in-out infinite; display: inline-block; margin-right: 0.5rem;"></span>読み込み中...';
    } else {
        button.disabled = false;
        // 元のテキストを復元（ボタンごとに異なる）
        if (button.id === 'single-play-btn') {
            button.innerHTML = '🎯 シングルプレイ';
        } else if (button.id === 'multi-play-btn') {
            button.innerHTML = '👥 マルチプレイ';
        } else if (button.id === 'logout-btn') {
            button.innerHTML = '🚪 ログアウト';
        }
    }
}

// 入力フィールドのバリデーション
function validateInput(input, minLength = 1) {
    const value = input.value.trim();
    if (value.length < minLength) {
        input.style.borderColor = '#dc2626';
        input.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.1)';
        return false;
    } else {
        input.style.borderColor = 'var(--hokkaido-border)';
        input.style.boxShadow = 'none';
        return true;
    }
}

// --- ログイン状態の監視 ---
auth.onAuthStateChanged(user => {
    if (user) {
        // アニメーション付きで表示切り替え
        loggedOutView.style.opacity = '0';
        loggedOutView.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            loggedOutView.style.display = 'none';
            loggedInView.style.display = 'block';
            loggedInView.style.opacity = '0';
            loggedInView.style.transform = 'translateY(20px)';
            setTimeout(() => {
                loggedInView.style.opacity = '1';
                loggedInView.style.transform = 'translateY(0)';
            }, 50);
        }, 300);

        // ユーザー情報を取得
        db.collection("users").doc(user.uid).get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                usernameDisplay.textContent = userData.username;
                levelDisplay.textContent = userData.level || 1;
                xpDisplay.textContent = userData.xp || 0;
                
                // レベルアップエフェクト（初回ログイン時）
                if (sessionStorage.getItem('justLoggedIn') === 'true') {
                    levelDisplay.classList.add('level-up-pop');
                    setTimeout(() => {
                        levelDisplay.classList.remove('level-up-pop');
                    }, 500);
                    sessionStorage.removeItem('justLoggedIn');
                }
            }
        }).catch(e => {
            console.error("ユーザー情報の取得に失敗:", e);
            showNotification('ユーザー情報の取得に失敗しました', 'error');
        });
    } else {
        // アニメーション付きで表示切り替え
        loggedInView.style.opacity = '0';
        loggedInView.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            loggedInView.style.display = 'none';
            loggedOutView.style.display = 'block';
            loggedOutView.style.opacity = '0';
            loggedOutView.style.transform = 'translateY(20px)';
            setTimeout(() => {
                loggedOutView.style.opacity = '1';
                loggedOutView.style.transform = 'translateY(0)';
            }, 50);
        }, 300);
    }
});

// --- イベントリスナー ---

// ログアウトボタン
logoutBtn.addEventListener('click', async () => {
    setButtonLoading(logoutBtn, true);
    try {
        await auth.signOut();
        showNotification('ログアウトしました', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        console.error('ログアウトエラー:', error);
        showNotification('ログアウトに失敗しました', 'error');
        setButtonLoading(logoutBtn, false);
    }
});

// シングルプレイボタン
singlePlayBtn.addEventListener('click', () => {
    setButtonLoading(singlePlayBtn, true);
    
    // ランダムなルームIDを生成
    const roomId = 'quiz' + Math.random().toString(36).substring(2, 10);
    
    // シングルプレイであることをセッションストレージに記録
    sessionStorage.setItem('isSinglePlayer', 'true');
    
    showNotification('シングルプレイを開始します...', 'success');
    
    setTimeout(() => {
        window.location.href = `/room/${roomId}`;
    }, 500);
});

// マルチプレイボタン
multiPlayBtn.addEventListener('click', () => {
    // アニメーション付きでフォーム表示
    loggedInMenu.style.opacity = '0';
    loggedInMenu.style.transform = 'translateY(-20px)';
    setTimeout(() => {
        loggedInMenu.style.display = 'none';
        multiplayerJoinForm.style.display = 'block';
        multiplayerJoinForm.style.opacity = '0';
        multiplayerJoinForm.style.transform = 'translateY(20px)';
        setTimeout(() => {
            multiplayerJoinForm.style.opacity = '1';
            multiplayerJoinForm.style.transform = 'translateY(0)';
            roomIdInputMulti.focus();
        }, 50);
    }, 300);
});

// マルチプレイフォームの送信
multiplayerJoinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const roomId = roomIdInputMulti.value.trim();
    
    if (!validateInput(roomIdInputMulti, 1)) {
        showNotification('部屋IDを入力してください', 'error');
        return;
    }
    
    const submitBtn = multiplayerJoinForm.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    
    try {
        // シングルプレイの記録を削除
        sessionStorage.removeItem('isSinglePlayer');
        showNotification('部屋に参加します...', 'success');
        
        setTimeout(() => {
            window.location.href = `/room/${roomId}`;
        }, 500);
    } catch (error) {
        console.error('部屋参加エラー:', error);
        showNotification('部屋への参加に失敗しました', 'error');
        setButtonLoading(submitBtn, false);
    }
});

// ゲストフォームの送信
joinRoomFormGuest.addEventListener('submit', async (e) => {
    e.preventDefault();
    const guestName = document.getElementById('guest-name-input').value.trim();
    const roomId = document.getElementById('room-id-input-guest').value.trim();
    
    // バリデーション
    if (!validateInput(document.getElementById('guest-name-input'), 1)) {
        showNotification('ゲスト名を入力してください', 'error');
        return;
    }
    
    if (!validateInput(document.getElementById('room-id-input-guest'), 1)) {
        showNotification('部屋IDを入力してください', 'error');
        return;
    }
    
    const submitBtn = joinRoomFormGuest.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    
    try {
        sessionStorage.setItem('guestName', guestName);
        // シングルプレイの記録を削除
        sessionStorage.removeItem('isSinglePlayer');
        showNotification('ゲストとして参加します...', 'success');
        
        setTimeout(() => {
            window.location.href = `/room/${roomId}`;
        }, 500);
    } catch (error) {
        console.error('ゲスト参加エラー:', error);
        showNotification('ゲスト参加に失敗しました', 'error');
        setButtonLoading(submitBtn, false);
    }
});

// 入力フィールドのリアルタイムバリデーション
roomIdInputMulti.addEventListener('input', () => {
    validateInput(roomIdInputMulti, 1);
});

document.getElementById('guest-name-input').addEventListener('input', () => {
    validateInput(document.getElementById('guest-name-input'), 1);
});

document.getElementById('room-id-input-guest').addEventListener('input', () => {
    validateInput(document.getElementById('room-id-input-guest'), 1);
});

// ページ読み込み時のアニメーション
document.addEventListener('DOMContentLoaded', () => {
    // 初回ログインの場合はフラグを設定
    if (auth.currentUser) {
        sessionStorage.setItem('justLoggedIn', 'true');
    }
    
    // ページ要素の初期アニメーション
    const container = document.querySelector('.container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 100);
});

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter でフォーカスされているフォームを送信
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.form) {
            activeElement.form.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape キーでマルチプレイフォームを閉じる
    if (e.key === 'Escape' && multiplayerJoinForm.style.display === 'block') {
        loggedInMenu.style.display = 'block';
        multiplayerJoinForm.style.display = 'none';
    }
});
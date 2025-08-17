// public/auth.js

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
        button.innerHTML = '<span class="loading" style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: white; animation: spin 1s ease-in-out infinite; display: inline-block; margin-right: 0.5rem;"></span>処理中...';
    } else {
        button.disabled = false;
        // 元のテキストを復元
        if (button.type === 'submit') {
            if (button.closest('#signup-form')) {
                button.innerHTML = '🎉 アカウントを作成';
            } else if (button.closest('#login-form')) {
                button.innerHTML = '🚀 ログイン';
            }
        }
    }
}

// 入力フィールドのバリデーション
function validateInput(input, type = 'text') {
    const value = input.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    switch (type) {
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            isValid = emailRegex.test(value);
            errorMessage = '有効なメールアドレスを入力してください';
            break;
        case 'password':
            isValid = value.length >= 6;
            errorMessage = 'パスワードは6文字以上で入力してください';
            break;
        case 'username':
            isValid = value.length >= 2;
            errorMessage = 'ユーザー名は2文字以上で入力してください';
            break;
        default:
            isValid = value.length > 0;
            errorMessage = 'この項目は必須です';
    }
    
    if (!isValid) {
        input.style.borderColor = '#dc2626';
        input.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.1)';
        // エラーメッセージを表示
        let errorElement = input.parentNode.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.style.cssText = `
                color: #dc2626;
                font-size: 0.85rem;
                margin-top: 0.25rem;
                font-weight: 500;
            `;
            input.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = errorMessage;
    } else {
        input.style.borderColor = 'var(--hokkaido-border)';
        input.style.boxShadow = 'none';
        // エラーメッセージを削除
        const errorElement = input.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    return isValid;
}

// 汎用的なエラー表示関数
function showAuthError(error) {
    console.error("認証エラー:", error);
    let message = '認証に失敗しました。';
    
    switch (error.code) {
        case 'auth/weak-password':
            message = 'パスワードが弱すぎます。6文字以上のパスワードを設定してください。';
            break;
        case 'auth/invalid-email':
            message = '無効なメールアドレスです。';
            break;
        case 'auth/operation-not-allowed':
            message = 'この操作は許可されていません。';
            break;
        case 'auth/too-many-requests':
            message = 'リクエストが多すぎます。しばらく待ってから再試行してください。';
            break;
        case 'auth/network-request-failed':
            message = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
            break;
        default:
            message = '認証に失敗しました。入力内容を確認して再試行してください。';
    }
    
    showNotification(message, 'error');
}

// --- 新規登録ページのロジック ---
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    // リアルタイムバリデーション
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    usernameInput.addEventListener('input', () => validateInput(usernameInput, 'username'));
    emailInput.addEventListener('input', () => validateInput(emailInput, 'email'));
    passwordInput.addEventListener('input', () => validateInput(passwordInput, 'password'));
    
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // バリデーション
        const isUsernameValid = validateInput(usernameInput, 'username');
        const isEmailValid = validateInput(emailInput, 'email');
        const isPasswordValid = validateInput(passwordInput, 'password');
        
        if (!isUsernameValid || !isEmailValid || !isPasswordValid) {
            showNotification('入力内容を確認してください', 'error');
            return;
        }
        
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        setButtonLoading(submitBtn, true);
        
        try {
            // ユーザー作成
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // 初期ユーザーデータ
            const initialUserData = {
                username: username,
                level: 1,
                xp: 0,
                rating: 1500,
                totalCorrect: 0,
                endlessHighScore: 0,
                bio: "",
                collection: {},
                achievements: {
                    perfectRandomSelect: false,
                    perfectRandomInput: false,
                    perfectCounts: {
                        EASY: { "select": 0, "input": 0 },
                        NORMAL: { "select": 0, "input": 0 },
                        HARD: { "select": 0, "input": 0 },
                        SUPER: { "select": 0, "input": 0 },
                        RANDOM: { "select": 0, "input": 0 }
                    }
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Firestoreへの書き込み
            await db.collection("users").doc(user.uid).set(initialUserData);
            
            showNotification('アカウントが作成されました！', 'success');
            
            // 初回ログインフラグを設定
            sessionStorage.setItem('justLoggedIn', 'true');
            
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            
        } catch (error) {
            console.error("新規登録処理中にエラーが発生しました:", error);
            
            if (error.code === 'auth/email-already-in-use') {
                showNotification('このメールアドレスは既に使用されています', 'error');
            } else {
                showAuthError(error);
            }
            
            setButtonLoading(submitBtn, false);
        }
    });
}

// --- ログインページのロジック ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    // リアルタイムバリデーション
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    emailInput.addEventListener('input', () => validateInput(emailInput, 'email'));
    passwordInput.addEventListener('input', () => validateInput(passwordInput, 'password'));
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // バリデーション
        const isEmailValid = validateInput(emailInput, 'email');
        const isPasswordValid = validateInput(passwordInput, 'password');
        
        if (!isEmailValid || !isPasswordValid) {
            showNotification('入力内容を確認してください', 'error');
            return;
        }
        
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        setButtonLoading(submitBtn, true);
        
        try {
            // Firebaseの認証機能を使ってログイン
            await auth.signInWithEmailAndPassword(email, password);
            
            showNotification('ログインしました！', 'success');
            
            // 初回ログインフラグを設定
            sessionStorage.setItem('justLoggedIn', 'true');
            
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
            
        } catch (error) {
            console.error("ログインエラー:", error);
            
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                showNotification('メールアドレスまたはパスワードが間違っています', 'error');
            } else {
                showAuthError(error);
            }
            
            setButtonLoading(submitBtn, false);
        }
    });
}

// --- パスワードリセットのロジック ---
const forgotPasswordLink = document.getElementById('forgot-password-link');
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = prompt('パスワードをリセットしたいメールアドレスを入力してください。');
        if (!email) return;
        
        // メールアドレスのバリデーション
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showNotification('有効なメールアドレスを入力してください', 'error');
            return;
        }
        
        try {
            await auth.sendPasswordResetEmail(email);
            showNotification('パスワードリセット用のメールを送信しました。受信トレイを確認してください。', 'success');
        } catch (error) {
            console.error("パスワードリセットエラー:", error);
            
            if (error.code === 'auth/user-not-found') {
                showNotification('このメールアドレスは登録されていません', 'error');
            } else {
                showNotification('メールの送信に失敗しました。アドレスを確認して再度お試しください。', 'error');
            }
        }
    });
}

// --- ページ読み込み時のアニメーション ---
document.addEventListener('DOMContentLoaded', () => {
    // フォーム要素の初期アニメーション
    const form = document.querySelector('form');
    if (form) {
        form.style.opacity = '0';
        form.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            form.style.opacity = '1';
            form.style.transform = 'translateY(0)';
        }, 200);
    }
    
    // 入力フィールドのフォーカス効果
    const inputs = document.querySelectorAll('.auth-input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.style.transform = 'scale(1.02)';
        });
        
        input.addEventListener('blur', () => {
            input.style.transform = 'scale(1)';
        });
    });
});

// --- キーボードショートカット ---
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter でフォーカスされているフォームを送信
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.form) {
            activeElement.form.dispatchEvent(new Event('submit'));
        }
    }
});
// ★★★ firebaseConfigとinitializeAppの行を削除しました ★★★
// (これらの処理は新しいfirebase-config.jsに集約されます)

function showAuthError(error) {
    console.error("Authentication Error:", error.code, error.message);
    alert(`エラー (${error.code}): ${error.message.split('(')[0]}`);
}

// --- 新規登録ページのロジック ---
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!username) {
            alert('ユーザー名を入力してください。');
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                // 'db'はfirebase-config.jsで定義されたグローバル変数を使用
                return db.collection("users").doc(user.uid).set({
                    username: username,
                    level: 1,
                    xp: 0,
                    rating: 1500,
                    totalCorrect: 0,
                    endlessHighScore: 0,
                    bio: "",
                    achievements: {
                        perfectRandomSelect: false,
                        perfectRandomInput: false,
                        perfectCounts: {
                            EASY: 0,
                            NORMAL: 0,
                            HARD: 0,
                            SUPER: 0,
                            RANDOM: 0
                        }
                    },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                alert('登録が完了しました！トップページに戻ります。');
                window.location.href = '/';
            })
            .catch(showAuthError);
    });
}

// --- ログインページのロジック ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // 'auth'はfirebase-config.jsで定義されたグローバル変数を使用
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                alert('ログインしました！');
                window.location.href = '/';
            })
            .catch(error => {
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    alert('メールアドレスかパスワードが間違っています。');
                } else {
                    showAuthError(error);
                }
            });
    });
}

// --- パスワードリセットのロジック ---
const forgotPasswordLink = document.getElementById('forgot-password-link');
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        const email = prompt("パスワードをリセットしたいアカウントのメールアドレスを入力してください。");
        
        if (email) {
            auth.sendPasswordResetEmail(email)
                .then(() => {
                    alert("パスワード再設定用のメールを送信しました。メールボックスを確認してください。");
                })
                .catch((error) => {
                    showAuthError(error);
                });
        }
    });
}
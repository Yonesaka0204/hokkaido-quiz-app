// public/auth.js

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

        // 'auth'はfirebase-config.jsで定義されたグローバル変数を使用
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                // 'db'はfirebase-config.jsで定義されたグローバル変数を使用
                const initialUserData = {
                    username: username,
                    level: 1,
                    xp: 0,
                    rating: 1500,
                    totalCorrect: 0,
                    endlessHighScore: 0,
                    bio: "",
                    collection: {}, // 空のコレクションオブジェクトを追加
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
                
                // Firestoreへの書き込み処理を返す
                return db.collection("users").doc(user.uid).set(initialUserData);
            })
            .then(() => {
                // このthenブロックはFirestoreへの書き込みが成功した後に実行される
                alert('登録が完了しました！トップページに移動します。');
                window.location.href = '/';
            })
            .catch((error) => {
                // エラー内容をコンソールに詳しく出力してデバッグしやすくする
                console.error("新規登録処理中にエラーが発生しました:", error);
                
                // ユーザーには汎用的なエラーメッセージを表示
                if (error.code === 'auth/email-already-in-use') {
                    alert('このメールアドレスは既に使用されています。');
                } else {
                    // 汎用的なエラー表示関数を呼び出す
                    showAuthError(error);
                }
            });
    });
}

// public/auth.js の末尾に追記

// --- ログインページのロジック ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Firebaseの認証機能を使ってログイン
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // ログイン成功
                alert('ログインしました！');
                window.location.href = '/'; // トップページにリダイレクト
            })
            .catch((error) => {
                // ログイン失敗
                console.error("ログインエラー:", error);
                // エラーコードに応じて、より具体的なメッセージを表示
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    alert('メールアドレスまたはパスワードが間違っています。');
                } else {
                    alert('ログインに失敗しました。');
                }
            });
    });
}

// --- パスワードリセットのロジック ---
const forgotPasswordLink = document.getElementById('forgot-password-link');
if(forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        const email = prompt('パスワードをリセットしたいメールアドレスを入力してください。');
        if (email) {
            auth.sendPasswordResetEmail(email)
                .then(() => {
                    alert('パスワードリセット用のメールを送信しました。受信トレイを確認してください。');
                })
                .catch((error) => {
                    console.error("パスワードリセットエラー:", error);
                    alert('メールの送信に失敗しました。アドレスを確認して再度お試しください。');
                });
        }
    });
}
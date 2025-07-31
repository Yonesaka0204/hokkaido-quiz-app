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
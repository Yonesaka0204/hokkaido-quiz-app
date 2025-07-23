// Firebaseプロジェクトの設定
const firebaseConfig = {
    apiKey: "AIzaSyDt92CKIkB48Bf6gXAlaeZYF7uNwT6gEp4",
    authDomain: "quizhokkaido.firebaseapp.com",
    projectId: "quizhokkaido",
    storageBucket: "quizhokkaido.firebasestorage.app",
    messagingSenderId: "570677049102",
    appId: "1:570677049102:web:d66b9d3a1e525d2428c95f",
    measurementId: "G-QZJDP1DB32"
};

// Firebaseを初期化
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// DOM要素を取得
const userStatusDiv = document.getElementById('user-status');
const loadingMessage = document.getElementById('loading-message');
const usernameDisplay = document.getElementById('username-display');
const levelDisplay = document.getElementById('level-display');
const ratingDisplay = document.getElementById('rating-display');
const xpDisplay = document.getElementById('xp-display');
const xpNextDisplay = document.getElementById('xp-next-display');
const xpProgress = document.getElementById('xp-progress');
const achievementsCard = document.getElementById('achievements-card');
const achRandomSelect = document.getElementById('ach-random-select');
const achRandomInput = document.getElementById('ach-random-input');
const countEasy = document.getElementById('count-easy');
const countNormal = document.getElementById('count-normal');
const countHard = document.getElementById('count-hard');
const countSuper = document.getElementById('count-super');
const countRandom = document.getElementById('count-random');
const bioCard = document.getElementById('bio-card');
const bioDisplay = document.getElementById('bio-display');
const bioForm = document.getElementById('bio-form');
const bioInput = document.getElementById('bio-input');

// ログイン状態を監視
auth.onAuthStateChanged(user => {
    if (user) {
        // ログインしている場合、Firestoreからユーザー情報を取得
        const userRef = db.collection('users').doc(user.uid);
        userRef.get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const currentLevel = data.level || 1;
                const currentRating = data.rating || 1500;
                const currentXp = data.xp || 0;

                // 次のレベルに必要なXPを計算
                const xpForNextLevel = Math.floor(100 * Math.pow(currentLevel, 1.5));
                const progressPercentage = Math.min((currentXp / xpForNextLevel) * 100, 100);

                // 画面に情報を表示
                usernameDisplay.textContent = data.username;
                levelDisplay.textContent = currentLevel;
                ratingDisplay.textContent = currentRating;
                xpDisplay.textContent = currentXp;
                xpNextDisplay.textContent = `${currentXp} / ${xpForNextLevel}`;
                
                xpProgress.style.width = `${progressPercentage}%`;
                xpProgress.textContent = `${Math.floor(progressPercentage)}%`;
                
                // 自己紹介文の表示
                const bio = data.bio || "自己紹介文がまだ設定されていません。";
                bioDisplay.textContent = bio;
                bioInput.value = data.bio || "";
                bioCard.style.display = 'block';

                // 実績表示の処理
                if (data.achievements) {
                    const achData = data.achievements;
                    achRandomSelect.textContent = achData.perfectRandomSelect ? '🏆 達成済み' : '未達成';
                    achRandomInput.textContent = achData.perfectRandomInput ? '🏆 達成済み' : '未達成';

                    // ★★★ ここから変更 ★★★
                    const counts = achData.perfectCounts || {};
                    
                    // 達成回数を整形して表示するヘルパー関数
                    const formatCountText = (difficultyKey) => {
                        const countData = counts[difficultyKey];
                        // 新しいデータ形式 (オブジェクト) の場合
                        if (typeof countData === 'object' && countData !== null) {
                            const selectCount = countData.select || 0;
                            const inputCount = countData.input || 0;
                            return `選択 ${selectCount}回 / 入力 ${inputCount}回`;
                        }
                        // 古いデータ形式 (数値) の場合
                        if (typeof countData === 'number') {
                            return `合計 ${countData}回`; // 古いデータは合計として表示
                        }
                        // データがない場合
                        return `選択 0回 / 入力 0回`;
                    };

                    countEasy.textContent = formatCountText('EASY');
                    countNormal.textContent = formatCountText('NORMAL');
                    countHard.textContent = formatCountText('HARD');
                    countSuper.textContent = formatCountText('SUPER');
                    countRandom.textContent = formatCountText('RANDOM');
                    // ★★★ ここまで変更 ★★★

                    achievementsCard.style.display = 'block';
                }

                // 表示を切り替え
                loadingMessage.style.display = 'none';
                userStatusDiv.style.display = 'block';

            } else {
                loadingMessage.textContent = 'ユーザー情報が見つかりませんでした。';
            }
        }).catch(error => {
            console.error("ユーザー情報の取得エラー:", error);
            loadingMessage.textContent = 'エラーが発生しました。トップページに戻って再試行してください。';
        });
    } else {
        // ログインしていない場合、ログインページにリダイレクト
        loadingMessage.textContent = 'ログインしていません。トップページに戻ります...';
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
    }
});

if (bioForm) {
    bioForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newBio = bioInput.value;
        const user = auth.currentUser;

        if (user) {
            const userRef = db.collection('users').doc(user.uid);
            userRef.update({
                bio: newBio
            }).then(() => {
                alert('自己紹介を更新しました！');
                bioDisplay.textContent = newBio;
            }).catch(error => {
                console.error("自己紹介の更新エラー:", error);
                alert('自己紹介の更新に失敗しました。');
            });
        }
    });
}
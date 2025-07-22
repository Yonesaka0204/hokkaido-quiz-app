// ★★★ firebaseConfigとinitializeAppの行を削除しました ★★★
// (これらの処理は新しいfirebase-config.jsに集約されます)

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
// 'auth'はfirebase-config.jsで定義されたグローバル変数を使用
auth.onAuthStateChanged(user => {
    if (user) {
        // ログインしている場合、Firestoreからユーザー情報を取得
        // 'db'はfirebase-config.jsで定義されたグローバル変数を使用
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
                    const counts = achData.perfectCounts || {};
                    
                    achRandomSelect.textContent = achData.perfectRandomSelect ? '🏆 達成済み' : '未達成';
                    achRandomInput.textContent = achData.perfectRandomInput ? '🏆 達成済み' : '未達成';

                    countEasy.textContent = (counts.EASY || 0) + ' 回';
                    countNormal.textContent = (counts.NORMAL || 0) + ' 回';
                    countHard.textContent = (counts.HARD || 0) + ' 回';
                    countSuper.textContent = (counts.SUPER || 0) + ' 回';
                    countRandom.textContent = (counts.RANDOM || 0) + ' 回';

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
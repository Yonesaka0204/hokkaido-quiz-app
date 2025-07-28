// mypage.js

// --- DOM要素を取得 ---
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
const levelUpEffect = document.getElementById('level-up-effect');

// --- ヘルパー関数 ---

// 特定のレベルアップに必要なXPを計算する関数
const getXpForLevelUp = (level) => Math.floor(100 * Math.pow(level, 1.5));

// 数値を滑らかに変化させるアニメーション関数
const animateNumber = (element, start, end, duration) => {
    let startTime = null;
    const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        element.textContent = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
};

// --- メインのアニメーション実行関数 ---
const runXpAnimation = (oldStats, newStats) => {
    let currentLevel = oldStats.level;
    let currentXp = oldStats.xp;

    const animateNextLevelUp = () => {
        const xpNeededForCurrentLevel = getXpForLevelUp(currentLevel);

        // まだレベルアップする場合
        if (newStats.level > currentLevel) {
            const duration = 1000; // 1回のレベルアップにかける時間

            // 1. バーを100%までアニメーション
            xpProgress.style.transition = `width ${duration}ms ease-out`;
            xpProgress.style.width = '100%';
            animateNumber(xpDisplay, currentXp, xpNeededForCurrentLevel, duration);
            xpNextDisplay.textContent = `${xpNeededForCurrentLevel} / ${xpNeededForCurrentLevel}`;
            xpProgress.textContent = `100%`;

            // 2. レベルアップ演出
            setTimeout(() => {
                levelUpEffect.classList.remove('level-up-hidden');
                levelUpEffect.classList.add('show');
                levelDisplay.classList.add('level-up-pop');
                
                setTimeout(() => {
                    currentLevel++;
                    levelDisplay.textContent = currentLevel;
                    levelUpEffect.classList.remove('show');
                    levelDisplay.classList.remove('level-up-pop');
                    xpProgress.style.transition = 'width 0s'; // トランジションを一旦なくす
                    xpProgress.style.width = '0%'; // バーをリセット
                    
                    currentXp = 0; // 経験値をリセット
                    
                    // 次のレベルアップアニメーションへ
                    setTimeout(animateNextLevelUp, 100);
                }, 1500); // LEVEL UP! の表示時間
            }, duration);
            
        } else {
            // 最後のレベルアップが終わった、またはレベルアップしない場合
            const xpNeededForFinalLevel = getXpForLevelUp(newStats.level);
            const finalPercentage = (newStats.xp / xpNeededForFinalLevel) * 100;
            const duration = 1000;
            
            setTimeout(() => {
                xpProgress.style.transition = `width ${duration}ms ease-out`;
                xpProgress.style.width = `${finalPercentage}%`;
                animateNumber(xpDisplay, currentXp, newStats.xp, duration);
                
                // XP表示もアニメーション
                let startXpNext = currentXp;
                let startTime = null;
                const step = (timestamp) => {
                    if (!startTime) startTime = timestamp;
                    const progress = Math.min((timestamp - startTime) / duration, 1);
                    const animatedXp = Math.floor(progress * (newStats.xp - startXpNext) + startXpNext);
                    xpNextDisplay.textContent = `${animatedXp} / ${xpNeededForFinalLevel}`;
                    xpProgress.textContent = `${Math.floor((animatedXp / xpNeededForFinalLevel) * 100)}%`;
                    if (progress < 1) {
                        window.requestAnimationFrame(step);
                    }
                };
                window.requestAnimationFrame(step);

                 // アニメーション完了後に新しいステータスを保存
                setTimeout(() => {
                    localStorage.setItem('userStats', JSON.stringify(newStats));
                }, duration);
            }, 100);
        }
    };
    
    animateNextLevelUp();
};


// --- ログイン状態の監視とメイン処理 ---
auth.onAuthStateChanged(user => {
    if (user) {
        const userRef = db.collection('users').doc(user.uid);
        userRef.get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const newStats = {
                    level: data.level || 1,
                    xp: data.xp || 0
                };

                // 表示を更新 (アニメーションしない部分)
                usernameDisplay.textContent = data.username;
                ratingDisplay.textContent = data.rating || 1500;
                const bio = data.bio || "自己紹介文がまだ設定されていません。";
                bioDisplay.textContent = bio;
                bioInput.value = data.bio || "";
                bioCard.style.display = 'block';

                if (data.achievements) {
                    // (実績表示のロジックは変更なし)
                    const achData = data.achievements;
                    achRandomSelect.textContent = achData.perfectRandomSelect ? '🏆 達成済み' : '未達成';
                    achRandomInput.textContent = achData.perfectRandomInput ? '🏆 達成済み' : '未達成';
                    const counts = achData.perfectCounts || {};
                    const formatCountText = (difficultyKey) => {
                        const countData = counts[difficultyKey];
                        if (typeof countData === 'object' && countData !== null) {
                            const selectCount = countData.select || 0;
                            const inputCount = countData.input || 0;
                            return `選択 ${selectCount}回 / 入力 ${inputCount}回`;
                        }
                        if (typeof countData === 'number') {
                            return `合計 ${countData}回`;
                        }
                        return `選択 0回 / 入力 0回`;
                    };
                    countEasy.textContent = formatCountText('EASY');
                    countNormal.textContent = formatCountText('NORMAL');
                    countHard.textContent = formatCountText('HARD');
                    countSuper.textContent = formatCountText('SUPER');
                    countRandom.textContent = formatCountText('RANDOM');
                    achievementsCard.style.display = 'block';
                }

                // ローディングを非表示にし、ステータスを表示
                loadingMessage.style.display = 'none';
                userStatusDiv.style.display = 'block';

                // --- アニメーションの実行判定 ---
                const oldStatsJSON = localStorage.getItem('userStats');
                let oldStats = oldStatsJSON ? JSON.parse(oldStatsJSON) : null;
                
                // ユーザーが異なればリセット
                if (oldStats && oldStats.uid !== user.uid) {
                    oldStats = null;
                }

                // 比較用の新しいステータスオブジェクトにuidを追加
                const newStatsWithUid = { ...newStats, uid: user.uid };

                if (oldStats && (oldStats.xp !== newStats.xp || oldStats.level !== newStats.level)) {
                    // 変化があればアニメーション実行
                    levelDisplay.textContent = oldStats.level;
                    const xpNeededForOldLevel = getXpForLevelUp(oldStats.level);
                    const oldPercentage = (oldStats.xp / xpNeededForOldLevel) * 100;
                    xpProgress.style.width = `${oldPercentage}%`;
                    xpProgress.textContent = `${Math.floor(oldPercentage)}%`;
                    xpDisplay.textContent = oldStats.xp;
                    xpNextDisplay.textContent = `${oldStats.xp} / ${xpNeededForOldLevel}`;
                    
                    setTimeout(() => runXpAnimation(oldStats, newStats), 500);
                } else {
                    // 変化がない、または初回訪問時は最終状態をそのまま表示
                    levelDisplay.textContent = newStats.level;
                    const xpNeededForNewLevel = getXpForLevelUp(newStats.level);
                    const newPercentage = (newStats.xp / xpNeededForNewLevel) * 100;
                    xpProgress.style.width = `${newPercentage}%`;
                    xpProgress.textContent = `${Math.floor(newPercentage)}%`;
                    xpDisplay.textContent = newStats.xp;
                    xpNextDisplay.textContent = `${newStats.xp} / ${xpNeededForNewLevel}`;
                    localStorage.setItem('userStats', JSON.stringify(newStatsWithUid));
                }

            } else {
                loadingMessage.textContent = 'ユーザー情報が見つかりませんでした。';
            }
        }).catch(error => {
            console.error("ユーザー情報の取得エラー:", error);
            loadingMessage.textContent = 'エラーが発生しました。トップページに戻って再試行してください。';
        });
    } else {
        loadingMessage.textContent = 'ログインしていません。トップページに戻ります...';
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
    }
});

// 自己紹介フォームの処理 (変更なし)
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
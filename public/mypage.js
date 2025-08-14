document.addEventListener('DOMContentLoaded', () => {
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
	// ▼▼▼ タブ関連の要素 ▼▼▼
	const tabNav = document.querySelector('.tab-nav');
	const tabPanels = document.querySelectorAll('.tab-panel');
	const generalTabPanel = document.getElementById('tab-general');
	const perfectCountsTabPanel = document.getElementById('tab-perfect-counts');
	// ▲▲▲ ここまで ▲▲▲
    const bioCard = document.getElementById('bio-card');
    const bioDisplay = document.getElementById('bio-display');
    const bioForm = document.getElementById('bio-form');
    const bioInput = document.getElementById('bio-input');
    const levelUpEffect = document.getElementById('level-up-effect');

    // --- ヘルパー関数 ---

    const getXpForLevelUp = (level) => Math.floor(100 * Math.pow(level, 1.5));

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
        const newTotalXp = (getXpForLevelUp(newStats.level - 1) - getXpForLevelUp(oldStats.level)) + oldStats.xp + newStats.xp;


        const animateNextLevelUp = () => {
            const xpNeededForCurrentLevel = getXpForLevelUp(currentLevel);

            if (newStats.level > currentLevel) {
                const duration = 1000;

                xpProgress.style.transition = `width ${duration}ms ease-out`;
                xpProgress.style.width = '100%';
                animateNumber(xpDisplay, currentXp, xpNeededForCurrentLevel, duration);
                xpNextDisplay.textContent = `${xpNeededForCurrentLevel} / ${xpNeededForCurrentLevel}`;
                xpProgress.textContent = `100%`;

                setTimeout(() => {
                    levelUpEffect.classList.remove('level-up-hidden');
                    levelUpEffect.classList.add('show');
                    levelDisplay.classList.add('level-up-pop');
                    
                    setTimeout(() => {
                        currentLevel++;
                        levelDisplay.textContent = currentLevel;
                        levelUpEffect.classList.remove('show');
                        levelDisplay.classList.remove('level-up-pop');
                        xpProgress.style.transition = 'width 0s';
                        xpProgress.style.width = '0%';
                        
                        currentXp = 0;
                        
                        setTimeout(animateNextLevelUp, 100);
                    }, 1500);
                }, duration);
                
            } else {
                const xpNeededForFinalLevel = getXpForLevelUp(newStats.level);
                const finalPercentage = (newStats.xp / xpNeededForFinalLevel) * 100;
                const duration = 1000;
                
                setTimeout(() => {
                    xpProgress.style.transition = `width ${duration}ms ease-out`;
                    xpProgress.style.width = `${finalPercentage}%`;
                    animateNumber(xpDisplay, currentXp, newStats.xp, duration);
                    
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

                    setTimeout(() => {
                        localStorage.setItem('userStats', JSON.stringify(newStatsWithUid));
                    }, duration);
                }, 100);
            }
        };
        
        animateNextLevelUp();
    };


    // --- ログイン状態の監視とメイン処理 ---
	auth.onAuthStateChanged(user => {
        if (user) {
			// ▼▼▼ タブ切り替えロジック ▼▼▼
			if (tabNav) {
				tabNav.addEventListener('click', (e) => {
					const target = e.target;
					if (target.classList.contains('tab-btn')) {
						const tabId = target.dataset.tab;

						// すべてのタブボタンとパネルからactiveクラスを削除
						tabNav.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
						tabPanels.forEach(panel => panel.classList.remove('active'));

						// クリックされたタブと対応するパネルにactiveクラスを追加
						target.classList.add('active');
						const panel = document.getElementById(`tab-${tabId}`);
						if (panel) panel.classList.add('active');
					}
				});
			}
			// ▲▲▲ ここまで ▲▲▲
            const userRef = db.collection('users').doc(user.uid);
            userRef.get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    const newStats = {
                        level: data.level || 1,
                        xp: data.xp || 0
                    };

                    usernameDisplay.textContent = data.username;
                    ratingDisplay.textContent = data.rating || 1500;
                    const bio = data.bio || "自己紹介文がまだ設定されていません。";
                    bioDisplay.textContent = bio;
                    bioInput.value = data.bio || "";
                    bioCard.style.display = 'block';

					if (data.achievements) {
						const achData = data.achievements;

						// --- 「全般」タブのコンテンツを生成 ---
						if (generalTabPanel) {
							generalTabPanel.innerHTML = `
								<div class="status-item">
									<span>ランダム(選択式)で全問正解</span>
									<span>${achData.perfectRandomSelect ? '🏆 達成済み' : '未達成'}</span>
								</div>
								<div class="status-item">
									<span>ランダム(入力式)で全問正解</span>
									<span>${achData.perfectRandomInput ? '🏆 達成済み' : '未達成'}</span>
								</div>
							`;
						}

						// --- 「全問正解」タブのコンテンツを生成 ---
						if (perfectCountsTabPanel) {
							const counts = achData.perfectCounts || {};
							const formatCountText = (difficultyKey) => {
								const countData = counts[difficultyKey];
								if (typeof countData === 'object' && countData !== null) {
									return `選択 ${countData.select || 0}回 / 入力 ${countData.input || 0}回`;
								}
								return `選択 0回 / 入力 0回`;
							};
							perfectCountsTabPanel.innerHTML = `
								<div class="status-item">
									<span>EASY:</span>
									<span>${formatCountText('EASY')}</span>
								</div>
								<div class="status-item">
									<span>NORMAL:</span>
									<span>${formatCountText('NORMAL')}</span>
								</div>
								<div class="status-item">
									<span>HARD:</span>
									<span>${formatCountText('HARD')}</span>
								</div>
								<div class="status-item">
									<span>SUPER:</span>
									<span>${formatCountText('SUPER')}</span>
								</div>
								<div class="status-item" style="margin-bottom: 0;">
									<span>ランダム:</span>
									<span>${formatCountText('RANDOM')}</span>
								</div>
							`;
						}

						achievementsCard.style.display = 'block';
					}

                    loadingMessage.style.display = 'none';
                    userStatusDiv.style.display = 'block';

                    const oldStatsJSON = localStorage.getItem('userStats');
                    let oldStats = oldStatsJSON ? JSON.parse(oldStatsJSON) : null;
                    
                    if (oldStats && oldStats.uid !== user.uid) {
                        oldStats = null;
                    }

                    const newStatsWithUid = { ...newStats, uid: user.uid };

                    if (oldStats && (oldStats.xp !== newStats.xp || oldStats.level !== newStats.level)) {
                        levelDisplay.textContent = oldStats.level;
                        const xpNeededForOldLevel = getXpForLevelUp(oldStats.level);
                        const oldPercentage = (oldStats.xp / xpNeededForOldLevel) * 100;
                        xpProgress.style.width = `${oldPercentage}%`;
                        xpProgress.textContent = `${Math.floor(oldPercentage)}%`;
                        xpDisplay.textContent = oldStats.xp;
                        xpNextDisplay.textContent = `${oldStats.xp} / ${xpNeededForOldLevel}`;
                        
                        setTimeout(() => runXpAnimation(oldStats, newStats), 500);
                    } else {
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

    // Socket.IOの接続を初期化
    const socket = io();

    // --- ユーザー名変更処理 ---
    const usernameForm = document.getElementById('username-form');
    const usernameInput = document.getElementById('username-input');
    const usernameMessage = document.getElementById('username-message');

    if (usernameForm) {
        usernameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newUsername = usernameInput.value.trim();

            if (!newUsername) {
                usernameMessage.textContent = 'ユーザー名を入力してください。';
                usernameMessage.style.color = 'red';
                return;
            }
            if (newUsername.length > 10) {
                usernameMessage.textContent = 'ユーザー名は10文字以内で入力してください。';
                usernameMessage.style.color = 'red';
                return;
            }

            // サーバーに新しいユーザー名を送信
            socket.emit('update-username', { newUsername });
            usernameMessage.textContent = '更新中...';
            usernameMessage.style.color = 'gray';
        });
    }

    // サーバーからの成功応答
    socket.on('username-update-success', ({ newUsername }) => {
        usernameDisplay.textContent = newUsername; // 画面上の表示を更新
        usernameMessage.textContent = 'ユーザー名を更新しました！';
        usernameMessage.style.color = 'green';
        usernameInput.value = ''; // 入力欄をクリア

        // ローカルストレージのユーザー情報も更新（任意）
        const oldStatsJSON = localStorage.getItem('userStats');
        if (oldStatsJSON) {
            const stats = JSON.parse(oldStatsJSON);
            stats.username = newUsername;
            localStorage.setItem('userStats', JSON.stringify(stats));
        }
    });

    // サーバーからのエラー応答
    socket.on('username-update-error', ({ message }) => {
        usernameMessage.textContent = message;
        usernameMessage.style.color = 'red';
    });
});
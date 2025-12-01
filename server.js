const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const admin = require('firebase-admin');

try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    let serviceAccount;
    if (serviceAccountString) {
        serviceAccount = JSON.parse(serviceAccountString);
    } else {
        serviceAccount = require('./serviceAccountKey.json');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error("Firebase Admin SDKの初期化に失敗しました。", error);
    if (error.code === 'MODULE_NOT_FOUND') {
        console.error('ローカル開発ですか？ serviceAccountKey.jsonファイルが見つかりません。');
    }
    process.exit(1);
}

const db = admin.firestore();
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const allQuizData = require('./quiz-data.json');
const rooms = {};

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public/signup.html')));
app.get('/mypage', (req, res) => res.sendFile(path.join(__dirname, 'public/mypage.html')));
app.get('/ranking', (req, res) => res.sendFile(path.join(__dirname, 'public/ranking.html')));
app.get('/health', (req, res) => res.sendStatus(200));
app.get('/user/:uid', (req, res) => res.sendFile(path.join(__dirname, 'public/user.html')));
app.get('/privacy-policy', (req, res) => res.sendFile(path.join(__dirname, 'public/privacy-policy.html')));
app.get('/room/:roomId', (req, res) => res.sendFile(path.join(__dirname, 'public/room.html')));
app.get('/room/:roomId/quiz', (req, res) => res.sendFile(path.join(__dirname, 'public/quiz.html')));
app.get('/room/:roomId/results', (req, res) => res.sendFile(path.join(__dirname, 'public/results.html')));
app.get('/typing', (req, res) => res.sendFile(path.join(__dirname, 'public/typing.html')));
app.get('/flick', (req, res) => res.sendFile(path.join(__dirname, 'public/flick.html')));

io.on('connection', (socket) => {
    
    socket.on('join-room', async ({ roomId, idToken, name }) => {
        // (中略) ... 元のjoin-roomロジック
        if (rooms[roomId] && rooms[roomId].quizState.isActive) {
            socket.emit('join-error', { message: '現在クイズが進行中のため、入室できません。' });
            return;
        }
        try {
            let userProfile;
            if (idToken) {
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                const uid = decodedToken.uid;
                const userDoc = await db.collection('users').doc(uid).get();
                if (!userDoc.exists) throw new Error('User not found in Firestore.');
                
                const userData = userDoc.data();
                userProfile = { id: socket.id, name: userData.username, uid, isGuest: false, level: userData.level || 1, rating: userData.rating || 1500 };
            } else {
                userProfile = { id: socket.id, name: name, uid: null, isGuest: true, level: 1, rating: null };
            }
            socket.join(roomId);
            if (!rooms[roomId]) {
                rooms[roomId] = { users: [], quizState: {} };
                resetQuizState(roomId);
            }
            if (userProfile.isGuest) {
                let finalName = userProfile.name;
                let counter = 2;
                while (rooms[roomId].users.some(u => u.name === finalName)) {
                    finalName = `${userProfile.name}(${counter})`;
                    counter++;
                }
                userProfile.name = finalName;
            }
            if (!userProfile.isGuest) {
                rooms[roomId].users = rooms[roomId].users.filter(user => user.uid !== userProfile.uid);
            }
            rooms[roomId].users.push(userProfile);
            socket.data = { roomId, userName: userProfile.name, uid: userProfile.uid };
            io.to(roomId).emit('room-users', rooms[roomId].users);
        } catch (error) {
            console.error('Join room failed:', error);
            socket.emit('join-error', { message: '部屋への参加に失敗しました。' });
        }
    });

    socket.on('start-quiz', ({ roomId, difficulty, answerFormat, isRanked }) => {
        // (中略) ... 元のstart-quizロジック
        const room = rooms[roomId];
        if (!room || room.quizState.isActive) return;
        const state = room.quizState;
        state.playerCount = room.users.length;
        if (state.playerCount === 0) return;
        if (isRanked && difficulty !== 'ENDLESS') {
            const loggedInUsers = room.users.filter(u => !u.isGuest);
            if (loggedInUsers.length < 2) {
                socket.emit('quiz-start-failed', { message: `レートマッチはログインユーザーが2人以上いる場合にのみ開始できます。` });
                return;
            }
        }
        let filteredQuestions;
        if (difficulty === 'RANDOM' || difficulty === 'ENDLESS') {
            filteredQuestions = [...allQuizData];
        } else {
            filteredQuestions = allQuizData.filter(q => q.difficulty === difficulty);
        }
        if (difficulty !== 'ENDLESS' && filteredQuestions.length < 10) {
            socket.emit('quiz-start-failed', { message: `選択された難易度の問題が10問未満のため、クイズを開始できません。` });
            return;
        }
        state.isActive = true;
        state.isRanked = difficulty === 'ENDLESS' ? false : isRanked;
        state.difficulty = difficulty;
        state.answerFormat = answerFormat;
        state.questions = [...filteredQuestions].sort(() => 0.5 - Math.random());
        if(difficulty !== 'ENDLESS') {
            state.questions = state.questions.slice(0, 10);
        }
        state.currentQuestionIndex = 0;
        state.answersReceived = 0;
        state.readyPlayers.clear();
        state.scores = {};
        state.quizJustStarted = true;
        room.users.forEach(u => {
            const key = u.uid || u.name;
            state.scores[key] = 0;
            if(difficulty === 'ENDLESS') u.eliminated = false;
        });
        io.to(roomId).emit('quiz-start', { roomId });
    });

    socket.on('player-ready', async ({ roomId, idToken, name }) => {
        // (中略) ... 元のplayer-readyロジック
        const room = rooms[roomId];
        if (!room || !room.quizState.isActive) return;
        try {
            let userProfile;
            if (idToken) {
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                const uid = decodedToken.uid;
                const userDoc = await db.collection('users').doc(uid).get();
                if (!userDoc.exists) throw new Error('User not found in Firestore.');
                const userData = userDoc.data();
                userProfile = { id: socket.id, name: userData.username, uid, isGuest: false, level: userData.level || 1, rating: userData.rating || 1500 };
            } else if (name) {
                userProfile = { id: socket.id, name: name, uid: null, isGuest: true, level: 1, rating: null };
            } else {
                return;
            }
            socket.join(roomId);
            const existingUserIndex = rooms[roomId].users.findIndex(user => user.isGuest ? user.name === userProfile.name : user.uid === userProfile.uid);
            if (existingUserIndex !== -1) {
                rooms[roomId].users[existingUserIndex].id = socket.id;
            } else {
                rooms[roomId].users.push(userProfile);
            }
            socket.data = { roomId, userName: userProfile.name, uid: userProfile.uid };
            const state = room.quizState;
            state.readyPlayers.add(socket.id);
            const activePlayers = room.users.filter(u => !u.eliminated);
            if (state.readyPlayers.size >= activePlayers.length) {
                sendNextQuestion(roomId);
                state.readyPlayers.clear();
            }
        } catch (error) {
            console.error('Player ready/re-join failed:', error);
            socket.emit('join-error', { message: 'クイズへの再参加処理中にエラーが発生しました。' });
        }
    });

    socket.on('submit-answer', ({ roomId, answer, questionText }) => {
        // (中略) ... 元のsubmit-answerロジック
        const room = rooms[roomId];
        if (!room || !room.quizState.isActive) return;
        const state = room.quizState;
        const question = state.questions[state.currentQuestionIndex];
        const player = room.users.find(u => u.id === socket.id);
        if (!player || player.eliminated) return;
        const playerIdentifier = player.uid || player.name;
        if (state.answeredPlayers.has(playerIdentifier)) return;
        if (question && question.question === questionText) {
            state.answeredPlayers.add(playerIdentifier);
            const isCorrect = (question.answer === answer.trim());
            const key = player.uid || player.name;
            if (isCorrect) {
                state.scores[key]++;
                if (!player.isGuest && question.region) {
                    db.collection('users').doc(player.uid).update({
                        [`collection.${question.question}`]: { trivia: question.trivia, region: question.region }
                    }).catch(err => console.error("コレクションの更新に失敗:", err));
                }
            } else {
                if (state.difficulty === 'ENDLESS') player.eliminated = true;
            }
            socket.emit('answer-result', { 
                correct: isCorrect, 
                correctAnswer: question.answer, 
                trivia: question.trivia, 
                eliminated: player.eliminated,
                // ▼▼▼ 追加 ▼▼▼
                region: question.region, // 後で使うかもしれないので
                mapImage: question.mapImage
            });
            io.to(roomId).emit('player-answered', { name: player.name, isCorrect, eliminated: player.eliminated });
            state.answersReceived++;
            const activePlayers = room.users.filter(u => !u.eliminated);
            if (state.answersReceived >= activePlayers.length) {
                io.to(roomId).emit('all-answers-in');
                state.answersReceived = 0;
                if (state.nextQuestionTimer) clearTimeout(state.nextQuestionTimer);
                state.nextQuestionTimer = setTimeout(() => proceedToNextQuestion(roomId), 7000);
            }
        }
    });

    socket.on('ready-for-next-question', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || !room.quizState.isActive) return;
        const state = room.quizState;
        state.readyPlayers.add(socket.id);
        const activePlayers = room.users.filter(u => !u.eliminated);
        if (state.readyPlayers.size >= activePlayers.length) {
            proceedToNextQuestion(roomId);
        }
    });

    // ▼▼▼ 修正点：ランキング取得ロジックにゲストのマージを追加 ▼▼▼
    socket.on('get-rankings', async () => {
        try {
            const usersRef = db.collection('users');
            const guestsRef = db.collection('guest_scores');

            // ユーザーとゲストをマージしてランキングを作るヘルパー関数
            const getMergedRanking = async (userField, guestMode, guestTime) => {
                // 1. ユーザーのスコアを取得
                const userSnapshot = await usersRef.orderBy(userField, 'desc').limit(100).get();
                const userScores = userSnapshot.docs.map(doc => {
                    const data = doc.data();
                    let score = 0;
                    if (userField.includes('.')) {
                        const keys = userField.split('.');
                        score = (data[keys[0]] && data[keys[0]][keys[1]]) || 0;
                    } else {
                        score = data[userField] || 0;
                    }
                    return { uid: doc.id, username: data.username, score };
                });

                // 2. ゲストのスコアを取得 (特定のモードと時間でフィルタ)
                const guestSnapshot = await guestsRef
                    .where('mode', '==', guestMode)
                    .where('timeMode', '==', guestTime)
                    .orderBy('score', 'desc')
                    .limit(100)
                    .get();
                
                const guestScores = guestSnapshot.docs.map(doc => ({
                    uid: 'guest', // リンクを作らないためのマーカー
                    username: doc.data().name,
                    score: doc.data().score
                }));

                // 3. マージしてソートして上位100件を返す
                const merged = [...userScores, ...guestScores];
                merged.sort((a, b) => b.score - a.score);
                return merged.slice(0, 100);
            };

            // 既存のランキング（レベルなどはユーザーのみ）
            const levelSnapshot = await usersRef.orderBy('level', 'desc').orderBy('xp', 'desc').limit(100).get();
            const levelRanking = levelSnapshot.docs.map(doc => ({ uid: doc.id, username: doc.data().username, level: doc.data().level }));

            const ratingSnapshot = await usersRef.orderBy('rating', 'desc').limit(100).get();
            const ratingRanking = ratingSnapshot.docs.map(doc => ({ uid: doc.id, username: doc.data().username, rating: doc.data().rating }));
            
            const correctSnapshot = await usersRef.orderBy('totalCorrect', 'desc').limit(100).get();
            const correctRanking = correctSnapshot.docs.map(doc => ({ uid: doc.id, username: doc.data().username, totalCorrect: doc.data().totalCorrect }));

            const endlessSnapshot = await usersRef.orderBy('endlessHighScore', 'desc').limit(100).get();
            const endlessRanking = endlessSnapshot.docs.map(doc => ({ uid: doc.id, username: doc.data().username, endlessHighScore: doc.data().endlessHighScore || 0 }));
            
            // マージされたタイピングランキング
            const typing60sRanking = await getMergedRanking('typingScores.60', 'typing', 60);
            const typing120sRanking = await getMergedRanking('typingScores.120', 'typing', 120);
            const typing180sRanking = await getMergedRanking('typingScores.180', 'typing', 180);
            const flickRanking = await getMergedRanking('flickScores.60', 'flick', 60);

            socket.emit('rankings-data', { 
                levelRanking, ratingRanking, correctRanking, endlessRanking,
                typing60sRanking, typing120sRanking, typing180sRanking,
                flickRanking
            });

        } catch (error) {
            console.error("ランキングデータの取得に失敗:", error);
            const errorMessage = `サーバーでエラーが発生しました。インデックス未作成の可能性があります。エラー内容： ${error.message}`;
            socket.emit('rankings-error', { message: errorMessage });
        }
    });
    // ▲▲▲ ここまで ▲▲▲

    socket.on('get-user-profile', async ({ uid }) => {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists) return socket.emit('user-profile-error', { message: 'ユーザーが見つかりません。' });
            const data = userDoc.data();
            socket.emit('user-profile-data', { userData: {
                username: data.username,
                level: data.level || 1,
                rating: data.rating || 1500,
                totalCorrect: data.totalCorrect || 0,
                endlessHighScore: data.endlessHighScore || 0,
                bio: data.bio || "",
                achievements: data.achievements || {}
            }});
        } catch (error) {
            console.error("プロフィール取得エラー:", error);
            socket.emit('user-profile-error', { message: 'プロフィールの取得に失敗しました。' });
        }
    });

    socket.on('update-username', async ({ newUsername }) => {
        try {
            const { uid, roomId } = socket.data;
            if (!uid) return socket.emit('username-update-error', { message: '認証されていません。' });
            const trimmedUsername = newUsername.trim();
            if (!trimmedUsername || trimmedUsername.length > 10) return socket.emit('username-update-error', { message: 'ユーザー名は1～10文字で入力してください。' });
            const usersRef = db.collection('users');
            const snapshot = await usersRef.where('username', '==', trimmedUsername).limit(1).get();
            if (!snapshot.empty) return socket.emit('username-update-error', { message: 'そのユーザー名は既に使用されています。' });
            await db.collection('users').doc(uid).update({ username: trimmedUsername });
            socket.emit('username-update-success', { newUsername: trimmedUsername });
            if (roomId && rooms[roomId]) {
                const userInRoom = rooms[roomId].users.find(u => u.uid === uid);
                if (userInRoom) {
                    userInRoom.name = trimmedUsername;
                    socket.data.userName = trimmedUsername;
                    io.to(roomId).emit('room-users', rooms[roomId].users);
                }
            }
        } catch (error) {
            console.error("ユーザー名の更新エラー:", error);
            socket.emit('username-update-error', { message: 'サーバーエラーが発生しました。' });
        }
    });

    socket.on('send-chat-message', ({ roomId, message }) => {
        const user = rooms[roomId]?.users.find(u => u.id === socket.id);
        if (user && message.trim() !== '') {
            io.to(roomId).emit('new-chat-message', { sender: user.name, message: message });
        }
    });

    socket.on('return-to-lobby', ({ roomId }) => {
        const room = rooms[roomId];
        if (room && room.quizState.isActive) {
            resetQuizState(roomId);
            io.to(roomId).emit('lobby-redirect', roomId);
        }
    });

    socket.on('disconnect', () => {
        const { roomId, userName } = socket.data;
        if (!roomId || !rooms[roomId]) return;
        const room = rooms[roomId];
        if (room.quizState.isActive) return;
        const userInRoom = room.users.find(u => u.id === socket.id);
        if (userInRoom) {
            room.users = room.users.filter(u => u.id !== socket.id);
            io.to(roomId).emit('room-users', room.users);
            if (room.users.length === 0 && !room.quizState.isActive) delete rooms[roomId];
        }
    });

    socket.on('get-typing-data', () => socket.emit('typing-data', allQuizData));

    socket.on('submit-typing-score', async ({ idToken, timeMode, score }) => {
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const uid = decodedToken.uid;
            if (!uid || ![60, 120, 180].includes(timeMode)) return;

            const userRef = db.collection('users').doc(uid);
            const xpGained = 20 + Math.floor(score / 200);
            let isNewHighscore = false;

            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(userRef);
                if (!doc.exists) return;
                const data = doc.data();
                const currentHighscore = (data.typingScores && data.typingScores[timeMode]) || 0;
                if (score > currentHighscore) isNewHighscore = true;
                let currentLevel = data.level || 1;
                let currentXp = (data.xp || 0) + xpGained;
                let xpForNextLevel = Math.floor(100 * Math.pow(currentLevel, 1.5));
                while(currentXp >= xpForNextLevel){
                   currentXp -= xpForNextLevel;
                   currentLevel++;
                   xpForNextLevel = Math.floor(100 * Math.pow(currentLevel, 1.5));
                }
                const updateData = { xp: currentXp, level: currentLevel };
                if (isNewHighscore) updateData[`typingScores.${timeMode}`] = score;
                transaction.update(userRef, updateData);
            });

            socket.emit('typing-score-saved', { isNewHighscore, xpGained });
        } catch (error) {
            console.error("タイピングスコアの保存/XP更新に失敗:", error);
        }
    });

    socket.on('submit-flick-score', async ({ idToken, score }) => {
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const uid = decodedToken.uid;
            if (!uid) return;

            const userRef = db.collection('users').doc(uid);
            const xpGained = 20 + Math.floor(score / 200);
            let isNewHighscore = false;

            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(userRef);
                if (!doc.exists) return;
                const data = doc.data();
                const currentHighscore = (data.flickScores && data.flickScores[60]) || 0;
                if (score > currentHighscore) isNewHighscore = true;
                let currentLevel = data.level || 1;
                let currentXp = (data.xp || 0) + xpGained;
                let xpForNextLevel = Math.floor(100 * Math.pow(currentLevel, 1.5));
                while(currentXp >= xpForNextLevel){
                   currentXp -= xpForNextLevel;
                   currentLevel++;
                   xpForNextLevel = Math.floor(100 * Math.pow(currentLevel, 1.5));
                }
                const updateData = { xp: currentXp, level: currentLevel };
                if (isNewHighscore) updateData['flickScores.60'] = score;
                transaction.update(userRef, updateData);
            });
            socket.emit('typing-score-saved', { isNewHighscore, xpGained });
        } catch (error) {
            console.error("フリックスコアの保存/XP更新に失敗:", error);
        }
    });

    // ▼▼▼ ゲストスコア保存処理を追加 ▼▼▼
    socket.on('submit-guest-score', async ({ name, score, timeMode, mode }) => {
        try {
            // バリデーション
            if (!name || !score || !mode || (mode === 'typing' && !timeMode)) return;
            
            // ゲストスコア用のコレクションに保存
            await db.collection('guest_scores').add({
                name: name,
                score: score,
                mode: mode, // 'typing' or 'flick'
                timeMode: timeMode || 60, // フリックは常に60だが統一のため
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error("ゲストスコアの保存に失敗:", error);
        }
    });
    // ▲▲▲ ここまで ▲▲▲
});

function sendNextQuestion(roomId) {
    const room = rooms[roomId];
    if (!room || !room.quizState.isActive) return;
    const state = room.quizState;
    state.answeredPlayers.clear();
    const activePlayers = room.users.filter(u => !u.eliminated);
    if (activePlayers.length === 0) return endQuiz(roomId);
    if (state.difficulty !== 'ENDLESS' && state.currentQuestionIndex >= state.questions.length) return endQuiz(roomId);
    if (state.difficulty === 'ENDLESS' && state.currentQuestionIndex >= state.questions.length) {
        state.questions = [...allQuizData].sort(() => 0.5 - Math.random());
        state.currentQuestionIndex = 0;
    }
    const question = state.questions[state.currentQuestionIndex];
    const questionDataToSend = {
        question: { question: question.question },
        questionNumber: state.difficulty === 'ENDLESS' ? (state.scores[activePlayers[0].uid || activePlayers[0].name] || 0) + 1 : state.currentQuestionIndex + 1,
        totalQuestions: state.difficulty === 'ENDLESS' ? '∞' : 10,
        answerFormat: state.answerFormat,
        users: room.users
    };
    if (state.answerFormat === 'multiple-choice') {
        let options = new Set([question.answer, ...(question.dummies || [])]);
        if (options.size < 3) {
            const allDummies = allQuizData.map(q => q.answer).filter(ans => !options.has(ans));
            while (options.size < 3 && allDummies.length > 0) {
                options.add(allDummies.splice(Math.floor(Math.random() * allDummies.length), 1)[0]);
            }
        }
        questionDataToSend.options = [...options].sort(() => 0.5 - Math.random());
    }
    io.to(roomId).emit('new-question', questionDataToSend);
}

function proceedToNextQuestion(roomId) {
    const room = rooms[roomId];
    if (!room || !room.quizState.isActive) return;
    const state = room.quizState;
    if (state.quizJustStarted) {
        state.quizJustStarted = false;
        return;
    }
    if (state.isProceeding) return;
    state.isProceeding = true;
    if (state.nextQuestionTimer) {
        clearTimeout(state.nextQuestionTimer);
        state.nextQuestionTimer = null;
    } else {
        if (state.readyPlayers.size < room.users.filter(u => !u.eliminated).length) {
            state.isProceeding = false;
            return;
        }
    }
    state.readyPlayers.clear();
    state.currentQuestionIndex++;
    const activePlayers = room.users.filter(u => !u.eliminated);
    const gameShouldEnd = state.difficulty === 'ENDLESS' ? activePlayers.length < 1 : state.currentQuestionIndex >= state.questions.length;
    if (!gameShouldEnd) sendNextQuestion(roomId);
    else endQuiz(roomId);
    state.isProceeding = false;
}

async function endQuiz(roomId) {
    const room = rooms[roomId];
    if (!room || !room.quizState.isActive) return;
    const state = room.quizState;
    const finalResults = room.users
        .map(user => ({
            uid: user.uid, name: user.name, score: state.scores[user.uid || user.name] || 0,
            isGuest: user.isGuest, currentRating: user.rating
        }))
        .sort((a, b) => b.score - a.score);
    const ratedPlayers = finalResults.filter(p => !p.isGuest);
    const ratingChanges = {};
    if (state.isRanked && ratedPlayers.length >= 2) {
        const K = 32;
        for (const playerA of ratedPlayers) {
            let totalRatingChange = 0;
            for (const playerB of ratedPlayers) {
                if (playerA.uid === playerB.uid) continue;
                const Ra = playerA.currentRating;
                const Rb = playerB.currentRating;
                const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
                let Sa = 0;
                if (playerA.score > playerB.score) Sa = 1;
                else if (playerA.score === playerB.score) Sa = 0.5;
                totalRatingChange += K * (Sa - Ea);
            }
            ratingChanges[playerA.uid] = totalRatingChange / (ratedPlayers.length - 1);
        }
    }
    for (const user of room.users) {
        if (!user.isGuest) {
            const userRef = db.collection('users').doc(user.uid);
            try {
                await db.runTransaction(async (transaction) => {
                    const doc = await transaction.get(userRef);
                    if (!doc.exists) return;
                    const data = doc.data();
                    let updateData = {};
                    const score = state.scores[user.uid] || 0;
                    if (state.difficulty === 'ENDLESS' && score > (data.endlessHighScore || 0)) updateData.endlessHighScore = score;
                    else if (score === 10) {
                        const { difficulty, answerFormat } = state;
                        const formatKey = answerFormat === 'multiple-choice' ? 'select' : 'input';
                        updateData[`achievements.perfectCounts.${difficulty}.${formatKey}`] = admin.firestore.FieldValue.increment(1);
                        if (difficulty === 'RANDOM') {
                            if (answerFormat === 'multiple-choice') updateData['achievements.perfectRandomSelect'] = true;
                            else if (answerFormat === 'text-input') updateData['achievements.perfectRandomInput'] = true;
                        }
                    }
                    if (score > 0) {
                        let xpGained = 10 + (score * 5) * (state.answerFormat === 'text-input' ? 3 : 1);
                        if (state.difficulty !== 'ENDLESS' && score === 10) xpGained += 100;
                        if (state.difficulty === 'ENDLESS') xpGained = Math.floor(xpGained * (score / 10));
                        let currentLevel = data.level || 1;
                        let currentXp = (data.xp || 0) + xpGained;
                        let xpForNextLevel = Math.floor(100 * Math.pow(currentLevel, 1.5));
                        while(currentXp >= xpForNextLevel){
                           currentXp -= xpForNextLevel;
                           currentLevel++;
                           xpForNextLevel = Math.floor(100 * Math.pow(currentLevel, 1.5));
                        }
                        updateData.xp = currentXp;
                        updateData.level = currentLevel;
                        updateData.totalCorrect = (data.totalCorrect || 0) + score;
                    }
                    if (ratingChanges[user.uid] !== undefined) updateData.rating = Math.round((data.rating || 1500) + ratingChanges[user.uid]);
                    if (Object.keys(updateData).length > 0) transaction.update(userRef, updateData);
                });
            } catch (e) { console.error("DB更新トランザクション失敗: ", e); }
        }
    }
    const displayResults = finalResults.map(r => ({name: r.name, score: r.score}));
    io.to(roomId).emit('quiz-end', { finalResults: displayResults, roomId });
    resetQuizState(roomId);
}

function resetQuizState(roomId) {
    if (rooms[roomId]) {
        rooms[roomId].quizState = {
            isActive: false, isRanked: false, difficulty: 'EASY',
            questions: [], currentQuestionIndex: 0, scores: {},
            answersReceived: 0, readyPlayers: new Set(),
            answerFormat: 'multiple-choice', playerCount: 0,
            nextQuestionTimer: null, answeredPlayers: new Set(),
            isProceeding: false, quizJustStarted: false
        };
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバー起動中: http://localhost:${PORT}`);
});
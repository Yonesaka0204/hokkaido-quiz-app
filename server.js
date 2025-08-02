const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const admin = require('firebase-admin');

try {
    // Render環境では環境変数から、ローカルではファイルから読み込む
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountString) {
        throw new Error('Firebaseの認証情報が環境変数に設定されていません。');
    }
    const serviceAccount = JSON.parse(serviceAccountString);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error("Firebase Admin SDKの初期化に失敗しました。", error);
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
app.get('/room/:roomId', (req, res) => res.sendFile(path.join(__dirname, 'public/room.html')));
app.get('/room/:roomId/quiz', (req, res) => res.sendFile(path.join(__dirname, 'public/quiz.html')));
app.get('/room/:roomId/results', (req, res) => res.sendFile(path.join(__dirname, 'public/results.html')));

io.on('connection', (socket) => {
        // ★★★★★ ここに最終調査用のログを追加 ★★★★★
        socket.onAny((eventName, ...args) => {
            console.log(`[DEBUG: INCOMING_EVENT] Event: ${eventName}, Socket: ${socket.id}`);
        });
        
    socket.on('join-room', async ({ roomId, idToken, name }) => {
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

        // ★★★★★ 最終修正ポイント 1/2 ★★★★★
        // クイズが始まったばかりであることを示すフラグを設定
        state.quizJustStarted = true;

        room.users.forEach(u => {
            const key = u.uid || u.name;
            state.scores[key] = 0;
            if(difficulty === 'ENDLESS') {
                u.eliminated = false;
            }
        });
        io.to(roomId).emit('quiz-start', { roomId });
    });

    // ★★★ ここからデバッグ版に差し替え ★★★
    socket.on('player-ready', async ({ roomId, idToken, name }) => {
        // ★★★ デバッグログを追加 ★★★
        console.log(`[DEBUG: player-ready] Room: ${roomId}, Socket: ${socket.id} がクイズ画面の準備完了を通知しました。`);
    
        const room = rooms[roomId];
        if (!room || !room.quizState.isActive) {
            console.log(`[DEBUG: player-ready] クイズがアクティブでないため、処理を中断します。`);
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
            } else if (name) {
                userProfile = { id: socket.id, name: name, uid: null, isGuest: true, level: 1, rating: null };
            } else {
                return;
            }
    
            socket.join(roomId);
    
            const existingUserIndex = rooms[roomId].users.findIndex(user =>
                user.isGuest ? user.name === userProfile.name : user.uid === userProfile.uid
            );
    
            if (existingUserIndex !== -1) {
                rooms[roomId].users[existingUserIndex].id = socket.id;
            } else {
                rooms[roomId].users.push(userProfile);
            }
            
            socket.data = { roomId, userName: userProfile.name, uid: userProfile.uid };
    
            const state = room.quizState;
            state.readyPlayers.add(socket.id);
            console.log(`[DEBUG: player-ready] readyPlayersに追加。現在のサイズ: ${state.readyPlayers.size}`);
    
    
            const activePlayers = room.users.filter(u => !u.eliminated);
            if (state.readyPlayers.size >= activePlayers.length) {
                console.log(`[DEBUG: player-ready] 全員の準備が完了。最初の質問を送信します。`);
                sendNextQuestion(roomId);
                state.readyPlayers.clear(); // 前回の修正箇所はそのまま
                console.log(`[DEBUG: player-ready] 最初の質問送信後、readyPlayersをクリアしました。`);
            }
        } catch (error) {
            console.error('Player ready/re-join failed:', error);
            socket.emit('join-error', { message: 'クイズへの再参加処理中にエラーが発生しました。' });
        }
    });
    // ★★★ ここまでデバッグ版 ★★★

    socket.on('submit-answer', ({ roomId, answer, questionText }) => {
        const room = rooms[roomId];
        if (!room || !room.quizState.isActive) return;

        const state = room.quizState;
        const question = state.questions[state.currentQuestionIndex];
        const player = room.users.find(u => u.id === socket.id);
        if (!player || player.eliminated) return;

        const playerIdentifier = player.uid || player.name;
        if (state.answeredPlayers.has(playerIdentifier)) {
            console.log(`[Validation] Player ${player.name} has already answered.`);
            return;
        }
        
        if (question && question.question === questionText) {
            state.answeredPlayers.add(playerIdentifier);

            const isCorrect = (question.answer === answer.trim());
            const key = player.uid || player.name;
            
            if (isCorrect) {
                state.scores[key]++;
            } else {
                if (state.difficulty === 'ENDLESS') {
                    player.eliminated = true;
                }
            }
            
            socket.emit('answer-result', { 
                correct: isCorrect, 
                correctAnswer: question.answer,
                trivia: question.trivia,
                eliminated: player.eliminated
            });

            io.to(roomId).emit('player-answered', { name: player.name, isCorrect, eliminated: player.eliminated });

            state.answersReceived++;
            const activePlayers = room.users.filter(u => !u.eliminated);
            if (state.answersReceived >= activePlayers.length) {
                io.to(roomId).emit('all-answers-in');
                state.answersReceived = 0;

                if (state.nextQuestionTimer) clearTimeout(state.nextQuestionTimer);
                state.nextQuestionTimer = setTimeout(() => {
                    proceedToNextQuestion(roomId);
                }, 7000);
            }
        }
    });

socket.on('ready-for-next-question', ({ roomId }) => {
    // ★★★★★ このログが原因特定の鍵です ★★★★★
    console.log(`[DEBUG: ready-for-next-question] イベント受信！ Socket: ${socket.id}`);

    const room = rooms[roomId];
    if (!room || !room.quizState.isActive) return;

    const state = room.quizState;
    state.readyPlayers.add(socket.id);
    
    const activePlayers = room.users.filter(u => !u.eliminated);
    if (state.readyPlayers.size >= activePlayers.length) {
        proceedToNextQuestion(roomId);
    }
});

    socket.on('get-rankings', async () => {
        try {
            const levelSnapshot = await db.collection('users').orderBy('level', 'desc').orderBy('xp', 'desc').limit(100).get();
            const levelRanking = levelSnapshot.docs.map(doc => ({ uid: doc.id, username: doc.data().username, level: doc.data().level }));

            const ratingSnapshot = await db.collection('users').orderBy('rating', 'desc').limit(100).get();
            const ratingRanking = ratingSnapshot.docs.map(doc => ({ uid: doc.id, username: doc.data().username, rating: doc.data().rating }));
            
            const correctSnapshot = await db.collection('users').orderBy('totalCorrect', 'desc').limit(100).get();
            const correctRanking = correctSnapshot.docs.map(doc => ({ uid: doc.id, username: doc.data().username, totalCorrect: doc.data().totalCorrect }));

            const endlessSnapshot = await db.collection('users').orderBy('endlessHighScore', 'desc').limit(100).get();
            const endlessRanking = endlessSnapshot.docs.map(doc => ({ uid: doc.id, username: doc.data().username, endlessHighScore: doc.data().endlessHighScore || 0 }));

            socket.emit('rankings-data', { levelRanking, ratingRanking, correctRanking, endlessRanking });

        } catch (error) {
            console.error("ランキングデータの取得に失敗:", error);
            const urlMatch = error.message.match(/(https?:\/\/[^\s]+)/);
            if (urlMatch) {
                console.error("Firestoreの複合インデックスが必要です。以下のURLにアクセスしてインデックスを作成してください:\n", urlMatch[0]);
            }
            socket.emit('rankings-error', { message: 'ランキングデータの取得に失敗しました。' });
        }
    });

    socket.on('get-user-profile', async ({ uid }) => {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists) {
                socket.emit('user-profile-error', { message: 'ユーザーが見つかりません。' });
                return;
            }
            const data = userDoc.data();
            const userProfile = {
                username: data.username,
                level: data.level || 1,
                rating: data.rating || 1500,
                totalCorrect: data.totalCorrect || 0,
                endlessHighScore: data.endlessHighScore || 0,
                bio: data.bio || "",
                achievements: data.achievements || {}
            };
            socket.emit('user-profile-data', { userData: userProfile });
        } catch (error) {
            console.error("プロフィール取得エラー:", error);
            socket.emit('user-profile-error', { message: 'プロフィールの取得に失敗しました。' });
        }
    });

    socket.on('send-chat-message', ({ roomId, message }) => {
        const room = rooms[roomId];
        const user = room?.users.find(u => u.id === socket.id);

        if (user && message.trim() !== '') {
            io.to(roomId).emit('new-chat-message', {
                sender: user.name,
                message: message
            });
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
        const state = room.quizState;

        // クイズがアクティブな場合は、ページ遷移による一時的な切断とみなし、
        // プレイヤーを即座に削除しないようにする。
        if (state.isActive) {
            console.log(`[Disconnect] Quiz is active. Player ${userName} is likely transitioning. Not removing from user list.`);
            // 注意: この修正により、クイズ中に意図的に離脱したプレイヤーも結果画面までリストに残ります。
            // より厳密に対応するにはタイムアウト処理が必要ですが、まずはバグ修正を優先します。
            return;
        }

        // クイズ中でない場合（待機部屋など）は、従来通りプレイヤーを削除する
        const userInRoom = room.users.find(u => u.id === socket.id);
        if (userInRoom) {
            room.users = room.users.filter(u => u.id !== socket.id);
            io.to(roomId).emit('room-users', room.users);

            if (room.users.length === 0 && !state.isActive) {
                console.log(`[部屋削除] room:${roomId} が空になったため、部屋の情報を削除します。`);
                delete rooms[roomId];
            }
        }
    });
});

// ★★★ ここからデバッグ版に差し替え ★★★
function sendNextQuestion(roomId) {
    const room = rooms[roomId];
    if (!room || !room.quizState.isActive) return;

    const state = room.quizState;
    // ★★★ デバッグログを追加 ★★★
    console.log(`[DEBUG: sendNextQuestion] 関数が呼び出されました。現在の質問インデックス: ${state.currentQuestionIndex}`);

    state.answeredPlayers.clear();
    
    const activePlayers = room.users.filter(u => !u.eliminated);
    if (activePlayers.length === 0) {
        endQuiz(roomId);
        return;
    }

    if (state.difficulty !== 'ENDLESS' && state.currentQuestionIndex >= state.questions.length) {
        endQuiz(roomId);
        return;
    }
    
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
        const correctAnswer = question.answer;
        const hardcodedDummies = question.dummies || [];

        let options = new Set([correctAnswer, ...hardcodedDummies]);

        if (options.size < 3) {
            const allPossibleDummies = allQuizData
                .map(q => q.answer)
                .filter(ans => !options.has(ans));

            while (options.size < 3 && allPossibleDummies.length > 0) {
                const randomIndex = Math.floor(Math.random() * allPossibleDummies.length);
                const randomDummy = allPossibleDummies.splice(randomIndex, 1)[0];
                options.add(randomDummy);
            }
        }
        
        const finalOptions = [...options].sort(() => 0.5 - Math.random());
        questionDataToSend.options = finalOptions;
    }

    console.log(`[DEBUG: sendNextQuestion] クライアントに 'new-question' を送信します。質問インデックス: ${state.currentQuestionIndex}`);
    io.to(roomId).emit('new-question', questionDataToSend);
}

function proceedToNextQuestion(roomId) {
    const room = rooms[roomId];
    if (!room || !room.quizState.isActive) return;

    const state = room.quizState;
    // ★★★ デバッグログを追加 ★★★
    console.log(`[DEBUG: proceedToNextQuestion] 関数が呼び出されました。現在の質問インデックス: ${state.currentQuestionIndex}`);

    // ★★★★★ 最終修正ポイント 2/2 ★★★★★
    // クイズ開始直後の誤作動呼び出しをブロックする
    if (state.quizJustStarted) {
        state.quizJustStarted = false; // フラグを解除して、次回以降は通す
        console.log("Blocking initial erroneous proceed call.");
        return; // ここで処理を中断
    }

    if (state.isProceeding) {
        console.log(`[DEBUG: proceedToNextQuestion] 既に進行中のため、処理を中断します。`);
        return;
    }
    state.isProceeding = true;

    if (state.nextQuestionTimer) {
        clearTimeout(state.nextQuestionTimer);
        state.nextQuestionTimer = null;
    } else {
        if(state.readyPlayers.size < room.users.filter(u => !u.eliminated).length) {
            state.isProceeding = false;
            console.log(`[DEBUG: proceedToNextQuestion] 準備完了プレイヤーが足りないため、処理を中断します。`);
            return;
        }
    }

    state.readyPlayers.clear();
    state.currentQuestionIndex++;
    console.log(`[DEBUG: proceedToNextQuestion] 質問インデックスをインクリメントしました。新しいインデックス: ${state.currentQuestionIndex}`);
    
    const activePlayers = room.users.filter(u => !u.eliminated);
    const gameShouldEnd = state.difficulty === 'ENDLESS' ? activePlayers.length < 1 : state.currentQuestionIndex >= state.questions.length;

    if (!gameShouldEnd) {
        sendNextQuestion(roomId);
    } else {
        endQuiz(roomId);
    }
    
    state.isProceeding = false;
}
// ★★★ ここまでデバッグ版 ★★★


async function endQuiz(roomId) {
    const room = rooms[roomId];
    if (!room || !room.quizState.isActive) return;
    
    const state = room.quizState;
    const finalResults = room.users
        .map(user => {
            const key = user.uid || user.name;
            return {
                uid: user.uid,
                name: user.name,
                score: state.scores[key] || 0,
                isGuest: user.isGuest,
                currentRating: user.rating
            };
        })
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
                if (playerA.score > playerB.score) {
                    Sa = 1;
                } else if (playerA.score === playerB.score) {
                    Sa = 0.5;
                }

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
                    const key = user.uid;
                    const score = state.scores[key] || 0;
                    
                    if (state.difficulty === 'ENDLESS') {
                        if (score > (data.endlessHighScore || 0)) {
                            updateData.endlessHighScore = score;
                        }
                    } else if (score === 10) {
                        const difficulty = state.difficulty;
                        const formatKey = state.answerFormat === 'multiple-choice' ? 'select' : 'input';
                        
                        updateData[`achievements.perfectCounts.${difficulty}.${formatKey}`] = admin.firestore.FieldValue.increment(1);

                        if (difficulty === 'RANDOM') {
                            if (state.answerFormat === 'multiple-choice') {
                                updateData['achievements.perfectRandomSelect'] = true;
                            } else if (state.answerFormat === 'text-input') {
                                updateData['achievements.perfectRandomInput'] = true;
                            }
                        }
                    }

                    if (score > 0) {
                        let xpGained = 10 + (score * 5);
                        if (state.answerFormat === 'text-input') {
                            xpGained *= 3;
                        }

                        if (state.difficulty !== 'ENDLESS' && score === 10) {
                            xpGained += 100;
                            console.log(`[XP Bonus] User ${user.uid} achieved a perfect score! +100 XP`);
                        }

                        if (state.difficulty === 'ENDLESS') {
                            xpGained = Math.floor(xpGained * (score / 10));
                        }
                        
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

                        const newTotalCorrect = (data.totalCorrect || 0) + score;
                        updateData.totalCorrect = newTotalCorrect;
                    }

                    if (ratingChanges[user.uid] !== undefined) {
                        const newRating = Math.round((data.rating || 1500) + ratingChanges[user.uid]);
                        updateData.rating = newRating;
                    }

                    if (Object.keys(updateData).length > 0) {
                        transaction.update(userRef, updateData);
                    }
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
            isActive: false,
            isRanked: false,
            difficulty: 'EASY',
            questions: [], 
            currentQuestionIndex: 0, 
            scores: {},
            answersReceived: 0, 
            readyPlayers: new Set(),
            answerFormat: 'multiple-choice', 
            playerCount: 0,
            nextQuestionTimer: null,
            answeredPlayers: new Set(),
            isProceeding: false,
            quizJustStarted: false // ★★★ 新しいプロパティを追加 ★★★
        };
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバー起動中: http://localhost:${PORT}`);
});
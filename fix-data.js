const fs = require('fs');

// 現在のデータを読み込み
const rawData = require('./quiz-data.json');

const fixedData = [];

for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    
    // "question" プロパティを持っていればクイズデータとみなす
    if (item.question) {
        // 次の要素が座標データ（x, yを持っている）か確認
        const nextItem = rawData[i + 1];
        if (nextItem && nextItem.x !== undefined && nextItem.y !== undefined) {
            // マージして新しい配列に追加
            fixedData.push({ ...item, ...nextItem });
            i++; // 次の要素は処理済みなのでスキップ
        } else {
            // 座標がない場合でも、そのまま追加（あるいはエラーログ出すなど）
            fixedData.push(item);
        }
    }
}

// ファイルに書き出し
fs.writeFileSync('quiz-data-fixed.json', JSON.stringify(fixedData, null, 2)); // 見やすく整形して保存
console.log('変換完了: quiz-data-fixed.json を作成しました。中身を確認して問題なければ quiz-data.json に上書きしてください。');
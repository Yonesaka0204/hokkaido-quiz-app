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

// クイズデータ (変更なし)
const allQuizData = [
    // EASY
    { question: "赤井川村", answer: "あかいがわむら", difficulty: "EASY", dummies: ["あかいかわむら", "せきいがわむら"], trivia: "世界でも珍しいカルデラ盆地に位置し、キロロリゾートがあることで知られる村。" },
    { question: "旭川市", answer: "あさひかわし", difficulty: "EASY", dummies: ["あさひがわし", "きょくせんし"], trivia: "北海道第2の人口を誇る都市で、旭山動物園が全国的に有名。" },
    { question: "池田町", answer: "いけだちょう", difficulty: "EASY", dummies: ["いけたちょう", "いけたまち"], trivia: "十勝ワインの産地として知られ、「ワイン城」と呼ばれる観光施設がある。" },
    { question: "石狩市", answer: "いしかりし", difficulty: "EASY", dummies: ["いしかりいち", "せきしゅうし"], trivia: "毎年夏に大規模な野外音楽フェス「RISING SUN ROCK FESTIVAL」が開催される。" },
    { question: "岩内町", answer: "いわないちょう", difficulty: "EASY", dummies: ["いわうちちょう", "がんないちょう"], trivia: "日本におけるアスパラガス栽培発祥の地とされる町。" },
    { question: "岩見沢市", answer: "いわみざわし", difficulty: "EASY", dummies: ["がんけんざわし", "いわみさわし"], trivia: "世界有数の豪雪地帯であり、どか雪を体感するイベントも開催される。" },
    { question: "浦河町", answer: "うらかわちょう", difficulty: "EASY", dummies: ["うらがわちょう", "ほかわちょう"], trivia: "日本のサラブレッド生産の中心地で、多くの名馬を輩出している。" },
    { question: "雨竜町", answer: "うりゅうちょう", difficulty: "EASY", dummies: ["あまりゅうちょう", "うりょうちょう"], trivia: "広大で美しいヒマワリ畑が有名で、「ひまわりの里」として知られる。" },
    { question: "恵庭市", answer: "えにわし", difficulty: "EASY", dummies: ["けいていし", "えにわいち"], trivia: "「花のまち」として知られ、ガーデニングが盛んな都市。" },
    { question: "えりも町", answer: "えりもちょう", difficulty: "EASY", dummies: ["えりもまち", "えともちょう"], trivia: "襟裳岬（えりもみさき）は、強風で知られ、森進一のヒット曲でも有名。" },
    { question: "遠別町", answer: "えんべつちょう", difficulty: "EASY", dummies: ["とおべつちょう", "えんべつまち"], trivia: "米作りの北限地とされ、もち米の生産が盛ん。" },
    { question: "大空町", answer: "おおぞらちょう", difficulty: "EASY", dummies: ["たいくうちょう", "おおそらちょう"], trivia: "女満別（めまんべつ）空港があり、オホーツク地域の空の玄関口となっている。" },
    { question: "奥尻町", answer: "おくしりちょう", difficulty: "EASY", dummies: ["おくじりちょう", "おうしりちょう"], trivia: "1993年の北海道南西沖地震で大きな被害を受けたが、見事に復興を遂げた島。" },
    { question: "小樽市", answer: "おたるし", difficulty: "EASY", dummies: ["おだるし", "しょうそんし"], trivia: "歴史的な建造物が多く残る運河の街並みが人気の観光都市。" },
    { question: "帯広市", answer: "おびひろし", difficulty: "EASY", dummies: ["おびろいち", "たいこうし"], trivia: "ばんえい競馬が開催される世界で唯一の場所として知られる。" },
    { question: "上川町", answer: "かみかわちょう", difficulty: "EASY", dummies: ["じょうせんちょう", "かみがわちょう"], trivia: "大雪山国立公園の玄関口であり、層雲峡温泉や流星・銀河の滝がある。" },
    { question: "上砂川町", answer: "かみすながわちょう", difficulty: "EASY", dummies: ["かみすなかわちょう", "じょうさがわちょう"], trivia: "かつては炭鉱で栄え、映画『幸福の黄色いハンカチ』のロケ地にもなった。" },
    { question: "上ノ国町", answer: "かみのくにちょう", difficulty: "EASY", dummies: ["かみのこくちょう", "うえのくにちょう"], trivia: "北海道で最も古い歴史を持つ町の一つで、和人が最初に定住した場所とされる。" },
    { question: "北広島市", answer: "きたひろしまし", difficulty: "EASY", dummies: ["ほっこうしまし", "きたひろしまし"], trivia: "プロ野球チーム「北海道日本ハムファイターズ」の新球場があることで注目されている。" },
    { question: "北見市", answer: "きたみし", difficulty: "EASY", dummies: ["ほっけんし", "きたみいち"], trivia: "全国有数のタマネギ産地であり、その生産量は全国シェアの4分の1以上を占める。" },
    { question: "京極町", answer: "きょうごくちょう", difficulty: "EASY", dummies: ["けいごくちょう", "きょうきょくちょう"], trivia: "羊蹄山の湧き水「ふきだし湧水」が名水として知られ、多くの人が水を汲みに訪れる。" },
    { question: "共和町", answer: "きょうわちょう", difficulty: "EASY", dummies: ["ともわちょう", "きょうかずちょう"], trivia: "「らいでんメロン」や「らいでんスイカ」などのブランド農産物が有名。" },
    { question: "栗山町", answer: "くりやまちょう", difficulty: "EASY", dummies: ["りつざんちょう", "くりさんちょう"], trivia: "元プロ野球選手の栗山英樹氏が監督退任後に住居を構え、少年野球場を建設した。" },
    { question: "黒松内町", answer: "くろまつないちょう", difficulty: "EASY", dummies: ["こくしょうないちょう", "くろまつうちちょう"], trivia: "日本で唯一、ブナ林の北限と南限が同居する珍しい自然環境を持つ。" },
    { question: "小清水町", answer: "こしみずちょう", difficulty: "EASY", dummies: ["おしみずちょう", "こすいちょう"], trivia: "濤沸湖（とうふつこ）や原生花園など、オホーツク海の自然が美しい町。" },
    { question: "札幌市", answer: "さっぽろし", difficulty: "EASY", dummies: ["さつぽろし", "さぽろし"], trivia: "北海道の道庁所在地であり、人口約197万人を誇る日本最北の政令指定都市。" },
    { question: "士別市", answer: "しべつし", difficulty: "EASY", dummies: ["さむらいべつし", "しべついち"], trivia: "「サフォーク種」という種類の羊の飼育が盛んで、「羊のまち」として知られる。" },
    { question: "清水町", answer: "しみずちょう", difficulty: "EASY", dummies: ["せいすいちょう", "きよみずちょう"], trivia: "「十勝清水牛玉ステーキ丼」というご当地グルメが人気。" },
    { question: "下川町", answer: "しもかわちょう", difficulty: "EASY", dummies: ["げせんちょう", "しもがわちょう"], trivia: "森林資源を活用した持続可能な町づくりが評価され、SDGs未来都市に選定されている。" },
    { question: "新ひだか町", answer: "しんひだかちょう", difficulty: "EASY", dummies: ["しんにちこうちょう", "あらひだかちょう"], trivia: "静内二十間道路桜並木は、日本最大級の桜並木として知られる。" },
    { question: "砂川市", answer: "すながわし", difficulty: "EASY", dummies: ["すなかわし", "さがわし"], trivia: "高速道路のオアシス「砂川ハイウェイオアシス館」や、菓子メーカーの工場がある。" },
    { question: "せたな町", answer: "せたなちょう", difficulty: "EASY", dummies: ["せたなまち", "せつなちょう"], trivia: "日本の渚百選にも選ばれた「三本杉岩」という奇岩が有名。" },
    { question: "滝川市", answer: "たきかわし", difficulty: "EASY", dummies: ["たきがわし", "ろうせんし"], trivia: "グライダーの飛行が盛んで、日本有数のスカイスポーツの拠点。" },
    { question: "千歳市", answer: "ちとせし", difficulty: "EASY", dummies: ["せんさいし", "ちとしいち"], trivia: "北海道の空の玄関口である新千歳空港がある都市。" },
    { question: "当別町", answer: "とうべつちょう", difficulty: "EASY", dummies: ["とうべつまち", "まさべつちょう"], trivia: "スウェーデンとの交流が深く、夏至祭など北欧の文化に触れられる。" },
    { question: "中川町", answer: "なかがわちょう", difficulty: "EASY", dummies: ["なかがわまち", "ちゅうせんちょう"], trivia: "「首長竜の里」として知られ、クビナガリュウの化石が発見されている。" },
    { question: "長沼町", answer: "ながぬまちょう", difficulty: "EASY", dummies: ["ちょうしょうちょう", "ながぬままち"], trivia: "「マオイの丘公園」からの田園風景が美しく、ドライブスポットとして人気。" },
    { question: "仁木町", answer: "にきちょう", difficulty: "EASY", dummies: ["じんきちょう", "にきまち"], trivia: "さくらんぼの生産量が北海道一で、「さくらんぼの町」として知られる。" },
    { question: "ニセコ町", answer: "にせこちょう", difficulty: "EASY", dummies: ["にせこまち", "じせこちょう"], trivia: "上質なパウダースノーで世界的に有名なスキーリゾート地。" },
    { question: "沼田町", answer: "ぬまたちょう", difficulty: "EASY", dummies: ["ぬまだちょう", "しょうでんちょう"], trivia: "「夜高あんどん祭り」という、巨大な行燈をぶつけ合う勇壮な祭りが開催される。" },
    { question: "函館市", answer: "はこだてし", difficulty: "EASY", dummies: ["はこたてし", "かんたてし"], trivia: "100万ドルの夜景と称される景色が一望できる都市。" },
    { question: "浜中町", answer: "はまなかちょう", difficulty: "EASY", dummies: ["はまなかまち", "ひんちゅうちょう"], trivia: "漫画『ルパン三世』の作者モンキー・パンチ氏の出身地。" },
    { question: "東川町", "answer": "ひがしかわちょう", difficulty: "EASY", "dummies": ["ひがしがわちょう", "とうせんちょう"], trivia: "全国でも珍しい「写真の町」を宣言し、写真文化の振興に力を入れている。" },
    { question: "日高町", answer: "ひだかちょう", difficulty: "EASY", dummies: ["にちこうちょう", "ひだかまち"], trivia: "JRAの競走馬を育成する施設があり、サラブレッド銀座とも呼ばれる。" },
    { question: "深川市", answer: "ふかがわし", difficulty: "EASY", dummies: ["ふかがわいち", "しんせんし"], trivia: "米の生産が盛んで、広大な水田地帯「イルムの丘」が広がる。" },
    { question: "福島町", answer: "ふくしまちょう", difficulty: "EASY", dummies: ["ふくじまちょう", "ふくとうちょう"], trivia: "第41代横綱千代の山、第58代横綱千代の富士という二人の横綱を輩出した。" },
    { question: "北斗市", answer: "ほくとし", difficulty: "EASY", dummies: ["きたとし", "ほくとまち"], trivia: "北海道新幹線の駅「新函館北斗駅」がある、道南の交通の要衝。" },
    { question: "北竜町", answer: "ほくりゅうちょう", difficulty: "EASY", dummies: ["きたりゅうちょう", "ほくりょうちょう"], trivia: "200万本ものヒマワリが咲き誇る「ひまわりの里」は圧巻の景色。" },
    { question: "幌加内町", answer: "ほろかないちょう", difficulty: "EASY", dummies: ["こうかないちょう", "ほろかうちちょう"], trivia: "そばの作付面積・生産量ともに日本一を誇る「そばの里」。" },
    { question: "本別町", answer: "ほんべつちょう", difficulty: "EASY", dummies: ["もとべつちょう", "ほんわけちょう"], trivia: "豆の生産が盛んで、「日本一の豆のまち」を宣言している。" },
    { question: "幕別町", answer: "まくべつちょう", difficulty: "EASY", dummies: ["ばくべつちょう", "まくわけちょう"], trivia: "パークゴルフ発祥の地として知られている。" },
    { question: "松前町", answer: "まつまえちょう", difficulty: "EASY", dummies: ["しょうぜんちょう", "まつさきちょう"], trivia: "北海道で唯一の城「松前城」があり、桜の名所としても有名。" },
    { question: "むかわ町", answer: "むかわちょう", difficulty: "EASY", dummies: ["むかわまち", "むこうちょう"], trivia: "2003年に国宝「むかわ竜」（カムイサウルス）の化石が発見された。" },
    { question: "森町", answer: "もりまち", difficulty: "EASY", dummies: ["しんちょう", "もりちょう"], trivia: "駅弁「いかめし」が全国的に有名。" },
    { question: "八雲町", answer: "やくもちょう", difficulty: "EASY", dummies: ["やぐもちょう", "はっうんちょう"], trivia: "太平洋と日本海、二つの海に面している日本で唯一の町。" },
    { question: "夕張市", answer: "ゆうばりし", difficulty: "EASY", dummies: ["せきちょうし", "ゆばりし"], trivia: "「夕張メロン」の産地として全国的に有名。かつては炭鉱で栄えた。" },
    { question: "陸別町", answer: "りくべつちょう", difficulty: "EASY", dummies: ["ろくべつちょう", "りくわけちょう"], trivia: "冬には-30℃を下回ることもあり、「日本で一番寒い町」として知られる。" },
    { question: "利尻町", answer: "りしりちょう", difficulty: "EASY", dummies: ["りじりちょう", "りしりまち"], trivia: "利尻昆布の産地として有名で、島の中心には利尻山がそびえる。" },
    { question: "利尻富士町", answer: "りしりふじちょう", difficulty: "EASY", dummies: ["りじりとしちょう", "りしりふじさんちょう"], trivia: "利尻島の玄関口の一つで、名山「利尻山」の別名が町名の由来。" },

    // NORMAL
    { question: "愛別町", answer: "あいべつちょう", difficulty: "NORMAL", dummies: ["あいわけちょう", "まなべつちょう"], trivia: "きのこの生産が盛んで、「きのこの里」として知られている。" },
    { question: "芦別市", answer: "あしべつし", difficulty: "NORMAL", dummies: ["ろべつし", "あしわけし"], trivia: "「星の降る里」というキャッチフレーズがあり、美しい星空が自慢。" },
    { question: "厚真町", answer: "あつまちょう", difficulty: "NORMAL", dummies: ["こうしんちょう", "あつままち"], trivia: "サーフィンの人気スポット「浜厚真ビーチ」がある。" },
    { question: "網走市", answer: "あばしりし", difficulty: "NORMAL", dummies: ["もうそうし", "あみはしりし"], trivia: "「網走監獄」は、かつて実在した刑務所を保存公開する博物館。" },
    { question: "今金町", answer: "いまかねちょう", difficulty: "NORMAL", dummies: ["こんきんちょう", "いまがねちょう"], trivia: "「いまかね男爵」というブランドのジャガイモが有名。" },
    { question: "歌志内市", answer: "うたしないし", difficulty: "NORMAL", dummies: ["かしうちし", "うたしうちし"], trivia: "かつては炭鉱で栄えたが、現在は日本で最も人口の少ない市。" },
    { question: "浦臼町", answer: "うらうすちょう", difficulty: "NORMAL", dummies: ["ほきゅうちょう", "うらしろちょう"], trivia: "ワイン用ブドウの生産が盛んで、ワイナリーが集まる「鶴沼ワイナリー」がある。" },
    { question: "浦幌町", answer: "うらほろちょう", difficulty: "NORMAL", dummies: ["うらこうちょう", "ほこうちょう"], trivia: "アイヌ語で「川筋に大きな葉を持つもの」を意味する言葉が地名の由来。" },
    { question: "江差町", answer: "えさしちょう", difficulty: "NORMAL", dummies: ["こうさちょう", "えさしまち"], trivia: "江戸時代にはニシン漁で栄え、「江差追分」という民謡で知られる。" },
    { question: "遠軽町", answer: "えんがるちょう", difficulty: "NORMAL", dummies: ["えんけいちょう", "とおがるちょう"], trivia: "日本最大級のコスモス園「太陽の丘えんがる公園」がある。" },
    { question: "雄武町", answer: "おうむちょう", difficulty: "NORMAL", dummies: ["ゆうぶちょう", "おぶちょう"], trivia: "オホーツク海に面し、毛ガニやホタテなどの海産物が豊富。" },
    { question: "乙部町", answer: "おとべちょう", difficulty: "NORMAL", dummies: ["おつべちょう", "おとべまち"], trivia: "「シラフラ」と呼ばれる白い断崖絶壁が続く海岸線が特徴的。" },
    { question: "上士幌町", answer: "かみしほろちょう", difficulty: "NORMAL", dummies: ["かみじこうちょう", "じょうしほろちょう"], trivia: "熱気球の大会が開催されることで有名で、「バルーンの町」とも呼ばれる。" },
    { question: "上富良野町", answer: "かみふらのちょう", difficulty: "NORMAL", dummies: ["じょうふらのちょう", "かみとらのちょう"], trivia: "「ラベンダーの町」として知られ、夏には美しい紫色の絨毯が広がる。" },
    { question: "木古内町", answer: "きこないちょう", difficulty: "NORMAL", dummies: ["もくないちょう", "きふるうちちょう"], trivia: "江戸時代から続く伝統の「寒中みそぎ祭り」が行われる。" },
    { question: "清里町", answer: "きよさとちょう", difficulty: "NORMAL", dummies: ["せいりちょう", "きよざとちょう"], trivia: "摩周湖の伏流水が水源とされる「神の子池」の青い水は神秘的。" },
    { question: "釧路市", answer: "くしろし", difficulty: "NORMAL", dummies: ["せんろし", "くしろいち"], trivia: "日本最大の湿原「釧路湿原」が広がり、タンチョウの生息地として有名。" },
    { question: "釧路町", answer: "くしろちょう", difficulty: "NORMAL", dummies: ["せんろちょう", "くしろまち"], trivia: "昆布の生産が盛んで、特に「長昆布」が有名。" },
    { question: "剣淵町", answer: "けんぶちちょう", difficulty: "NORMAL", dummies: ["つるぎぶちちょう", "けんふちちょう"], trivia: "絵本をテーマにした町づくりを進めており、「絵本の里」として知られる。" },
    { question: "更別村", answer: "さらべつむら", difficulty: "NORMAL", dummies: ["こうべつそん", "さらわけむら"], trivia: "十勝スピードウェイという国際規格のサーキットがある。" },
    { question: "様似町", answer: "さまにちょう", difficulty: "NORMAL", dummies: ["さまにまち", "さまじちょう"], trivia: "「アポイ岳」は、高山植物が豊富でユネスコ世界ジオパークに認定されている。" },
    { question: "佐呂間町", answer: "さろまちょう", difficulty: "NORMAL", dummies: ["たすろまちょう", "さろちょう"], trivia: "日本で3番目に大きい湖「サロマ湖」があり、ホタテの養殖が盛ん。" },
    { question: "鹿追町", answer: "しかおいちょう", difficulty: "NORMAL", dummies: ["かのえちょう", "しかじゅんちょう"], trivia: "然別湖（しかりべつこ）では、冬に氷上の露天風呂「氷上露天風呂」が現れる。" },
    { question: "鹿部町", answer: "しかべちょう", difficulty: "NORMAL", dummies: ["ろくべちょう", "しかぶちょう"], trivia: "タラコの名産地として知られ、多くの水産加工場がある。" },
    { question: "士幌町", answer: "しほろちょう", difficulty: "NORMAL", dummies: ["じこうちょう", "しこうちょう"], trivia: "「しほろ牛」というブランド牛や、大規模なポテトチップス工場がある。" },
    { question: "島牧村", answer: "しままきむら", difficulty: "NORMAL", dummies: ["とうまきむら", "しままきそん"], trivia: "「日本の滝百選」に選ばれた「賀老の滝」がある。" },
    { question: "斜里町", answer: "しゃりちょう", difficulty: "NORMAL", dummies: ["ななりちょう", "しゃりまち"], trivia: "世界自然遺産「知床」の玄関口となる町の一つ。" },
    { question: "初山別村", answer: "しょさんべつむら", difficulty: "NORMAL", dummies: ["しょやまべつそん", "はつやまわけむら"], trivia: "「しょさんべつ天文台」があり、美しい星空を観測できる。" },
    { question: "白老町", answer: "しらおいちょう", difficulty: "NORMAL", dummies: ["はくろうちょう", "しろおいちょう"], trivia: "アイヌ文化復興の拠点「ウポポイ（民族共生象徴空間）」がある。" },
    { question: "白糠町", answer: "しらぬかちょう", difficulty: "NORMAL", dummies: ["しろぬかちょう", "はくこうちょう"], trivia: "シソの生産が盛んで、「鍛高譚（たんたかたん）」というシソ焼酎の原料産地。" },
    { question: "知内町", answer: "しりうちちょう", difficulty: "NORMAL", dummies: ["ちないちょう", "しりないちょう"], trivia: "「カキの町」として知られ、冬にはカキ祭りが開催される。" },
    { question: "新篠津村", answer: "しんしのつむら", difficulty: "NORMAL", dummies: ["しんじょうしんむら", "あらささづむら"], trivia: "札幌近郊にありながら、広大な田園風景と温泉が楽しめる。" },
    { question: "新得町", answer: "しんとくちょう", difficulty: "NORMAL", dummies: ["あらとくちょう", "しんとくまち"], trivia: "「そばの町」として知られ、毎年「しんとく新そば祭り」が開催される。" },
    { question: "大樹町", answer: "たいきちょう", difficulty: "NORMAL", dummies: ["おおきちょう", "だいじゅちょう"], trivia: "民間のロケット射場があり、「宇宙のまちづくり」を進めている。" },
    { question: "滝上町", answer: "たきのうえちょう", difficulty: "NORMAL", dummies: ["たきかみちょう", "ろうじょうちょう"], trivia: "5月から6月にかけて、町中がピンク色に染まる「芝ざくら滝上公園」が有名。" },
    { question: "伊達市", answer: "だてし", difficulty: "NORMAL", dummies: ["いだてし", "だていち"], trivia: "藍の生産で知られ、「武者人形」などの伝統工芸品がある。" },
    { question: "月形町", answer: "つきがたちょう", difficulty: "NORMAL", dummies: ["げっけいちょう", "つきかたちょう"], trivia: "かつて監獄が置かれ、囚人の労働によって開拓された歴史を持つ。" },
    { question: "津別町", answer: "つべつちょう", difficulty: "NORMAL", dummies: ["しんべつちょう", "つわけちょう"], trivia: "屈斜路湖や摩周湖へのアクセスが良い、林業が盛んな町。" },
    { question: "鶴居村", answer: "つるいむら", difficulty: "NORMAL", dummies: ["かくきょそん", "つるいそん"], trivia: "特別天然記念物タンチョウの越冬地として知られ、多くのカメラマンが訪れる。" },
    { question: "当麻町", answer: "とうまちょう", difficulty: "NORMAL", dummies: ["とうあさちょう", "まさたちょう"], trivia: "「でんすけすいか」という、黒皮で甘みの強い高級スイカの産地。" },
    { question: "豊浦町", answer: "とようらちょう", difficulty: "NORMAL", dummies: ["ほうほちょう", "とようらまち"], trivia: "「いちごの町」として知られ、国道沿いにはいちご狩り農園が並ぶ。" },
    { question: "豊頃町", answer: "とよころちょう", difficulty: "NORMAL", dummies: ["ほうけいちょう", "とよごろちょう"], trivia: "冬の十勝川河口に現れる「ジュエリーアイス」という現象で有名。" },
    { question: "豊富町", answer: "とよとみちょう", difficulty: "NORMAL", dummies: ["ほうふちょう", "とよとみまち"], trivia: "日本最北の温泉郷「豊富温泉」があり、石油分を含む珍しい泉質。" },
    { question: "中札内村", answer: "なかさつないむら", difficulty: "NORMAL", dummies: ["ちゅうさつないそん", "なかふだうちむら"], trivia: "六花亭が運営する「中札内美術村」など、アートスポットが点在する。" },
    { question: "中標津町", "answer": "なかしべつちょう", "difficulty": "NORMAL", "dummies": ["なかひょうつちょう", "ちゅうしべつちょう"], trivia: "人口よりも牛の数の方が多い、日本有数の酪農地帯。" },
    { question: "中頓別町", answer: "なかとんべつちょう", difficulty: "NORMAL", dummies: ["ちゅうとんべつちょう", "なかどんべつちょう"], trivia: "「中頓別鍾乳洞」は、北海道で唯一の観光鍾乳洞。" },
    { question: "中富良野町", answer: "なかふらのちょう", difficulty: "NORMAL", dummies: ["なかとらのちょう", "ちゅうふらのちょう"], trivia: "「ファーム富田」をはじめとする、多くのラベンダー畑がある。" },
    { question: "南幌町", answer: "なんぽろちょう", difficulty: "NORMAL", dummies: ["みなみほろちょう", "なんこうちょう"], trivia: "キャベツの生産が盛んで、「なんぽろキャベツ」としてブランド化されている。" },
    { question: "根室市", answer: "ねむろし", difficulty: "NORMAL", dummies: ["こんしつし", "ねむろいち"], trivia: "本土最東端の納沙布岬（のさっぷみさき）があり、最も早く朝日が見られる。" },
    { question: "登別市", answer: "のぼりべつし", difficulty: "NORMAL", dummies: ["とうべつし", "のぼりわけし"], trivia: "「地獄谷」など、多くの源泉から温泉が湧き出す日本有数の温泉地。" },
    { question: "羽幌町", answer: "はぼろちょう", difficulty: "NORMAL", dummies: ["うこうちょう", "はねほろちょう"], trivia: "甘エビの水揚げ量が日本一で、「甘エビの町」として知られる。" },
    { question: "浜頓別町", answer: "はまとんべつちょう", difficulty: "NORMAL", dummies: ["ひんとんべつちょう", "はまどんべつちょう"], trivia: "日本最北の大規模な淡水湖「クッチャロ湖」は、白鳥の飛来地。" },
    { question: "美幌町", answer: "びほろちょう", difficulty: "NORMAL", dummies: ["みほろちょう", "びこうちょう"], trivia: "屈斜路湖から流れ出す美幌川の景色が美しい「美幌峠」が有名。" },
    { question: "広尾町", answer: "ひろおちょう", difficulty: "NORMAL", dummies: ["こうびちょう", "ひろおまち"], trivia: "ノルウェーから認定された「サンタランド」があり、一年中クリスマスムードが楽しめる。" },
    { question: "富良野市", answer: "ふらのし", difficulty: "NORMAL", dummies: ["とらのし", "ふらのいち"], trivia: "ドラマ『北の国から』のロケ地として全国的に有名。" },
    { question: "別海町", answer: "べつかいちょう", difficulty: "NORMAL", dummies: ["わけうみちょう", "べっかいちょう"], trivia: "生乳生産量が日本一で、広大な牧草地が広がる「酪農の町」。" },
    { question: "三笠市", answer: "みかさし", difficulty: "NORMAL", dummies: ["さんりゅうし", "みかさいち"], trivia: "アンモナイトなどの化石が多く産出され、市立博物館が人気。" },
    { question: "南富良野町", answer: "みなみふらのちょう", difficulty: "NORMAL", dummies: ["なんふらのちょう", "みなみとらのちょう"], trivia: "カヌーやラフティングなど、空知川でのウォータースポーツが盛ん。" },
    { question: "室蘭市", answer: "むろらんし", difficulty: "NORMAL", dummies: ["しつらんし", "むろらんいち"], trivia: "室蘭やきとりや室蘭港の夜景などが有名な、鉄鋼業で栄えた都市。" },
    { question: "芽室町", answer: "めむろちょう", difficulty: "NORMAL", dummies: ["がしつちょう", "めむろまち"], trivia: "トウモロコシの生産が盛んで、ゲートボール発祥の地でもある。" },
    { question: "紋別市", answer: "もんべつし", difficulty: "NORMAL", dummies: ["あやべつし", "もんわけし"], trivia: "冬には流氷を砕きながら進む「ガリンコ号」という砕氷船が運行される。" },
    { question: "湧別町", answer: "ゆうべつちょう", difficulty: "NORMAL", dummies: ["わきべつちょう", "ようべつちょう"], trivia: "日本最古のチューリップ公園があり、春には色とりどりの花が咲き誇る。" },
    { question: "由仁町", answer: "ゆにちょう", difficulty: "NORMAL", dummies: ["よしひとちょう", "ゆにまち"], trivia: "イギリス風の庭園「ゆにガーデン」が有名。" },
    { question: "余市町", answer: "よいちちょう", difficulty: "NORMAL", dummies: ["あまりいちちょう", "よいちまち"], trivia: "ニッカウヰスキーの創業者、竹鶴政孝がウイスキー造りを始めた地。" },
    { question: "羅臼町", answer: "らうすちょう", difficulty: "NORMAL", dummies: ["らくだちょう", "らうすまち"], trivia: "世界自然遺産「知床」の玄関口で、クジラやシャチのウォッチングが楽しめる。" },
    { question: "蘭越町", answer: "らんこしちょう", difficulty: "NORMAL", dummies: ["らんえつちょう", "らんこしまち"], trivia: "「らんこし米」というブランド米の産地として知られる。" },
    
    // HARD
    { question: "小平町", answer: "おびらちょう", difficulty: "HARD", dummies: ["しょうへいちょう", "こひらちょう"], trivia: "巨大なアンモナイトの化石が多数発掘されており、「化石の里」とも呼ばれる。" },
    { question: "赤平市", answer: "あかびらし", difficulty: "HARD", dummies: ["せきへいし", "あかひらし"], trivia: "かつて炭鉱で栄え、その産業遺産である立坑櫓（たてこうやぐら）が保存されている。" },
    { question: "安平町", answer: "あびらちょう", difficulty: "HARD", dummies: ["やすひらちょう", "あんぺいちょう"], trivia: "競走馬の育成が盛んで、「社台スタリオンステーション」などがある。" },
    { question: "枝幸町", answer: "えさしちょう", difficulty: "HARD", dummies: ["えだゆきちょう", "しこうちょう"], trivia: "毛ガニの水揚げ量が日本一を誇る、オホーツク海沿いの町。" },
    { question: "置戸町", answer: "おけとちょう", difficulty: "HARD", dummies: ["おきどちょう", "ちこちょう"], trivia: "「おけクラフト」という地域ブランドの木工芸品が有名。" },
    { question: "神恵内村", answer: "かもえないむら", difficulty: "HARD", dummies: ["じんないむら", "かみえないむら"], trivia: "アイヌ語の「カムイ・ナイ（神の川）」に由来するとされる美しい名前の村。" },
    { question: "喜茂別町", answer: "きもべつちょう", difficulty: "HARD", dummies: ["きもわけちょう", "きもべつまち"], trivia: "アスパラガスが特産品で、「アスパラの町」として知られる。" },
    { question: "猿払村", answer: "さるふつむら", difficulty: "HARD", dummies: ["えんふつそん", "さるはらいむら"], trivia: "ホタテの水揚げ量が日本一で、豊かな漁業資源を誇る日本最北の村。" },
    { question: "標茶町", answer: "しべちゃちょう", difficulty: "HARD", dummies: ["ひょうちゃちょう", "しべちゃまち"], trivia: "釧路湿原に隣接し、酪農と競走馬の生産が盛んな町。" },
    { question: "標津町", answer: "しべつちょう", difficulty: "HARD", dummies: ["ひょうつちょう", "しるべつちょう"], trivia: "サケの遡上が見られる「標津サーモン科学館」がある。" },
    { question: "新十津川町", answer: "しんとつかわちょう", difficulty: "HARD", dummies: ["しんとつがわちょう", "あらとつかわちょう"], trivia: "明治時代に奈良県十津川村から移住してきた人々によって開かれた町。" },
    { question: "壮瞥町", answer: "そうべつちょう", difficulty: "HARD", dummies: ["そうだいちょう", "そうべつまち"], trivia: "有珠山の麓にあり、リンゴやサクランボなどの果物栽培が盛ん。" },
    { question: "鷹栖町", answer: "たかすちょう", difficulty: "HARD", dummies: ["ようすちょう", "たかすまち"], trivia: "トマトジュース「オオカミの桃」の産地として知られる。" },
    { question: "天塩町", answer: "てしおちょう", difficulty: "HARD", dummies: ["あまじおちょう", "てんえんちょう"], trivia: "しじみの名産地として知られる天塩川の河口に位置する。" },
    { question: "弟子屈町", answer: "てしかがちょう", difficulty: "HARD", dummies: ["でしくつちょう", "てしかちょう"], trivia: "摩周湖と屈斜路湖という、北海道を代表する二つのカルデラ湖を持つ。" },
    { question: "洞爺湖町", answer: "とうやこちょう", difficulty: "HARD", dummies: ["どうやこちょう", "とうやこまち"], trivia: "2008年にG8サミットが開催されたことで国際的に知られるようになった。" },
    { question: "苫小牧市", answer: "とまこまいし", difficulty: "HARD", dummies: ["せんしょうぼくし", "とまきまいし"], trivia: "製紙業が盛んで、アイスホッケーの強豪チームがある「氷都」。" },
    { question: "苫前町", answer: "とままえちょう", difficulty: "HARD", dummies: ["せんぜんちょう", "とまざきちょう"], trivia: "巨大な風力発電の風車が立ち並ぶ風景が特徴的。" },
    { question: "泊村", answer: "とまりむら", difficulty: "HARD", dummies: ["はくそん", "とまりそん"], trivia: "北海道電力の泊原子力発電所がある、道内唯一の原発立地自治体。" },
    { question: "奈井江町", answer: "ないえちょう", difficulty: "HARD", dummies: ["ならいえちょう", "ないえまち"], trivia: "アイヌ語で「川の湾曲部」を意味する言葉に由来する。" },
    { question: "七飯町", answer: "ななえちょう", difficulty: "HARD", dummies: ["しちいいちょう", "ななめしちょう"], trivia: "日本で初めて西洋リンゴが栽培された場所であり、男爵いもの発祥の地でもある。" },
    { question: "名寄市", answer: "なよろし", difficulty: "HARD", dummies: ["めいきし", "なよりし"], trivia: "冬は極寒で、ダイヤモンドダストなどの気象現象が見られることがある。" },
    { question: "美瑛町", answer: "びえいちょう", difficulty: "HARD", dummies: ["みえちょう", "びえいまち"], trivia: "「パッチワークの路」や「青い池」など、丘の風景が美しい人気の観光地。" },
    { question: "東神楽町", answer: "ひがしかぐらちょう", difficulty: "HARD", dummies: ["とうじんらくちょう", "ひがしじんらくちょう"], trivia: "「花のまち」として知られ、家具や木工業も盛ん。「旭川空港」の所在地でもある。" },
    { question: "美深町", answer: "びふかちょう", difficulty: "HARD", dummies: ["みふかちょう", "びしんちょう"], trivia: "トロッコに乗って廃線跡を走る「トロッコ王国美深」が人気。" },
    { question: "平取町", answer: "びらとりちょう", difficulty: "HARD", dummies: ["ひらとりちょう", "へいしゅちょう"], trivia: "アイヌ文化が色濃く残る地域で、アイヌ語地名研究家・萱野茂氏の出身地。" },
    { question: "古平町", answer: "ふるびらちょう", difficulty: "HARD", dummies: ["こひらちょう", "ふるひらちょう"], trivia: "タラコなどの水産加工業が盛んな、積丹半島にある町。" },
    { question: "幌延町", answer: "ほろのべちょう", difficulty: "HARD", dummies: ["こうえんちょう", "ほろのぶちょう"], trivia: "地下深くに高レベル放射性廃棄物を処分するための研究施設がある。" },
    { question: "増毛町", answer: "ましけちょう", difficulty: "HARD", dummies: ["ぞうもうちょう", "ますけちょう"], trivia: "暑寒別岳の伏流水で造られる日本酒が有名で、歴史的な建造物も多い。" },
    { question: "真狩村", answer: "まっかりむら", difficulty: "HARD", dummies: ["しんかりむら", "まかりむら"], trivia: "歌手の細川たかしさんの出身地として知られ、彼の銅像が建てられている。" },
    { question: "留寿都村", answer: "るすつむら", difficulty: "HARD", dummies: ["とめことむら", "るすつそん"], trivia: "遊園地やスキー場、ゴルフ場などを備えた大規模リゾート施設がある。" },
    { question: "留萌市", answer: "るもいし", difficulty: "HARD", dummies: ["りゅうほうし", "るもえし"], trivia: "「かずの子」の生産量が日本一で、夕日の名所としても知られる。" },
    { question: "礼文町", answer: "れぶんちょう", difficulty: "HARD", dummies: ["れいぶんちょう", "れもんちょう"], trivia: "「花の浮島」と呼ばれ、レブンアツモリソウなど固有の高山植物が多い。" },
    { question: "稚内市", answer: "わっかないし", difficulty: "HARD", dummies: ["ちないし", "わくないし"], trivia: "日本最北端の地「宗谷岬」がある都市。" },
    { question: "和寒町", answer: "わっさむちょう", difficulty: "HARD", dummies: ["わさむちょう", "わかんちょう"], trivia: "カボチャの作付面積が日本一で、「カボチャの町」として知られる。" },
    { question: "茨戸", answer: "ばらと", difficulty: "HARD", dummies: ["いばらと", "しと"], trivia: "札幌市北区にあり、かつて石狩川だった川が三日月湖になった場所。" },
    { question: "簾舞", answer: "みすまい", difficulty: "HARD", dummies: ["れんぶ", "すだれまい"], trivia: "札幌市南区にある地名で、開拓使が付けた雅な名前。" },
    { question: "発寒", answer: "はっさむ", difficulty: "HARD", dummies: ["はっかん", "ほさむ"], trivia: "札幌市西区の地名。アイヌ語で「桜の木のあるところ」を意味する言葉が由来。" },
    { question: "庵原町", answer: "いおはらちょう", difficulty: "HARD", dummies: ["あんげんちょう", "いのはらちょう"], trivia: "函館市にある地名。静岡県の庵原郡からの移住者が開いたとされる。" },
    { question: "神居古潭", answer: "かむいこたん", difficulty: "HARD", dummies: ["じんきょこたん", "かみいこたん"], trivia: "旭川市にある景勝地。アイヌ語で「神の住まう場所」を意味する。" },
    { question: "大楽毛", answer: "おたのしけ", difficulty: "HARD", dummies: ["だいがくげ", "おおたのしげ"], trivia: "釧路市にある地名。アイヌ語で「交易をする所」を意味する言葉が由来。" },
    { question: "徹別", answer: "てしべつ", difficulty: "HARD", dummies: ["てつべつ", "とおるべつ"], trivia: "釧路市にある地名。アイヌ語で「梁（やな）のある川」を意味する。" },
    { question: "幣舞町", answer: "ぬさまいちょう", difficulty: "HARD", dummies: ["へいまいちょう", "ぬさまえちょう"], trivia: "釧路市の中心部にある地名で、夕日の名所「幣舞橋」がある。" },
    { question: "相内町", answer: "あいのないちょう", difficulty: "HARD", dummies: ["あいうちちょう", "そうないちょう"], trivia: "北見市にある地名。アイヌ語で「イラクサのある所」が由来。" },
    { question: "呼人", answer: "よびと", difficulty: "HARD", dummies: ["こじん", "よぶと"], trivia: "網走市にある地名。アイヌ語で「傾斜地」を意味する。" },
    { question: "対雁", answer: "ついしかり", difficulty: "HARD", dummies: ["たいがん", "つしかり"], trivia: "江別市にある地名。アイヌ語で「林のある所」を意味する。" },
    { question: "奥潭", answer: "おこたん", difficulty: "HARD", dummies: ["おくふち", "おくたん"], trivia: "千歳市にあり、支笏湖の奥にある美しい入江を指す地名。" },
    { question: "幌美内", answer: "ほろぴない", difficulty: "HARD", dummies: ["こうびない", "ほろみうち"], trivia: "千歳市にあり、支笏湖東岸に位置する地域名。" },
    { question: "神威", answer: "かもい", difficulty: "HARD", dummies: ["しんい", "かむい"], trivia: "積丹（しゃこたん）半島にある岬の名前。「神の威厳」を意味する。" },
    { question: "一已町", answer: "いちやんちょう", difficulty: "HARD", dummies: ["いちいちょう", "いっこちょう"], trivia: "深川市にある地名。アイヌ語で「サケの産卵場所」を意味する。" },
    { question: "富岸町", answer: "とんけしちょう", difficulty: "HARD", dummies: ["ふきしちょう", "とみがしちょう"], trivia: "登別市にある地名。アイヌ語で「崖の下」を意味する。" },
    { question: "稀府", answer: "まれっぷ", difficulty: "HARD", dummies: ["きふ", "まれふ"], trivia: "伊達市にある地名。アイヌ語で「東風の吹く所」を意味する。" },
    { question: "発足", answer: "はったり", difficulty: "HARD", dummies: ["ほっそく", "はつあし"], trivia: "後志地方の共和町にある地名。アイヌ語で「ワシのいる所」が由来。" },
    { question: "望来", answer: "もうらい", difficulty: "HARD", dummies: ["ぼうらい", "みらい"], trivia: "石狩市にある地名。アイヌ語で「静かな入江」を意味する。" },
    { question: "安瀬", answer: "やそすけ", difficulty: "HARD", dummies: ["あんせ", "やすせ"], trivia: "留萌市にある地名。アイヌ語で「風が吹きつける崖」を意味する。" },
    { question: "軍川", answer: "いくさがわ", difficulty: "HARD", dummies: ["ぐんせん", "いくさかわ"], trivia: "七飯町にある地名。箱館戦争の際に戦場になったことが由来。" },
    { question: "国縫", answer: "くんぬい", difficulty: "HARD", dummies: ["こくぬい", "くにぬい"], trivia: "長万部町にある地名。アイヌ語で「黒い川」を意味する。" },
    { question: "小砂子", answer: "ちいさご", difficulty: "HARD", dummies: ["こすなご", "しょうさし"], trivia: "知内町にある地名。アイヌ語で「砂浜の端」を意味する。" },
    { question: "貝取澗", answer: "かいとりま", difficulty: "HARD", dummies: ["かいとりかん", "ばいしゅかん"], trivia: "八雲町にある地名。アイヌ語で「交易をする谷川」を意味する。" },
    { question: "梨野舞納", answer: "りやむない", difficulty: "HARD", dummies: ["りのまいな", "なしのまいな"], trivia: "せたな町にある地名。アイヌ語で「崖の間の川」を意味する。" },
    { question: "老古美", answer: "おいこみ", difficulty: "HARD", dummies: ["ろうこび", "おいごみ"], trivia: "新ひだか町にある地名。アイヌ語で「神のいる美しい山」を意味する。" },
    { question: "然別", answer: "しかりべつ", difficulty: "HARD", dummies: ["ぜんべつ", "しかわけ"], trivia: "鹿追町にある湖の名前。アイヌ語で「自分を囲む川」を意味する。" },
    { question: "苫鵡", answer: "とまむ", difficulty: "HARD", dummies: ["せんむ", "とまむい"], trivia: "新得町にある地名。アイヌ語で「湿地」を意味する。" },
    { question: "母子里", answer: "もしり", difficulty: "HARD", dummies: ["はこり", "ぼしり"], trivia: "幌加内町にある地域で、日本最寒記録（-41.2℃）を持つ。" },
    { question: "天売", answer: "てうり", difficulty: "HARD", dummies: ["てんばい", "あまうり"], trivia: "羽幌町の沖合にある島で、海鳥の楽園として知られる。" },
    { question: "雄信内", answer: "おのぶない", difficulty: "HARD", dummies: ["ゆうしんない", "おのぶち"], trivia: "天塩町にある地名。アイヌ語で「川尻に小屋のある川」を意味する。" },
    { question: "振老", answer: "ふらおい", difficulty: "HARD", dummies: ["しんろう", "ふりおい"], trivia: "天塩町にある地名。アイヌ語で「坂道の所」を意味する。" },
    { question: "壮瞥", answer: "そうべつ", difficulty: "HARD", dummies: ["そうだい", "そうわけ"], trivia: "壮瞥町にある地名。アイヌ語で「滝の川」を意味する。" },
    { question: "農野牛", answer: "のやうし", difficulty: "HARD", dummies: ["のうのうし", "のやぎゅう"], trivia: "広尾町にある地名。アイヌ語で「野の中の川」を意味する。" },
    { question: "大誉地", answer: "およち", difficulty: "HARD", dummies: ["たいよち", "おおほまれち"], trivia: "足寄町にある地名。アイヌ語で「温泉のある川」を意味する。" },
    { question: "螺湾", answer: "らわん", difficulty: "HARD", dummies: ["ねじわん", "らわ"], trivia: "足寄町にある地名。アイヌ語で「低い川」を意味し、巨大なフキ「ラワンぶき」が有名。" },
    { question: "跡永賀", answer: "あとえか", difficulty: "HARD", dummies: ["せきえいが", "あとえいが"], trivia: "中川町にある地名。アイヌ語で「鹿の足跡のある川」を意味する。" },
    { question: "鐺別", answer: "とうべつ", difficulty: "HARD", dummies: ["こじりべつ", "とべつ"], trivia: "幕別町にある地名。アイヌ語で「川尻に沼のある川」を意味する。" },
    { question: "最栄利別", answer: "もえりべつ", difficulty: "HARD", dummies: ["さいえいりべつ", "もえわけ"], trivia: "むかわ町にある地名。アイヌ語で「流れの静かな川」を意味する「モ・イ・ペッ」が由来とされる。" },
    { question: "雪裡", answer: "せつり", difficulty: "HARD", dummies: ["ゆきさと", "せつりない"], trivia: "鶴居村にある地名。アイヌ語で「薬草（トリカブト）の川」を意味する。" },
    { question: "紗那", answer: "しゃな", difficulty: "HARD", dummies: ["さな", "しゃな"], trivia: "北方領土・択捉島にある地名。アイヌ語で「川下の村」を意味する。" },

    // SUPER
    { question: "椴法華", answer: "とどほっけ", difficulty: "SUPER", dummies: ["とどほうか", "たんぽっけ"], trivia: "函館市にある地名。アイヌ語で「トドのいる所」が由来。" },
    { question: "蘂取", answer: "しべとろ", difficulty: "SUPER", dummies: ["ずいしゅ", "しべとり"], trivia: "北方領土・択捉島にある地名。アイヌ語で「大きい」を意味する。" },
    { question: "御札部", answer: "おさっぺ", difficulty: "SUPER", dummies: ["ごさつべ", "みふだべ"], trivia: "森町にある地名。アイヌ語で「川尻に沼のある川」が由来。" },
    { question: "忍路", answer: "おしょろ", difficulty: "SUPER", dummies: ["にんろ", "にんじ"], trivia: "小樽市にある地名。アイヌ語で「窪んだ所」を意味する。" },
    { question: "川汲町", answer: "かっくみちょう", difficulty: "SUPER", dummies: ["かわくみちょう", "せんきゅうちょう"], trivia: "函館市にある地名。アイヌ語で「ワシのいる川」が由来。" },
    { question: "足寄町", answer: "あしょろちょう", difficulty: "SUPER", dummies: ["あしよりちょう", "そくきちょう"], trivia: "日本一面積の広い町で、歌手・松山千春さんの出身地。" },
    { question: "厚岸町", answer: "あっけしちょう", difficulty: "SUPER", dummies: ["こうがんちょう", "あつけしちょう"], trivia: "カキの名産地として知られ、一年中カキが食べられる。" },
    { question: "厚沢部町", answer: "あっさぶちょう", difficulty: "SUPER", dummies: ["あつさわべちょう", "こうたくぶちょう"], trivia: "メークインという品種のジャガイモ発祥の地。" },
    { question: "興部町", answer: "おこっぺちょう", difficulty: "SUPER", dummies: ["こうぶちょう", "おこべちょう"], trivia: "酪農が盛んで、乳製品の加工が有名。" },
    { question: "長万部町", answer: "おしゃまんべちょう", difficulty: "SUPER", dummies: ["ちょうまんぶちょう", "ながまんべちょう"], trivia: "「かにめし」という駅弁が有名で、道南の交通の要衝。" },
    { question: "音威子府村", answer: "おといねっぷむら", difficulty: "SUPER", dummies: ["おんいこふむら", "おといねこむら"], trivia: "人口が北海道で最も少ない村。黒い色の「音威子府そば」が有名。" },
    { question: "音更町", answer: "おとふけちょう", difficulty: "SUPER", dummies: ["おんこうちょう", "おとぶけちょう"], trivia: "アイヌ語で「毛髪の生える所」を意味し、十勝川温泉がある。" },
    { question: "倶知安町", answer: "くっちゃんちょう", difficulty: "SUPER", dummies: ["ぐちあんちょう", "くちあんちょう"], trivia: "豪雪地帯として知られ、ニセコエリアの中心的な町。" },
    { question: "訓子府町", answer: "くんねっぷちょう", difficulty: "SUPER", dummies: ["くんしふちょう", "くんねふちょう"], trivia: "「くんねっぷメロン」が特産品。玉ねぎ栽培も盛ん。" },
    { question: "占冠村", answer: "しむかっぷむら", difficulty: "SUPER", dummies: ["せんかんむら", "うらかんむら"], trivia: "「星野リゾート トマム」があることで知られるリゾート地。" },
    { question: "積丹町", answer: "しゃこたんちょう", difficulty: "SUPER", dummies: ["せきたんちょう", "つみたんちょう"], trivia: "「積丹ブルー」と称される美しい青色の海が有名。ウニの名産地。" },
    { question: "寿都町", answer: "すっつちょう", difficulty: "SUPER", dummies: ["じゅとちょう", "ことぶきちょう"], trivia: "風が強いことで知られ、風力発電が盛んな町。" },
    { question: "秩父別町", answer: "ちっぷべつちょう", difficulty: "SUPER", dummies: ["ちちぶべつちょう", "ちちぶわけちょう"], trivia: "「ローズガーデンちっぷべつ」というバラ園が有名。" },
    { question: "新冠町", answer: "にいかっぷちょう", difficulty: "SUPER", dummies: ["しんかんちょう", "にいかんちょう"], trivia: "サラブレッドの生産地として有名で、多くの牧場が広がる。" },
    { question: "西興部村", answer: "にしおこっぺむら", difficulty: "SUPER", dummies: ["せいこうぶそん", "にしおこべむら"], trivia: "「夢の森公園」など、木をテーマにした施設が多い。" },
    { question: "比布町", answer: "ぴっぷちょう", difficulty: "SUPER", dummies: ["ひふちょう", "ひふまち"], trivia: "スキーヤーの聖地とも呼ばれる「ぴっぷスキー場」がある。" },
    { question: "美唄市", answer: "びばいし", difficulty: "SUPER", dummies: ["みばいうたし", "びばいいち"], trivia: "かつて炭鉱で栄え、「美唄焼き鳥」というご当地グルメが有名。" },
    { question: "妹背牛町", answer: "もせうしちょう", difficulty: "SUPER", dummies: ["まいはいぎゅうちょう", "いもせうしちょう"], trivia: "稲作が盛んで、カーリングが町技になっている。" },
    { question: "知茶布", answer: "ちちゃっぷ", difficulty: "SUPER", dummies: ["ちさっぷ", "ともちゃっぷ"], trivia: "釧路市にある地名。アイヌ語で「我々が拝むもの」が由来。" },
    { question: "馬主来", answer: "ぱしくる", difficulty: "SUPER", dummies: ["うまぬしらい", "ばしゅらい"], trivia: "釧路市にある地名。アイヌ語で「浜へ出る道」が由来。" },
    { question: "留辺蘂町", answer: "るべしべちょう", difficulty: "SUPER", dummies: ["とめべしべちょう", "りゅうへんずちょう"], trivia: "北見市にある地域。山の水族館や、エゾムラサキツツジの群生地で知られるおんねゆ温泉がある。" },
    { question: "癸巳町", answer: "きしちょう", difficulty: "SUPER", dummies: ["みずのとみちょう", "かめみちょう"], trivia: "三笠市にある地名。開拓された年の干支（みずのとみ）に由来する。" },
    { question: "奔別町", answer: "ぽんべつちょう", difficulty: "SUPER", dummies: ["ほんべつちょう", "ぽんわけちょう"], trivia: "三笠市にある地名。アイヌ語で「小さい川」を意味する。" },
    { question: "温根沼", answer: "おんねとう", difficulty: "SUPER", dummies: ["おんねぬま", "あったかこんぬま"], trivia: "根室市にある、オオハクチョウが飛来する湖沼。" },
    { question: "珸瑶瑁", answer: "ごようまい", difficulty: "SUPER", dummies: ["ごようぼう", "ごようまい"], trivia: "根室市にある地名。アイヌ語で「蛇のいる所」が由来。" },
    { question: "納沙布", answer: "のさっぷ", difficulty: "SUPER", dummies: ["のうしゃふ", "おさっぷ"], trivia: "本土最東端の岬の名前。「岬のそば」を意味するアイヌ語が由来。" },
    { question: "穂香", answer: "ほにおい", difficulty: "SUPER", dummies: ["ほのか", "すいか"], trivia: "根室市にある地名。アイヌ語で「下の川」を意味する。" },
    { question: "歯舞", answer: "はぼまい", difficulty: "SUPER", dummies: ["しばまい", "はまい"], trivia: "根室市にある地名。アイヌ語で「流氷のある所」が由来。" },
    { question: "支寒内", answer: "ししゃもない", difficulty: "SUPER", dummies: ["しこうない", "しさむない"], trivia: "恵庭市にある地名。アイヌ語で「大きな川筋」が由来。" },
    { question: "輪厚", answer: "わっつ", difficulty: "SUPER", dummies: ["わこう", "りんこう"], trivia: "北広島市にある地名。アイヌ語で「声の聞こえる所」が由来。" },
    { question: "生振", answer: "おやふる", difficulty: "SUPER", dummies: ["せいしん", "なまふり"], trivia: "石狩市にある地名。アイヌ語で「羊歯（しだ）の多い所」が由来。" },
    { question: "濃昼", answer: "ごきびる", difficulty: "SUPER", dummies: ["のうちゅう", "こいひる"], trivia: "石狩市にある地名。アイヌ語で「山の影」を意味する。" },
    { question: "聚富", answer: "しっぷ", difficulty: "SUPER", dummies: ["じゅふ", "あつとみ"], trivia: "石狩市にある地名。アイヌ語で「ハシバミの実のなる所」が由来。" },
    { question: "花畔", answer: "ばんなぐろ", difficulty: "SUPER", dummies: ["かはん", "はなぐろ"], trivia: "石狩市にある地名。アイヌ語で「川下の人々の村」が由来。" },
    { question: "正利冠", answer: "まさりかっぷ", difficulty: "SUPER", dummies: ["しょうりかん", "せいりかん"], trivia: "今金町にある地名。アイヌ語で「円い山」が由来。" },
    { question: "美利河", answer: "ぴりか", difficulty: "SUPER", dummies: ["みりか", "びりかわ"], trivia: "今金町にある地名。アイヌ語で「美しい石の川」が由来。" },
    { question: "歌棄町", answer: "うたすつちょう", difficulty: "SUPER", dummies: ["かきちょう", "うたすてちょう"], trivia: "寿都町にある地名。アイヌ語で「砂浜の端」が由来。" },
    { question: "千走", answer: "ちわせ", difficulty: "SUPER", dummies: ["ちそう", "せんそう"], trivia: "島牧村にある地名。アイヌ語で「我々が掘るもの（鉱物）」が由来。" },
    { question: "熱郛", answer: "ねっぷ", difficulty: "SUPER", dummies: ["ねつふ", "あつぷ"], trivia: "黒松内町にある地名。アイヌ語で「川の本流」が由来。" },
    { question: "堀株村", answer: "ほりかっぷむら", difficulty: "SUPER", dummies: ["ほりかぶむら", "ほりきむら"], trivia: "古平町にある地名。アイヌ語で「クジラのいる所」が由来。" },
    { question: "晩生内", answer: "おそきない", difficulty: "SUPER", dummies: ["ばんせいない", "おそくない"], trivia: "浦臼町にある地名。アイヌ語で「川尻に沼のある川」が由来。" },
    { question: "留久", answer: "るうく", difficulty: "SUPER", dummies: ["るきゅう", "とめひさ"], trivia: "泊村にある地名。アイヌ語で「険しい道」が由来。" },
    { question: "勇駒別", answer: "ゆこまんべつ", difficulty: "SUPER", dummies: ["ゆうこまべつ", "いこまべつ"], trivia: "東川町にある地名。旭岳温泉の旧名で、「温泉のある川」が由来。" },
    { question: "美羽烏", answer: "びばかるうし", difficulty: "SUPER", dummies: ["みはからす", "びうからす"], trivia: "美瑛町にある地名。アイヌ語で「木の多い所」が由来。" },
    { question: "咲来", answer: "さっくる", difficulty: "SUPER", dummies: ["しょうらい", "さきらい"], trivia: "音威子府村にある地名。アイヌ語で「夏の村」が由来。" },
    { question: "信砂", answer: "のぶしゃ", difficulty: "SUPER", dummies: ["しんしゃ", "しんさ"], trivia: "増毛町にある地名。アイヌ語で「頭の岩」が由来。" },
    { question: "焼尻", answer: "やぎしり", difficulty: "SUPER", dummies: ["しょうこう", "やきじり"], trivia: "羽幌町の沖合にある島で、オンコ（イチイ）の原生林が広がる。" },
    { question: "男能富", answer: "だんのっぷ", difficulty: "SUPER", dummies: ["おのうとみ", "だんのふ"], trivia: "幌加内町にある地名。アイヌ語で「底の深い沼」が由来。" },
    { question: "敏音知", answer: "ぴんねしり", difficulty: "SUPER", dummies: ["びんおんち", "としねしり"], trivia: "中頓別町にある山。アイヌ語で「男のヌシのいる所」が由来。" },
    { question: "鳧舞", answer: "けりまい", difficulty: "SUPER", dummies: ["かもまい", "ふぶ"], trivia: "根室市にある地名。アイヌ語で「心臓のような形の沼」が由来。" },
    { question: "染退", answer: "しぶちゃり", difficulty: "SUPER", dummies: ["せんたい", "そめたい"], trivia: "新冠町にある地名。アイヌ語で「滝のそば」が由来。" },
    { question: "長流枝", answer: "おさるし", difficulty: "SUPER", dummies: ["ちょうりゅうし", "ながるえ"], trivia: "えりも町にある地名。アイヌ語で「滝のある川」が由来。" },
    { question: "生花苗", answer: "おいかまない", difficulty: "SUPER", dummies: ["せいかなえ", "いけはななえ"], trivia: "えりも町にある地名。アイヌ語で「葦の生えている所」が由来。" },
    { question: "萠和", answer: "もいわ", difficulty: "SUPER", dummies: ["ほうわ", "もえわ"], trivia: "広尾町にある地名。アイヌ語で「小さい川」が由来。" },
    { question: "白人", answer: "ちろっと", difficulty: "SUPER", dummies: ["しろっと", "はくじん"], trivia: "更別村にある地名。アイヌ語で「舌のような形の丘」が由来。" },
    { question: "旅来", answer: "たびこらい", difficulty: "SUPER", dummies: ["りょらい", "たびき"], trivia: "大樹町にある地名。アイヌ語で「丘の麓」が由来。" },
    { question: "押帯", answer: "おしょっぷ", difficulty: "SUPER", dummies: ["おうたい", "おしおび"], trivia: "音更町にある地名。アイヌ語で「川尻に沼のある川」が由来。" },
    { question: "負箙", answer: "おふいびら", difficulty: "SUPER", dummies: ["ふびら", "まけえびら"], trivia: "豊頃町にある地名。アイヌ語で「背負うもの」が由来。" },
    { question: "斗満", answer: "とまむ", difficulty: "SUPER", dummies: ["とみつ", "とまん"], trivia: "芽室町にある地名。アイヌ語で「油のある所」が由来。" },
    { question: "止若内", answer: "やむわっかない", difficulty: "SUPER", dummies: ["しわかない", "とわかうち"], trivia: "陸別町にある地名。アイヌ語で「泉の湧く川」が由来。" },
    { question: "鼈奴", answer: "べっちゃろ", difficulty: "SUPER", dummies: ["べつど", "すっぽんやっこ"], trivia: "釧路町にある地名。アイヌ語で「梁（やな）のある川」が由来。" },
    { question: "老者舞", answer: "おしゃまっぷ", difficulty: "SUPER", dummies: ["ろうしゃまい", "おしゃま"], trivia: "釧路町にある地名。アイヌ語で「道の傍らの沼」が由来。" },
    { question: "来止臥", answer: "きとうし", difficulty: "SUPER", dummies: ["らいしが", "きとぶし"], trivia: "釧路町にある地名。アイヌ語で「死んだ沼」が由来。" },
    { question: "賤夫向", answer: "せきねっぷ", difficulty: "SUPER", dummies: ["せんぷこう", "いやおむかい"], trivia: "釧路町にある地名。アイヌ語で「大沼へ向かう」が由来。" },
    { question: "初無敵", answer: "そんてき", difficulty: "SUPER", dummies: ["しょむてき", "はつむてき"], trivia: "釧路町にある地名。アイヌ語で「沼のほとり」が由来。" },
    { question: "知方学", answer: "ちっぽまない", difficulty: "SUPER", dummies: ["ちほうがく", "しほうがく"], trivia: "釧路市にある地名。アイヌ語で「我々が下りる所」が由来。" },
    { question: "重蘭窮", answer: "ちぷらんけうし", difficulty: "SUPER", dummies: ["じゅうらんきゅう", "しげらんうし"], trivia: "釧路市にある地名。アイヌ語で「坂の上から下りる道」が由来。" },
    { question: "入境学", answer: "にこまない", difficulty: "SUPER", dummies: ["にゅうきょうがく", "いりざかいがく"], trivia: "釧路市にある地名。アイヌ語で「細い川」が由来。" },
    { question: "冬窓床", answer: "ぶいま", difficulty: "SUPER", dummies: ["とうそうしょう", "ふゆまどゆか"], trivia: "釧路市にある地名。アイヌ語で「その肩の所」が由来。" },
    { question: "又飯時", answer: "またいとき", difficulty: "SUPER", dummies: ["ゆうはんじ", "まためしどき"], trivia: "厚岸町にある地名。アイヌ語で「冬の場所」が由来。" },
    { question: "分遣瀬", answer: "わかちゃらせ", difficulty: "SUPER", dummies: ["ぶんけんせ", "わけやりせ"], trivia: "厚岸町にある地名。アイヌ語で「笹の多い所」が由来。" },
    { question: "片無去", answer: "かたむさり", difficulty: "SUPER", dummies: ["へんむきょ", "かたなしさり"], trivia: "浜中町にある地名。アイヌ語で「平らな岩」が由来。" },
    { question: "奔渡", answer: "ぽんと", difficulty: "SUPER", dummies: ["ほんと", "はしりわたし"], trivia: "浜中町にある地名。アイヌ語で「川尻」を意味する。" },
    { question: "瞼暮帰", answer: "けんぼっけ", difficulty: "SUPER", dummies: ["けんぼき", "まぶたぐれかえり"], trivia: "浜中町にある地名。アイヌ語で「小さい沼に下りる道」が由来。" },
    { question: "後静", answer: "しりしず", difficulty: "SUPER", dummies: ["ごせい", "あとずか"], trivia: "浦幌町にある地名。アイヌ語で「アザラシのいる所」が由来。" },
    { question: "仙鳳趾", answer: "せんぽうし", difficulty: "SUPER", dummies: ["せんほうし", "せんぽうあし"], trivia: "釧路町にある地名。アイヌ語で「小さい岩」が由来。" },
    { question: "散布", answer: "ちりっぷ", difficulty: "SUPER", dummies: ["さんぷ", "ちりふ"], trivia: "浜中町にある地名。アイヌ語で「下りる所」が由来。" },
    { question: "貰人", answer: "もうらいと", difficulty: "SUPER", dummies: ["せきじん", "もらいびと"], trivia: "根室市にある地名。アイヌ語で「流れの緩やかな川」が由来。" },
    { question: "茶安別", answer: "ちゃんべつ", difficulty: "SUPER", dummies: ["ちゃやすべつ", "さあんべつ"], trivia: "浜中町にある地名。アイヌ語で「川が打ちつける」が由来。" },
    { question: "屈斜路", answer: "くっしゃろ", difficulty: "SUPER", dummies: ["くつしゃろ", "くっしゃじ"], trivia: "弟子屈町にある湖。アイヌ語で「沼の喉元（出口）」が由来。" }
];

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

        const userInRoom = rooms[roomId].users.find(u => u.id === socket.id);
        if (userInRoom) {
            rooms[roomId].users = rooms[roomId].users.filter(u => u.id !== socket.id);
            io.to(roomId).emit('room-users', rooms[roomId].users);

            const state = rooms[roomId].quizState;
            if (state.isActive && !userInRoom.eliminated) {
                console.log(`[Game Logic] Player ${userInRoom.name} disconnected during quiz.`);
                
                const remainingActivePlayers = rooms[roomId].users.filter(u => !u.eliminated);

                if (state.answersReceived >= remainingActivePlayers.length) {
                    console.log(`[Game Logic] All remaining players have answered. Proceeding...`);
                    io.to(roomId).emit('all-answers-in');
                    state.answersReceived = 0;

                    if (state.nextQuestionTimer) clearTimeout(state.nextQuestionTimer);
                    state.nextQuestionTimer = setTimeout(() => {
                        proceedToNextQuestion(roomId);
                    }, 7000);
                }
            }

            if (rooms[roomId].users.length === 0 && !state.isActive) {
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
        };
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバー起動中: http://localhost:${PORT}`);
});
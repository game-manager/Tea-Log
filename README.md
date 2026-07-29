# TeachersLog

TeachersLogは、先生が口頭で伝えた内容を生徒同士で確認し、一定人数の確認が集まった発言だけを保護者にも共有するWebアプリです。

- 公開版: <https://game-manager.github.io/Tea-Log/>
- Firebaseプロジェクト: `teachers-log-a140c`

## 解決したい課題

学校内の口頭連絡には、聞き逃し、聞き間違い、伝言時の変化が起こりやすいという課題があります。TeachersLogは、同じ発言を聞いた複数の生徒による確認、保護者への段階的な共有、訂正依頼と管理者の監査記録によって、伝達ミスを減らします。

## サービスの仕組み

1. 生徒が先生から聞いた内容を「発言」として投稿します。
2. Geminiが、学校内で共有する内容として不適切な表現がないかを確認します。
3. AIの確認を通過した発言はクラス内に公開され、同じ内容を聞いた生徒が確認します。
4. 初期設定では5人中3人以上の確認で「確認済み」になります。
5. 確認済みの発言だけが保護者画面に表示されます。
6. AIが自動公開できないと判断した投稿は、管理者の審査キューへ送られます。
7. 内容に相違がある場合は、生徒または保護者が訂正依頼を送れます。管理者の訂正内容と処理理由は監査履歴として保存されます。

この仕組みは内容の完全性・正確性を保証するものではありません。重要な内容については学校からの公式情報も確認してください。

## 主な機能

### 生徒

- 未確認・確認中・確認済みの発言一覧と詳細
- Geminiによる投稿前チェックと管理者審査へのフォールバック
- 発言の新規投稿、入力チェック、自動保存される下書き
- 生徒ごとに一度だけ行える内容確認
- 確認人数、確認者、未確認人数、確認日時の表示
- 投稿・確認・確認済みの履歴
- 発言内容の相違を管理者へ報告
- キーワード検索、カテゴリ絞り込み、対象日順・投稿日順の並べ替え
- 期限が近い発言の表示

### 保護者

- クラス確認済みの発言だけを表示
- 未読・閲覧済みの管理
- 確認人数と投稿日、詳細の表示
- 発言内容の相違を管理者へ報告
- 検索、カテゴリ絞り込み、並べ替え

### 管理者

- 登録ユーザーの検索・絞り込み・役割・クラス・氏名の管理
- 全クラスの生徒画面・保護者画面への切り替え
- 通常ユーザーと同じ投稿、確認、履歴、通知、閲覧機能
- Geminiが自動公開しなかった投稿の承認・却下
- 訂正依頼の確認、発言の訂正、依頼の完了
- 訂正前後の内容、処理者、処理日時、判断理由の監査履歴

### 共通・運用

- Firebase AuthenticationによるGoogleログイン
- `@ryugasaki1-h.ibk.ed.jp` ドメインだけを許可
- Cloud Firestoreによる複数端末間のリアルタイム同期
- Firestoreの永続キャッシュによる接続復帰後の再同期
- Firebase App CheckによるFirebase AI Logicの保護
- アプリ内通知
- PWA対応（ホーム画面への追加、アプリ表示、基本画面のオフライン起動）
- スマートフォン優先のレスポンシブUI
- Error Boundaryによる画面全体のクラッシュ防止

## 管理者

次の学校Googleアカウントだけが管理者として固定されています。

- `saito.nozomu@ryugasaki1-h.ibk.ed.jp`
- `kobayashi.takuto@ryugasaki1-h.ibk.ed.jp`

管理者メールアドレスはクライアント表示だけでなく、Firestore Security Rulesでも検証されます。

## 起動方法

Node.js 18以上を用意してください。

```bash
npm install
npm run dev
```

通常は `http://localhost:5173` で開けます。本番相当の確認は次のコマンドで行います。

```bash
npm run build
npm run preview
```

## テスト

```bash
npm run lint
npm run build
npm run test:sync
```

`test:sync`にはFirebase CLIとJava 21以上が必要です。Firestore Emulator上で次を検証します。

- 端末Aで投稿した内容が端末Bへリアルタイム反映されること
- 同時投稿がFirestore Transactionによって失われないこと
- AI審査キューを本人と管理者以外が閲覧・処理できないこと
- 訂正依頼を報告者と管理者以外が閲覧できないこと
- 訂正依頼を管理者だけが監査記録付きで処理できること

## 使用技術

- React 18 / TypeScript / Vite
- Tailwind CSS / Lucide React
- Firebase Authentication
- Cloud Firestore / Firestore Security Rules
- Firebase AI Logic / Gemini Developer API
- Firebase App Check / reCAPTCHA Enterprise
- localStorage
- GitHub Actions / GitHub Pages
- Web App Manifest / Service Worker

## データ保存

発言、確認状況、閲覧状況、通知、管理者審査、訂正依頼はCloud Firestoreへ保存されます。主要なクラスデータはlocalStorageにもキャッシュされ、Firestoreの永続キャッシュと合わせて再読み込みや一時的なオフラインに備えます。投稿フォームの下書きはユーザー・クラスごとにlocalStorageへ保存されます。

## GitHub Pagesへのデプロイ

`agent/teacherslog-prototype` ブランチへのpushを契機に、GitHub Actionsが依存関係のインストール、ビルド、GitHub Pagesへの公開を実行します。

```bash
git push origin agent/teacherslog-prototype
```

公開先は <https://game-manager.github.io/Tea-Log/> です。

## 注意事項

- 先生による入力・確認・承認を行うサービスではありません。
- Geminiは内容の適切性を補助的に判定します。事実の正確性を保証するものではありません。
- AIの判定結果だけで自動公開できない場合は、管理者による審査に送られます。
- PWAの基本画面はオフライン起動できますが、投稿・確認・管理者処理の他端末への反映にはネットワーク接続が必要です。
- 実運用前に、学校の名簿・クラス管理、個人情報保護方針、保存期間、問い合わせ・監査運用を定めてください。

## 今後の改善案

- 学校名簿との連携によるクラス・役割の自動登録
- Cloud Functionsを利用した投稿・確認処理のサーバー側検証
- 発言・通知を個別ドキュメント化した大規模クラス向けデータモデル
- 画像・PDF添付と学校公式情報へのリンク
- 学年、クラス、部活動単位の配信範囲
- 締切カレンダー、リマインダー、アクセシビリティ設定
- 管理者操作ログの長期保管とエクスポート
- E2Eテスト、負荷テスト、監視・バックアップ

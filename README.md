# 契約書自動生成・電子署名システム（GAS / clasp）

学生インターン・業務委託向けの契約締結を自動化するGoogle Apps Scriptプロジェクト。
Googleフォーム入力 → 契約書生成（Docs→PDF）→ 独立署名サイト（GASウェブアプリ）で
メールOTP本人確認＋同意 → SHA-256ハッシュ・締結証明書・監査証跡を保存、という立会人型フロー。

> 法的位置づけ・免責は基本設計書（`契約書自動生成システム_基本設計書.md`）の 0.2 を参照。
> 本バージョンはPKI電子署名・認定タイムスタンプを含まない中間的な証拠力です。

## 構成

```
contract-esign/
├── .clasp.json            # scriptId を設定
├── .claspignore
└── src/
    ├── appsscript.json    # マニフェスト(スコープ/ウェブアプリ設定)
    ├── Config.gs          # 定数・列定義・プレースホルダマップ
    ├── Properties.gs      # スクリプトプロパティ参照
    ├── Logger.gs          # ログ(Cloud Logging + ログシート)
    ├── SheetService.gs    # 回答シート操作
    ├── AuditService.gs    # 監査証跡
    ├── DocumentService.gs # ひな形コピー・変数置換・署名刻印
    ├── PdfService.gs      # PDF化・Drive保存
    ├── TokenService.gs    # 署名トークン発行/検証
    ├── Main.gs            # onFormSubmit / generateAndInvite
    ├── WebApp.gs          # doGet/doPost(独立署名サイト)
    ├── OtpService.gs      # メールOTP発行/検証
    ├── SignatureService.gs# ハッシュ・事業者署名・締結証明書
    ├── TimestampService.gs# 認定TS抽象(当面スタブ)
    ├── NotificationService.gs # メール通知
    ├── RetryService.gs    # リトライ・再処理
    ├── Setup.gs           # 初期化・トリガー登録
    └── html/              # 署名UI(SigningPage/Completed/Error)
```

## セットアップ手順

### 1. 事前準備（Google側）
1. Googleフォームを作成し、質問を順に「氏名／メールアドレス／契約種別／報酬・条件／契約開始日」の順で用意。
2. フォームの回答先スプレッドシートを作成（このスプレッドシートにスクリプトを紐付ける）。
3. 契約書ひな形をGoogleドキュメントで作成。差込箇所を `{{name}}` `{{email}}` `{{type}}` `{{amount}}` `{{start_date}}`、署名欄に `{{signature_area}}` と記述。
4. Drive上に「未署名PDF」「署名済PDF」保管フォルダを2つ作成。

### 2. clasp でプッシュ
```bash
npm install -g @google/clasp
clasp login
# スプレッドシートに紐付くコンテナバインドのスクリプトIDを .clasp.json に設定
clasp push
```
> スプレッドシートの「拡張機能 > Apps Script」から作成したプロジェクトの scriptId を使うと、
> フォーム送信トリガーが確実に動作します。

### 3. スクリプトプロパティを設定
Apps Scriptエディタ →「プロジェクトの設定 > スクリプトプロパティ」で以下を登録。

| キー | 値 |
|---|---|
| `TEMPLATE_DOC_ID` | ひな形ドキュメントのID |
| `DRIVE_UNSIGNED_FOLDER_ID` | 未署名PDFフォルダID |
| `DRIVE_SIGNED_FOLDER_ID` | 署名済PDFフォルダID |
| `OTP_PEPPER` | 任意のランダムな長い文字列（OTPハッシュ補強用） |
| `NOTIFY_EMAIL` | 担当者の通知先メール |
| `WEBAPP_BASE_URL` | （デプロイ後に設定）ウェブアプリのURL |

### 4. ウェブアプリをデプロイ
1. エディタ →「デプロイ > 新しいデプロイ > ウェブアプリ」。
2. 「次のユーザーとして実行: 自分」「アクセスできるユーザー: 全員」。
3. 発行されたURLを `WEBAPP_BASE_URL` に登録。

> ⚠️ 「全員（匿名を含む）」公開が社内ポリシー上可能かを事前確認してください（設計書 付録B）。

### 5. 初期化と権限承認
エディタで以下を順に実行し、初回の権限承認ダイアログを許可する。
1. `setupSheetHeaders` … 回答シートのヘッダ初期化
2. `checkProperties` … 必須プロパティの検証
3. `installFormTrigger` … フォーム送信トリガー登録
4. `installReprocessTrigger` … エラー再処理トリガー（15分毎）登録

`setupAll` を1回実行すれば上記2〜4をまとめて実行できます（ヘッダ初期化含む）。

### 6. 動作確認
- テスト用にフォームから1件送信 → 相手方メールに署名リンク → OTP → 同意 → 締結完了、まで確認。
- 手動確認は `smokeTest_generateInviteRow2`（対象行を書き換えて実行）。

## 運用メモ
- ステータス・監査証跡・ログは各シート（回答／監査証跡／ログ）で追跡。
- 監査証跡シートは編集権限を限定し「追記のみ」で運用してください。
- 署名者IPはGASウェブアプリでは取得できないため未記録（UAはクライアントから取得）。IP記録が必要な場合はフロントにプロキシ等の導入が必要です。

## 将来拡張（証拠力の強化）
- `TimestampService.apply` を総務大臣認定TSA（RFC3161）連携へ差し替え、確定日時を付与。
- PKI電子署名（PAdES）導入。GAS単体では困難なため外部署名サービス/関数の連携を追加。

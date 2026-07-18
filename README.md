# 契約書 電子署名システム（GAS / clasp）

Googleサインインで本人確認し、契約書ドキュメントに電子署名して、署名済PDFを
発行者と署名者の双方へメール送信するGoogle Apps Scriptのウェブアプリです。

## フロー

1. 署名サイト（ウェブアプリ）を開く → **Googleアカウントでサインイン**（サインインしないと開けない設定）
2. 契約書ドキュメントのURLと、氏名・メールアドレスを入力
3. 内容を確認し「同意して署名」
4. システムが契約書に差込・署名情報を刻印して**署名済PDFを生成**（SHA-256ハッシュ・締結証明書付き）
5. **発行者と署名者の双方へ署名済PDFをメール送信**（＋発行者Driveに保管）

> 法的位置づけ: 本人性はGoogleサインイン、非改ざん性はSHA-256ハッシュ＋締結証明書で担保する中間水準です。
> PKI電子署名（PAdES）・認定タイムスタンプは含みません。重要度の高い契約は法務確認を推奨します（当方は弁護士ではありません）。

## 構成

```
contract-esign/
├── .clasp.json / .claspignore / .gitignore
└── src/
    ├── appsscript.json       # マニフェスト(ウェブアプリ設定/スコープ)
    ├── Config.gs             # プレースホルダ等の定数
    ├── Properties.gs         # スクリプトプロパティ参照
    ├── Logger.gs             # Cloud Loggingへの出力
    ├── AuditService.gs       # 監査証跡(任意: AUDIT_SHEET_ID)
    ├── DocumentService.gs    # ドキュメント取込・差込・署名刻印・PDF化
    ├── SignatureService.gs   # 署名確定(ハッシュ・締結証明書・保管・送信の統括)
    ├── NotificationService.gs# 発行者と署名者へPDFメール送信
    ├── TimestampService.gs   # 時刻付与(将来: 認定TSAへ差替可能)
    ├── WebApp.gs             # doGet/doPost(署名サイト本体)
    ├── Setup.gs              # プロパティ検証・スモークテスト
    └── html/                 # SigningPage / Completed / Error
```

## セットアップ

### 1. clasp でプッシュ
```bash
npm install -g @google/clasp
clasp login
# スタンドアロンのApps Scriptプロジェクトを作成し、その scriptId を .clasp.json に設定
clasp push
```
（Apps Script API をオンに: https://script.google.com/home/usersettings ）

### 2. 契約書ひな形を用意
Googleドキュメントで契約書を作成し、差込箇所に `{{name}}` `{{email}}` `{{date}}`、
署名欄に `{{signature_area}}` を記述。**署名者がURLを開けるよう「リンクを知っている全員（閲覧可）」等で共有**しておく。

### 3. スクリプトプロパティ
「プロジェクトの設定 > スクリプトプロパティ」で設定。

| キー | 内容 |
|---|---|
| `ISSUER_EMAIL` | 発行者(担当者)の通知先メール（必須） |
| `DRIVE_SIGNED_FOLDER_ID` | 署名済PDFの保管フォルダID（必須） |
| `AUDIT_SHEET_ID` | 監査証跡を記録するスプレッドシートID（任意） |

### 4. ウェブアプリをデプロイ
「デプロイ > 新しいデプロイ > ウェブアプリ」→
- 実行するユーザー: **自分**
- アクセスできるユーザー: **Googleアカウントを持つ全員**（これでサインイン必須になる）

発行されたURLを署名者に共有すれば運用開始。`?doc=<ドキュメントURL>` を付ければURL欄を事前入力できます。

### 5. 動作確認
`checkProperties` を実行 → 権限承認 → ウェブアプリURLを開いてテスト署名 → 双方にPDFメールが届くことを確認。

## 補足・制約
- 署名者の検証済みメールをGAS側で自動取得できるのは同一組織アカウントのときのみ。社外の方はメール欄に入力してもらいます。より厳密な本人メール取得が必要な場合は、Googleサインイン（Google Identity Services）連携の追加で対応可能です。
- メール送信・Drive保管は「実行するユーザー=自分（発行者）」の権限で行われます。
- 署名者IPはGASウェブアプリでは取得できません。

## 将来拡張
- `TimestampService` を認定タイムスタンプ（RFC3161）連携へ差し替え。
- PKI電子署名（PAdES）導入で電子署名法3条の推定効を狙う構成へ。

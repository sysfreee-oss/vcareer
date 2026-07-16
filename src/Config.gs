/**
 * Config.gs
 * システム全体の定数・列定義・プレースホルダマップを集約する。
 * 機密値（IDやURL等）はここには直書きせず、スクリプトプロパティ(Properties.gs)で管理する。
 */
var CONFIG = {
  // ステータス値
  STATUS: {
    GENERATING: '生成中',
    WAITING_SIGN: '署名待ち',
    COMPLETED: '締結完了',
    ERROR: 'エラー',
    NEEDS_MANUAL: '要手動対応'
  },

  // スプレッドシートの列番号(1始まり)。フォーム側は1〜6を書き込み、7以降をGASが管理する。
  // フォームの質問順は「氏名, メール, 契約種別, 報酬/条件, 契約開始日」を想定。
  COL: {
    TIMESTAMP: 1,
    NAME: 2,
    EMAIL: 3,
    TYPE: 4,
    AMOUNT: 5,
    START_DATE: 6,
    STATUS: 7,
    TOKEN: 8,
    TOKEN_EXPIRY: 9,
    OTP_HASH: 10,
    OTP_EXPIRY: 11,
    OTP_ATTEMPTS: 12,
    UNSIGNED_PDF_ID: 13,
    SIGNED_PDF_ID: 14,
    DOC_ID: 15,
    DOC_HASH: 16,
    CONCLUDED_AT: 17,
    SIGNER_IP: 18,
    SIGNER_UA: 19,
    CERT_NO: 20,
    ERROR: 21,
    RETRY: 22
  },

  // ヘッダ行のラベル(初期化用)
  HEADERS: [
    'タイムスタンプ', '氏名', 'メールアドレス', '契約種別', '報酬/条件', '契約開始日',
    '処理ステータス', '署名トークン', 'トークン有効期限', 'OTPハッシュ', 'OTP有効期限',
    'OTP試行回数', '未署名PDF_ID', '署名済PDF_ID', '生成Doc_ID', '文書ハッシュ(SHA-256)',
    '締結日時', '署名者IP', '署名者UA', '締結証明書番号', 'エラー詳細', 'リトライ回数'
  ],

  // 契約書ひな形のプレースホルダ → 列番号 のマッピング
  PLACEHOLDER_MAP: {
    '{{name}}': 'NAME',
    '{{email}}': 'EMAIL',
    '{{type}}': 'TYPE',
    '{{amount}}': 'AMOUNT',
    '{{start_date}}': 'START_DATE'
  },

  // 署名欄アンカー(締結時にここへ署名者情報を差し込む)
  SIGNATURE_ANCHOR: '{{signature_area}}',

  // トークン・OTPのパラメータ
  TOKEN_TTL_MIN: 60 * 24 * 7,   // 署名トークン有効期限: 7日
  OTP_TTL_MIN: 10,              // OTP有効期限: 10分
  OTP_MAX_ATTEMPTS: 5,          // OTP試行上限
  OTP_LENGTH: 6,

  // リトライ
  RETRY_MAX: 3,
  RETRY_BASE_MS: 1000,
  REPROCESS_MAX: 5,             // 再処理トリガーでの最大リトライ回数

  // シート名
  SHEET_RESPONSES: 'フォームの回答 1',
  SHEET_LOG: 'ログ',
  SHEET_AUDIT: '監査証跡'
};

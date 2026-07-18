/**
 * Config.gs
 * システム全体の定数。機密値・IDはスクリプトプロパティ(Properties.gs)で管理する。
 *
 * 新フロー(ウェブアプリ主導):
 *   Googleサインイン → ドキュメントURL+氏名入力 → 電子署名 → 発行者と署名者へPDFメール送信
 */
var CONFIG = {
  // 契約書ひな形のプレースホルダ(入力値で置換する)
  PLACEHOLDERS: {
    NAME: '{{name}}',
    EMAIL: '{{email}}',
    DATE: '{{date}}',           // 締結日(当日)
    SIGNATURE: '{{signature_area}}'
  },

  // 締結日フォーマット
  DATE_FMT: 'yyyy-MM-dd',
  TZ: 'Asia/Tokyo',

  // 監査シートのシート名(AUDIT_SHEET_ID プロパティが設定されている場合に使用)
  AUDIT_SHEET_NAME: '監査証跡'
};

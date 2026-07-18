/**
 * Properties.gs
 * スクリプトプロパティ(機密情報・環境値)への安全なアクセス。
 * 値はコードに直書きせず、Apps Scriptの「プロジェクトの設定 > スクリプトプロパティ」に設定する。
 *
 * 必須:
 *   ISSUER_EMAIL             発行者(担当者)の通知先メール
 *   DRIVE_SIGNED_FOLDER_ID   署名済PDFの保管フォルダID
 * 任意:
 *   AUDIT_SHEET_ID           監査証跡を記録するスプレッドシートID(未設定なら記録しない)
 *   ALLOWED_DOC_DOMAIN       受け付けるドキュメントURLの制限(既定: docs.google.com)
 */
var Props = (function () {
  var REQUIRED = ['ISSUER_EMAIL', 'DRIVE_SIGNED_FOLDER_ID'];

  function store() { return PropertiesService.getScriptProperties(); }

  function get(key, opt_default) {
    var v = store().getProperty(key);
    if (v === null || v === undefined || v === '') {
      if (arguments.length >= 2) return opt_default;
      throw new Error('スクリプトプロパティ未設定: ' + key);
    }
    return v;
  }

  function set(key, value) { store().setProperty(key, value); }

  function validate() {
    var missing = REQUIRED.filter(function (k) {
      var v = store().getProperty(k);
      return v === null || v === '';
    });
    if (missing.length) throw new Error('必須プロパティが未設定です: ' + missing.join(', '));
    return true;
  }

  return { get: get, set: set, validate: validate, REQUIRED: REQUIRED };
})();

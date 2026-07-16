/**
 * Properties.gs
 * スクリプトプロパティ(機密情報・環境値)への安全なアクセスを提供する。
 * 値はコードに直書きせず、Apps Scriptエディタの「プロジェクトの設定 > スクリプトプロパティ」に設定する。
 */
var Props = (function () {
  var REQUIRED = [
    'TEMPLATE_DOC_ID',
    'DRIVE_UNSIGNED_FOLDER_ID',
    'DRIVE_SIGNED_FOLDER_ID',
    'OTP_PEPPER',
    'NOTIFY_EMAIL'
  ];

  function store() {
    return PropertiesService.getScriptProperties();
  }

  function get(key, opt_default) {
    var v = store().getProperty(key);
    if (v === null || v === undefined || v === '') {
      if (arguments.length >= 2) return opt_default;
      throw new Error('スクリプトプロパティ未設定: ' + key);
    }
    return v;
  }

  function set(key, value) {
    store().setProperty(key, value);
  }

  /** 必須プロパティが揃っているか検証する(セットアップ確認用)。 */
  function validate() {
    var missing = REQUIRED.filter(function (k) {
      var v = store().getProperty(k);
      return v === null || v === '';
    });
    if (missing.length) {
      throw new Error('必須プロパティが未設定です: ' + missing.join(', '));
    }
    return true;
  }

  return { get: get, set: set, validate: validate, REQUIRED: REQUIRED };
})();

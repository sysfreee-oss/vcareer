/**
 * Logger.gs
 * Cloud Logging(console)へ出力する。機密情報は出力しない。
 * 本プロジェクトはスタンドアロン(フォーム非連携)のため、シートには依存しない。
 */
var Log = (function () {
  function safeJson(obj) {
    try {
      var SECRET = ['pepper', 'password', 'token', 'idToken'];
      return JSON.stringify(obj, function (k, v) {
        return SECRET.indexOf(k) !== -1 ? '***' : v;
      });
    } catch (e) { return String(obj); }
  }
  return {
    info: function (msg, ctx) { console.log('[INFO] ' + msg + (ctx ? ' ' + safeJson(ctx) : '')); },
    error: function (msg, ctx) { console.error('[ERROR] ' + msg + (ctx ? ' ' + safeJson(ctx) : '')); }
  };
})();

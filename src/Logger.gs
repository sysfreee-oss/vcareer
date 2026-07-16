/**
 * Logger.gs
 * Cloud Logging とログシートへ二重記録する。機密情報(OTP・ペッパー・トークン)は出力しない。
 */
var Log = (function () {
  function sheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(CONFIG.SHEET_LOG);
    if (!sh) {
      sh = ss.insertSheet(CONFIG.SHEET_LOG);
      sh.appendRow(['日時', 'レベル', 'メッセージ', 'コンテキスト']);
    }
    return sh;
  }

  function write(level, msg, ctx) {
    var line = '[' + level + '] ' + msg + (ctx ? ' ' + safeJson(ctx) : '');
    if (level === 'ERROR') { console.error(line); } else { console.log(line); }
    try {
      sheet().appendRow([new Date(), level, String(msg), ctx ? safeJson(ctx) : '']);
    } catch (e) {
      console.error('ログシート書込失敗: ' + e);
    }
  }

  // 機密キーはマスクしてから文字列化する
  function safeJson(obj) {
    try {
      var SECRET = ['otp', 'code', 'pepper', 'token', 'otpHash', 'password'];
      return JSON.stringify(obj, function (k, v) {
        if (SECRET.indexOf(k) !== -1) return '***';
        return v;
      });
    } catch (e) {
      return String(obj);
    }
  }

  return {
    info: function (msg, ctx) { write('INFO', msg, ctx); },
    error: function (msg, ctx) { write('ERROR', msg, ctx); }
  };
})();

/**
 * SheetService.gs
 * 回答シートの読み書き・ステータス管理を担う。
 */
var SheetService = (function () {
  function responseSheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(CONFIG.SHEET_RESPONSES) || ss.getSheets()[0];
    return sh;
  }

  /** 対象行(1始まりのシート行番号)を連想配列で取得。 */
  function getRow(rowIndex) {
    var sh = responseSheet();
    var lastCol = Math.max(sh.getLastColumn(), CONFIG.COL.RETRY);
    var values = sh.getRange(rowIndex, 1, 1, lastCol).getValues()[0];
    var C = CONFIG.COL;
    return {
      rowIndex: rowIndex,
      name: values[C.NAME - 1],
      email: String(values[C.EMAIL - 1] || '').trim(),
      type: values[C.TYPE - 1],
      amount: values[C.AMOUNT - 1],
      startDate: values[C.START_DATE - 1],
      status: values[C.STATUS - 1],
      token: values[C.TOKEN - 1],
      tokenExpiry: values[C.TOKEN_EXPIRY - 1],
      otpHash: values[C.OTP_HASH - 1],
      otpExpiry: values[C.OTP_EXPIRY - 1],
      otpAttempts: Number(values[C.OTP_ATTEMPTS - 1] || 0),
      unsignedPdfId: values[C.UNSIGNED_PDF_ID - 1],
      signedPdfId: values[C.SIGNED_PDF_ID - 1],
      docId: values[C.DOC_ID - 1],
      docHash: values[C.DOC_HASH - 1],
      concludedAt: values[C.CONCLUDED_AT - 1],
      certNo: values[C.CERT_NO - 1],
      retry: Number(values[C.RETRY - 1] || 0)
    };
  }

  /** トークンから該当行を探す。見つからなければ null。 */
  function findByToken(token) {
    if (!token) return null;
    var sh = responseSheet();
    var last = sh.getLastRow();
    if (last < 2) return null;
    var col = sh.getRange(2, CONFIG.COL.TOKEN, last - 1, 1).getValues();
    for (var i = 0; i < col.length; i++) {
      if (String(col[i][0]) === String(token)) {
        return getRow(i + 2);
      }
    }
    return null;
  }

  /** 単一セルを更新する。 */
  function setCell(rowIndex, col, value) {
    responseSheet().getRange(rowIndex, col, 1, 1).setValue(value);
  }

  /** ステータスと任意の追加項目(列名: 値)をまとめて書き込む。 */
  function update(rowIndex, status, extra) {
    var sh = responseSheet();
    if (status) sh.getRange(rowIndex, CONFIG.COL.STATUS).setValue(status);
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        var col = CONFIG.COL[key];
        if (col) sh.getRange(rowIndex, col).setValue(extra[key]);
      });
    }
  }

  function incrementRetry(rowIndex) {
    var cur = getRow(rowIndex).retry;
    setCell(rowIndex, CONFIG.COL.RETRY, cur + 1);
    return cur + 1;
  }

  /** エラー行(RETRY上限未満)を返す(再処理トリガー用)。 */
  function findErrorRows() {
    var sh = responseSheet();
    var last = sh.getLastRow();
    var rows = [];
    for (var r = 2; r <= last; r++) {
      var row = getRow(r);
      if (row.status === CONFIG.STATUS.ERROR && row.retry < CONFIG.REPROCESS_MAX) {
        rows.push(row);
      }
    }
    return rows;
  }

  return {
    responseSheet: responseSheet,
    getRow: getRow,
    findByToken: findByToken,
    setCell: setCell,
    update: update,
    incrementRetry: incrementRetry,
    findErrorRows: findErrorRows
  };
})();

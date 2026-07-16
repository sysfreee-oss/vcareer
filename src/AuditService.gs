/**
 * AuditService.gs
 * 監査証跡(誰が・いつ・どこから・何をしたか)を追記専用シートへ記録する。
 * このシートは運用上「追記のみ」とし、編集権限を限定して保全する。
 */
var AuditService = (function () {
  function sheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(CONFIG.SHEET_AUDIT);
    if (!sh) {
      sh = ss.insertSheet(CONFIG.SHEET_AUDIT);
      sh.appendRow(['日時', '行', 'イベント', 'メール', 'IP', 'UA', '結果', '文書ハッシュ', '締結証明書番号']);
    }
    return sh;
  }

  /**
   * @param {number} rowIndex 対象行
   * @param {Object} ev {event, email, ip, ua, result, docHash, certNo}
   */
  function record(rowIndex, ev) {
    ev = ev || {};
    try {
      sheet().appendRow([
        new Date(), rowIndex, ev.event || '', ev.email || '',
        ev.ip || '', ev.ua || '', ev.result || '', ev.docHash || '', ev.certNo || ''
      ]);
    } catch (e) {
      Log.error('監査証跡記録失敗', { rowIndex: rowIndex, error: String(e) });
    }
  }

  return { record: record };
})();

/**
 * AuditService.gs
 * 監査証跡の記録。AUDIT_SHEET_ID が設定されていればスプレッドシートへ追記する(任意)。
 * 未設定時は console のみ。
 */
var AuditService = (function () {
  function record(ev) {
    ev = ev || {};
    Log.info('AUDIT', ev);
    var id = Props.get('AUDIT_SHEET_ID', '');
    if (!id) return;
    try {
      var ss = SpreadsheetApp.openById(id);
      var sh = ss.getSheetByName(CONFIG.AUDIT_SHEET_NAME);
      if (!sh) {
        sh = ss.insertSheet(CONFIG.AUDIT_SHEET_NAME);
        sh.appendRow(['日時', 'イベント', '署名者メール', '氏名', 'ドキュメントURL', '文書ハッシュ', '締結証明書番号', '結果']);
      }
      sh.appendRow([
        new Date(), ev.event || '', ev.email || '', ev.name || '',
        ev.docUrl || '', ev.docHash || '', ev.certNo || '', ev.result || ''
      ]);
    } catch (e) {
      Log.error('監査シート記録失敗', { error: String(e) });
    }
  }
  return { record: record };
})();

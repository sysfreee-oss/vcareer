/**
 * DocumentService.gs
 * ドキュメントURLから契約書を取り込み、入力値を差し込み、署名情報を刻印してPDF化する。
 */
var DocumentService = (function () {
  /** GoogleドキュメントのURL/IDからドキュメントIDを抽出する。 */
  function extractDocId(urlOrId) {
    var s = String(urlOrId || '').trim();
    var m = s.match(/[-\w]{25,}/); // /d/<ID> や生ID
    if (!m) throw new Error('ドキュメントURLからIDを取得できません');
    return m[0];
  }

  /** レビュー表示用にプレーンテキストを取得(差込後イメージ)。 */
  function getPreviewText(docId, values) {
    var text = DocumentApp.openById(docId).getBody().getText();
    return applyToString(text, values);
  }

  function applyToString(text, v) {
    return text
      .replace(new RegExp(escape(CONFIG.PLACEHOLDERS.NAME), 'g'), v.name || '')
      .replace(new RegExp(escape(CONFIG.PLACEHOLDERS.EMAIL), 'g'), v.email || '')
      .replace(new RegExp(escape(CONFIG.PLACEHOLDERS.DATE), 'g'), v.date || '');
  }

  /**
   * 署名確定用: ひな形DocをコピーしてMy Driveに一時作成→差込→署名刻印→PDF化。
   * @return {{pdfBlob: Blob, tempDocId: string}}
   */
  function buildSignedPdf(sourceDocId, values, sig) {
    var copy = DriveApp.getFileById(sourceDocId).makeCopy('__signing_tmp_' + Utilities.getUuid());
    var tempId = copy.getId();
    var doc = DocumentApp.openById(tempId);
    var body = doc.getBody();

    body.replaceText(escape(CONFIG.PLACEHOLDERS.NAME), values.name || '');
    body.replaceText(escape(CONFIG.PLACEHOLDERS.EMAIL), values.email || '');
    body.replaceText(escape(CONFIG.PLACEHOLDERS.DATE), values.date || '');

    var block = [
      '───────────── 電子署名 ─────────────',
      '署名者: ' + values.name + '（' + values.email + '）',
      '本人確認: Googleアカウントによるサインイン',
      '締結日時: ' + sig.concludedAt,
      '締結証明書番号: ' + sig.certNo
    ].join('\n');
    var anchor = escape(CONFIG.PLACEHOLDERS.SIGNATURE);
    if (body.findText(anchor)) {
      body.replaceText(anchor, block);
    } else {
      body.appendParagraph(block);
    }
    doc.saveAndClose();

    Utilities.sleep(500);
    var pdfBlob = DriveApp.getFileById(tempId).getAs('application/pdf');
    return { pdfBlob: pdfBlob, tempDocId: tempId };
  }

  function trashTemp(tempDocId) {
    try { DriveApp.getFileById(tempDocId).setTrashed(true); } catch (e) { Log.error('一時Doc削除失敗', { error: String(e) }); }
  }

  function escape(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  return {
    extractDocId: extractDocId,
    getPreviewText: getPreviewText,
    buildSignedPdf: buildSignedPdf,
    trashTemp: trashTemp
  };
})();

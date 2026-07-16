/**
 * DocumentService.gs
 * 契約書ひな形(Googleドキュメント)のコピーと変数置換を担う。
 */
var DocumentService = (function () {
  /** 日付を YYYY-MM-DD 表記に整える。 */
  function fmtDate(v) {
    if (v instanceof Date) {
      return Utilities.formatDate(v, 'Asia/Tokyo', 'yyyy-MM-dd');
    }
    return String(v == null ? '' : v);
  }

  /**
   * ひな形をコピーし、{{変数}}を回答値で置換する。
   * @return {string} 生成したドキュメントのID
   */
  function createContractDoc(row) {
    var templateId = Props.get('TEMPLATE_DOC_ID');
    var name = row.name || '契約書';
    var copyName = '契約書_' + name + '_' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmmss');
    var copy = DriveApp.getFileById(templateId).makeCopy(copyName);
    var docId = copy.getId();

    var doc = DocumentApp.openById(docId);
    var body = doc.getBody();
    replacePlaceholders(body, row);
    doc.saveAndClose();
    return docId;
  }

  /** 本文の {{var}} を実値へ置換する。 */
  function replacePlaceholders(body, row) {
    Object.keys(CONFIG.PLACEHOLDER_MAP).forEach(function (ph) {
      var field = CONFIG.PLACEHOLDER_MAP[ph];
      var raw = (field === 'START_DATE') ? fmtDate(row.startDate) : row[camel(field)];
      body.replaceText(escapeRegex(ph), String(raw == null ? '' : raw));
    });
  }

  /**
   * 締結時に署名欄アンカーへ署名者情報を差し込み、締結証明書ページを追記する。
   * @return {string} 更新後の docId(同じdocを更新)
   */
  function stampSignature(docId, sig) {
    var doc = DocumentApp.openById(docId);
    var body = doc.getBody();

    var block = [
      '───────────── 電子署名 ─────────────',
      '署名者: ' + sig.name + '（' + sig.email + '）',
      '本人確認: メールOTP認証（立会人型 / 事業者署名型）',
      '締結日時: ' + sig.concludedAt,
      '締結証明書番号: ' + sig.certNo,
      '文書ハッシュ(SHA-256): ' + sig.docHash,
      '署名者IP: ' + sig.ip
    ].join('\n');

    // アンカーがあれば置換、なければ末尾へ追記
    var anchor = escapeRegex(CONFIG.SIGNATURE_ANCHOR);
    var found = body.findText(anchor);
    if (found) {
      body.replaceText(anchor, block);
    } else {
      body.appendParagraph('').appendText('');
      body.appendParagraph(block);
    }
    doc.saveAndClose();
    return docId;
  }

  /** レビュー表示用に本文プレーンテキストを取得する。 */
  function getPlainText(docId) {
    return DocumentApp.openById(docId).getBody().getText();
  }

  function camel(upper) {
    // START_DATE -> startDate, NAME -> name
    var parts = upper.toLowerCase().split('_');
    return parts.map(function (p, i) {
      return i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1);
    }).join('');
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  return {
    createContractDoc: createContractDoc,
    replacePlaceholders: replacePlaceholders,
    stampSignature: stampSignature,
    getPlainText: getPlainText
  };
})();

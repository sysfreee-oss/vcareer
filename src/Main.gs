/**
 * Main.gs
 * 生成側のエントリポイント。フォーム送信をトリガーに契約書を生成し署名依頼を送る。
 */

/**
 * インストーラブルトリガーから呼ばれる。
 * @param {Object} e フォーム送信イベント
 */
function onFormSubmit(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var rowIndex = resolveRowIndex(e);
    if (!rowIndex) { Log.error('行番号を特定できませんでした'); return; }
    generateAndInvite(rowIndex);
  } catch (err) {
    Log.error('onFormSubmit 失敗', { error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** イベントから対象行を特定する(range優先、なければ最終行)。 */
function resolveRowIndex(e) {
  if (e && e.range && e.range.getRow) return e.range.getRow();
  var sh = SheetService.responseSheet();
  return sh.getLastRow();
}

/**
 * 1行分: 契約書生成 → PDF化 → トークン発行 → 署名依頼メール。
 * @param {number} rowIndex
 */
function generateAndInvite(rowIndex) {
  Props.validate();
  var row = SheetService.getRow(rowIndex);

  if (row.status === CONFIG.STATUS.COMPLETED) {
    Log.info('締結済のためスキップ', { rowIndex: rowIndex });
    return;
  }
  if (!row.email || row.email.indexOf('@') === -1) {
    SheetService.update(rowIndex, CONFIG.STATUS.ERROR, { ERROR: 'メールアドレス不正' });
    NotificationService.notifyError(row, new Error('メールアドレス不正'));
    return;
  }

  SheetService.update(rowIndex, CONFIG.STATUS.GENERATING);

  try {
    // 1) 契約書ドキュメント生成
    var docId = DocumentService.createContractDoc(row);

    // 2) 未署名PDF化してDrive保存
    var fileName = '未署名_契約書_' + (row.name || '') + '_' + rowIndex;
    var pdf = RetryService.withRetry(function () {
      return PdfService.exportToPdf(docId, Props.get('DRIVE_UNSIGNED_FOLDER_ID'), fileName);
    });

    SheetService.update(rowIndex, null, {
      DOC_ID: docId,
      UNSIGNED_PDF_ID: pdf.id
    });

    // 3) 署名トークン発行
    var tok = TokenService.issue(rowIndex);
    var url = TokenService.buildSigningUrl(tok.token);

    // 4) 署名依頼メール送付
    RetryService.withRetry(function () {
      NotificationService.sendSigningInvite(row, url);
    });

    SheetService.update(rowIndex, CONFIG.STATUS.WAITING_SIGN);
    AuditService.record(rowIndex, { event: '署名依頼送付', email: row.email, result: 'OK' });
    Log.info('署名依頼を送付', { rowIndex: rowIndex });
  } catch (err) {
    SheetService.update(rowIndex, CONFIG.STATUS.ERROR, { ERROR: String(err) });
    AuditService.record(rowIndex, { event: '生成/送付失敗', email: row.email, result: String(err) });
    NotificationService.notifyError(row, err);
    Log.error('generateAndInvite 失敗', { rowIndex: rowIndex, error: String(err) });
    throw err;
  }
}

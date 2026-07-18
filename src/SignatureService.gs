/**
 * SignatureService.gs
 * 署名確定: ドキュメントURL + 氏名 + メール から署名済PDFを生成し、
 * SHA-256ハッシュ・締結証明書を付与、署名済PDFをDrive保管、発行者と署名者へメール送信。
 *
 * 注意: GAS単体ではPKI電子署名(PAdES)や認定タイムスタンプは付与しない。
 *       本人性はGoogleサインイン、非改ざん性はSHA-256ハッシュ+締結証明書で担保する中間水準。
 */
var SignatureService = (function () {
  function bytesToHex(bytes) {
    return bytes.map(function (b) {
      var v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? '0' + v : v;
    }).join('');
  }
  function computeHash(blob) {
    return bytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, blob.getBytes()));
  }
  function newCertNo() {
    return 'CERT-' + Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyyMMdd') +
      '-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  }
  function today() {
    return Utilities.formatDate(new Date(), CONFIG.TZ, CONFIG.DATE_FMT);
  }

  /**
   * @param {Object} req {docUrl, name, email}
   * @return {{ok:boolean, certNo?:string, docHash?:string, error?:string}}
   */
  function sign(req) {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    var tempDocId = null;
    try {
      Props.validate();
      var docId = DocumentService.extractDocId(req.docUrl);
      var certNo = newCertNo();
      var concludedAt = TimestampService.apply().time;
      var values = { name: req.name, email: req.email, date: today() };

      // 1) 署名済PDFを生成
      var built = DocumentService.buildSignedPdf(docId, values, { concludedAt: concludedAt, certNo: certNo });
      tempDocId = built.tempDocId;
      var docHash = computeHash(built.pdfBlob);
      var pdfName = '署名済_契約書_' + req.name + '_' + Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyyMMdd_HHmmss') + '.pdf';
      var pdfBlob = built.pdfBlob.copyBlob().setName(pdfName);

      // 2) 発行者のDriveに保管
      var savedId = '';
      try {
        var folder = DriveApp.getFolderById(Props.get('DRIVE_SIGNED_FOLDER_ID'));
        savedId = folder.createFile(pdfBlob.copyBlob().setName(pdfName)).getId();
      } catch (e) {
        Log.error('署名済PDFのDrive保管に失敗', { error: String(e) });
      }

      // 3) 締結証明・監査
      var certText = buildCertificate(values, { certNo: certNo, concludedAt: concludedAt, docHash: docHash, docUrl: req.docUrl });

      // 4) 発行者と署名者の両方へPDFメール送信
      NotificationService.sendSignedToBoth({
        name: req.name, signerEmail: req.email,
        certNo: certNo, concludedAt: concludedAt, docHash: docHash,
        pdfBlob: pdfBlob, certText: certText
      });

      AuditService.record({
        event: '締結完了', email: req.email, name: req.name,
        docUrl: req.docUrl, docHash: docHash, certNo: certNo, result: 'OK'
      });

      return { ok: true, certNo: certNo, docHash: docHash, savedId: savedId };
    } catch (err) {
      Log.error('署名確定失敗', { error: String(err) });
      AuditService.record({ event: '締結失敗', email: req && req.email, name: req && req.name, result: String(err) });
      return { ok: false, error: String(err) };
    } finally {
      if (tempDocId) DocumentService.trashTemp(tempDocId);
      lock.releaseLock();
    }
  }

  function buildCertificate(values, s) {
    return [
      '════════════ 合意締結証明書 ════════════',
      '締結証明書番号 : ' + s.certNo,
      '署名者         : ' + values.name + '（' + values.email + '）',
      '本人確認方式   : Googleアカウントによるサインイン',
      '締結日時       : ' + s.concludedAt,
      '対象ドキュメント : ' + s.docUrl,
      '文書ハッシュ   : SHA-256 = ' + s.docHash,
      '',
      '本証明書は、上記署名者がGoogleサインインにより本人確認を経て、',
      '当該文書へ電子的に同意・署名した事実を記録するものです。',
      '文書ハッシュにより署名後の非改ざん性を検証できます。',
      '══════════════════════════════════════'
    ].join('\n');
  }

  return { sign: sign, computeHash: computeHash, buildCertificate: buildCertificate };
})();

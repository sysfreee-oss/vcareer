/**
 * SignatureService.gs
 * 署名確定処理: ハッシュ算出 → 事業者署名(署名情報の刻印) → 締結証明書生成 →
 * 署名済PDFの保存 → ステータス更新 → 通知。
 *
 * 注意: GAS単体ではPKI電子署名(PAdES)やRFC3161タイムスタンプは付与できない。
 * 本実装は「メールOTPによる本人確認 + SHA-256ハッシュ + 監査証跡」で非改ざん性・締結事実を記録する。
 */
var SignatureService = (function () {
  function bytesToHex(bytes) {
    return bytes.map(function (b) {
      var v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? '0' + v : v;
    }).join('');
  }

  function computeHash(blob) {
    var digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256, blob.getBytes());
    return bytesToHex(digest);
  }

  function newCertNo() {
    return 'CERT-' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd') +
      '-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  }

  /**
   * 署名を確定する。
   * @param {number} rowIndex
   * @param {Object} meta {ip, ua}
   * @return {{ok:boolean, signedPdfId?:string, certNo?:string, error?:string}}
   */
  function sign(rowIndex, meta) {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var row = SheetService.getRow(rowIndex);
      if (row.status === CONFIG.STATUS.COMPLETED) {
        return { ok: true, signedPdfId: row.signedPdfId, certNo: row.certNo };
      }
      if (!row.docId) throw new Error('生成Docが見つかりません');

      var certNo = newCertNo();
      var ts = TimestampService.apply('');
      var concludedAt = ts.time;

      // 1) 署名情報をドキュメントへ刻印
      DocumentService.stampSignature(row.docId, {
        name: row.name,
        email: row.email,
        concludedAt: concludedAt,
        certNo: certNo,
        docHash: '(署名済PDF生成後に確定)',
        ip: meta.ip || '-'
      });

      // 2) 署名済PDFを生成・保存
      var fileName = '署名済_契約書_' + (row.name || '') + '_' + rowIndex;
      var signed = PdfService.exportToPdf(row.docId, Props.get('DRIVE_SIGNED_FOLDER_ID'), fileName);

      // 3) 署名済PDFのハッシュを算出(非改ざん性の証跡)
      var docHash = computeHash(signed.blob);

      // 4) 締結証明書PDFを生成しDrive保存
      var cert = buildCertificate(row, {
        certNo: certNo, concludedAt: concludedAt, docHash: docHash,
        ip: meta.ip, ua: meta.ua, tsType: ts.type
      });
      var certFileId = saveCertificate(cert.name, cert.text);
      Log.info('締結証明書PDFを保存', { rowIndex: rowIndex, certFileId: certFileId });

      // 5) 記録
      SheetService.update(rowIndex, CONFIG.STATUS.COMPLETED, {
        SIGNED_PDF_ID: signed.id,
        DOC_HASH: docHash,
        CONCLUDED_AT: concludedAt,
        SIGNER_IP: meta.ip || '',
        SIGNER_UA: meta.ua || '',
        CERT_NO: certNo
      });
      AuditService.record(rowIndex, {
        event: '締結完了', email: row.email, ip: meta.ip, ua: meta.ua,
        result: 'OK', docHash: docHash, certNo: certNo
      });

      // 6) 通知
      NotificationService.notifyCompleted(SheetService.getRow(rowIndex));

      return { ok: true, signedPdfId: signed.id, certNo: certNo, docHash: docHash };
    } catch (err) {
      Log.error('署名確定失敗', { rowIndex: rowIndex, error: String(err) });
      SheetService.setCell(rowIndex, CONFIG.COL.ERROR, String(err));
      return { ok: false, error: String(err) };
    } finally {
      lock.releaseLock();
    }
  }

  /** 締結証明書(合意締結証明)テキストを組み立てる。 */
  function buildCertificate(row, s) {
    var lines = [
      '════════════════ 合意締結証明書 ════════════════',
      '締結証明書番号 : ' + s.certNo,
      '契約種別       : ' + (row.type || '-'),
      '署名者         : ' + row.name + '（' + row.email + '）',
      '本人確認方式   : メールOTP認証（立会人型 / 事業者署名型）',
      '締結日時       : ' + s.concludedAt + '（時刻種別: ' + s.tsType + '）',
      '署名者IP       : ' + (s.ip || '-'),
      '署名者UA       : ' + (s.ua || '-'),
      '文書ハッシュ   : SHA-256 = ' + s.docHash,
      '',
      '本証明書は、上記署名者がメールOTPによる本人確認を経て、',
      '当該文書へ電子的に同意・署名した事実を記録するものです。',
      '文書ハッシュにより、署名後の非改ざん性を検証できます。',
      '════════════════════════════════════════════════'
    ];
    return {
      name: '締結証明書_' + s.certNo + '_' + (row.name || ''),
      text: lines.join('\n')
    };
  }

  /**
   * 締結証明書をPDFで生成し署名済フォルダへ保存する。
   * 一時ドキュメントを作成→PDF化→一時ドキュメントは破棄する。
   * @return {string} 保存したPDFファイルのID
   */
  function saveCertificate(name, text) {
    var folder = DriveApp.getFolderById(Props.get('DRIVE_SIGNED_FOLDER_ID'));
    var tmp = DocumentApp.create(name);
    var body = tmp.getBody();
    body.setText(text);
    // 罫線・ハッシュの桁揃えのため等幅フォントを適用
    body.editAsText().setFontFamily('Courier New').setFontSize(10);
    tmp.saveAndClose();

    var tmpFile = DriveApp.getFileById(tmp.getId());
    Utilities.sleep(500);
    var pdf = tmpFile.getAs('application/pdf').setName(name + '.pdf');
    var saved = folder.createFile(pdf);
    tmpFile.setTrashed(true); // 一時ドキュメントを破棄
    return saved.getId();
  }

  return { sign: sign, computeHash: computeHash, buildCertificate: buildCertificate };
})();

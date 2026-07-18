/**
 * NotificationService.gs
 * 締結完了時に、発行者と署名者の両方へ署名済PDFを添付してメール送信する。
 */
var NotificationService = (function () {
  /**
   * @param {Object} p {name, signerEmail, certNo, concludedAt, docHash, pdfBlob, certText}
   */
  function sendSignedToBoth(p) {
    var issuer = Props.get('ISSUER_EMAIL');
    var subject = '【締結完了】契約書 電子署名（' + p.name + ' 様）';
    var body = [
      '契約が締結されました。署名済の契約書PDFを添付します。', '',
      '署名者     : ' + p.name + '（' + p.signerEmail + '）',
      '締結日時   : ' + p.concludedAt,
      '証明書番号 : ' + p.certNo,
      '文書ハッシュ: ' + p.docHash, '',
      p.certText, '',
      '── 契約締結システム'
    ].join('\n');

    var attachments = [p.pdfBlob.copyBlob().setName('署名済契約書_' + p.name + '.pdf')];

    // 発行者へ
    GmailApp.sendEmail(issuer, subject, body, { name: '契約締結システム', attachments: attachments });
    // 署名者へ(入力メール宛)
    if (p.signerEmail && p.signerEmail.indexOf('@') !== -1) {
      GmailApp.sendEmail(p.signerEmail, subject,
        [p.name + ' 様', '', '電子署名ありがとうございました。締結済の契約書PDFを添付します。', '',
          '締結日時   : ' + p.concludedAt, '証明書番号 : ' + p.certNo, '',
          '── 契約締結システム'].join('\n'),
        { name: '契約締結システム', attachments: [p.pdfBlob.copyBlob().setName('署名済契約書_' + p.name + '.pdf')] });
    }
  }

  /** 任意: 発行者へのエラー通知。 */
  function notifyError(context, error) {
    try {
      GmailApp.sendEmail(Props.get('ISSUER_EMAIL', ''), '【エラー】契約署名処理に失敗',
        '内容: ' + context + '\nエラー: ' + String(error));
    } catch (e) { Log.error('エラー通知失敗', { error: String(e) }); }
  }

  return { sendSignedToBoth: sendSignedToBoth, notifyError: notifyError };
})();

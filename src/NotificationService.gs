/**
 * NotificationService.gs
 * GmailApp によるメール通知。署名依頼・OTP・締結完了・エラーを送信する。
 */
var NotificationService = (function () {
  function send(to, subject, body) {
    GmailApp.sendEmail(to, subject, body, { name: '契約締結システム' });
  }

  /** 相手方へ署名依頼(署名サイトのURL)を送る。 */
  function sendSigningInvite(row, url) {
    var body = [
      row.name + ' 様', '',
      '契約書の電子署名のお願いです。',
      '下記リンクを開き、メールで届く確認コードで本人確認のうえ、内容にご同意ください。', '',
      url, '',
      '※このリンクは ' + CONFIG.TOKEN_TTL_MIN / (60 * 24) + ' 日間有効です。',
      '心当たりがない場合はこのメールを破棄してください。', '',
      '契約締結システム'
    ].join('\n');
    send(row.email, '【要対応】契約書の電子署名のお願い', body);
  }

  /** 相手方へOTPを送る。 */
  function sendOtp(row, code) {
    var body = [
      row.name + ' 様', '',
      '電子署名の本人確認コードは以下の通りです。', '',
      '確認コード: ' + code, '',
      '有効期限は ' + CONFIG.OTP_TTL_MIN + ' 分です。第三者には教えないでください。', '',
      '契約締結システム'
    ].join('\n');
    send(row.email, '【確認コード】契約書 電子署名', body);
  }

  /** OTPロック時に担当者へ通知。 */
  function notifyOtpLocked(row) {
    send(Props.get('NOTIFY_EMAIL'),
      '【要確認】OTP試行上限に到達',
      '署名者: ' + row.name + '（' + row.email + '）\n行: ' + row.rowIndex +
      '\nOTP試行が上限に達しました。必要に応じ再発行してください。');
  }

  /** 締結完了を担当者へ通知(署名済PDFリンク付)。 */
  function notifyCompleted(row) {
    var link = row.signedPdfId ? DriveApp.getFileById(row.signedPdfId).getUrl() : '(なし)';
    send(Props.get('NOTIFY_EMAIL'),
      '【締結完了】' + row.name + ' 様',
      ['契約が締結されました。', '',
        '署名者   : ' + row.name + '（' + row.email + '）',
        '契約種別 : ' + (row.type || '-'),
        '締結日時 : ' + row.concludedAt,
        '証明書番号: ' + row.certNo,
        '文書ハッシュ: ' + row.docHash,
        '署名済PDF : ' + link].join('\n'));
  }

  /** エラーを担当者へ通知。 */
  function notifyError(row, error) {
    try {
      send(Props.get('NOTIFY_EMAIL'),
        '【エラー】契約処理に失敗',
        ['契約処理でエラーが発生しました。', '',
          '対象   : ' + (row && row.name || '-') + '（' + (row && row.email || '-') + '）',
          '行     : ' + (row && row.rowIndex || '-'),
          'エラー : ' + String(error)].join('\n'));
    } catch (e) {
      Log.error('エラー通知の送信に失敗', { error: String(e) });
    }
  }

  return {
    sendSigningInvite: sendSigningInvite,
    sendOtp: sendOtp,
    notifyOtpLocked: notifyOtpLocked,
    notifyCompleted: notifyCompleted,
    notifyError: notifyError
  };
})();

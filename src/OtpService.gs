/**
 * OtpService.gs
 * メールOTPによる本人確認。OTPは平文保存せず、ペッパー付きSHA-256ハッシュで保存する。
 */
var OtpService = (function () {
  function hash(code) {
    var pepper = Props.get('OTP_PEPPER');
    var bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256, pepper + ':' + code, Utilities.Charset.UTF_8);
    return bytesToHex(bytes);
  }

  function bytesToHex(bytes) {
    return bytes.map(function (b) {
      var v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? '0' + v : v;
    }).join('');
  }

  function generateCode() {
    var max = Math.pow(10, CONFIG.OTP_LENGTH);
    var n = Math.floor(Math.random() * max);
    return ('' + n).padStart(CONFIG.OTP_LENGTH, '0');
  }

  /** OTPを生成しハッシュ保存、相手方へメール送付。 */
  function send(rowIndex) {
    var row = SheetService.getRow(rowIndex);
    var code = generateCode();
    var expiry = new Date(Date.now() + CONFIG.OTP_TTL_MIN * 60 * 1000);
    SheetService.update(rowIndex, null, {
      OTP_HASH: hash(code),
      OTP_EXPIRY: expiry,
      OTP_ATTEMPTS: 0
    });
    NotificationService.sendOtp(row, code);
    AuditService.record(rowIndex, { event: 'OTP送信', email: row.email, result: 'OK' });
  }

  /**
   * OTPを検証する。
   * @return {{ok:boolean, reason?:string}}
   */
  function verify(rowIndex, code) {
    var row = SheetService.getRow(rowIndex);
    if (!row.otpHash) return { ok: false, reason: 'not_sent' };
    if (row.otpAttempts >= CONFIG.OTP_MAX_ATTEMPTS) return { ok: false, reason: 'locked' };

    var exp = row.otpExpiry ? new Date(row.otpExpiry) : null;
    if (exp && Date.now() > exp.getTime()) return { ok: false, reason: 'expired' };

    SheetService.setCell(rowIndex, CONFIG.COL.OTP_ATTEMPTS, row.otpAttempts + 1);

    if (hash(String(code || '').trim()) !== row.otpHash) {
      var remaining = CONFIG.OTP_MAX_ATTEMPTS - (row.otpAttempts + 1);
      AuditService.record(rowIndex, { event: 'OTP不一致', email: row.email, result: '残' + remaining });
      if (remaining <= 0) {
        NotificationService.notifyOtpLocked(row);
        return { ok: false, reason: 'locked' };
      }
      return { ok: false, reason: 'mismatch', remaining: remaining };
    }

    // 検証成功: OTPを無効化(再利用防止)
    SheetService.update(rowIndex, null, { OTP_HASH: '', OTP_EXPIRY: '' });
    AuditService.record(rowIndex, { event: 'OTP検証成功', email: row.email, result: 'OK' });
    return { ok: true };
  }

  return { send: send, verify: verify };
})();

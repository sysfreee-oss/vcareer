/**
 * TokenService.gs
 * 署名サイトの認可に使う単回・有効期限付きトークンを扱う。
 */
var TokenService = (function () {
  /** トークンを発行し行に記録、有効期限とともに返す。 */
  function issue(rowIndex) {
    var token = Utilities.getUuid();
    var expiry = new Date(Date.now() + CONFIG.TOKEN_TTL_MIN * 60 * 1000);
    SheetService.update(rowIndex, null, { TOKEN: token, TOKEN_EXPIRY: expiry });
    return { token: token, expiry: expiry };
  }

  /**
   * トークンを検証する。
   * @return {{ok:boolean, reason?:string, row?:Object}}
   */
  function verify(token) {
    var row = SheetService.findByToken(token);
    if (!row) return { ok: false, reason: 'invalid' };
    if (row.status === CONFIG.STATUS.COMPLETED) return { ok: false, reason: 'completed', row: row };
    var exp = row.tokenExpiry ? new Date(row.tokenExpiry) : null;
    if (exp && Date.now() > exp.getTime()) return { ok: false, reason: 'expired', row: row };
    return { ok: true, row: row };
  }

  /** 署名URLを生成する。WEBAPP_BASE_URL 未設定時は実行中サービスのURLを使う。 */
  function buildSigningUrl(token) {
    var base = Props.get('WEBAPP_BASE_URL', '');
    if (!base) {
      base = ScriptApp.getService().getUrl();
    }
    var sep = base.indexOf('?') === -1 ? '?' : '&';
    return base + sep + 'token=' + encodeURIComponent(token);
  }

  return { issue: issue, verify: verify, buildSigningUrl: buildSigningUrl };
})();

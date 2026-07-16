/**
 * WebApp.gs
 * 独立署名サイト。GASウェブアプリの doGet / doPost ルーティング。
 *
 * フロー: doGet(token検証) → [OTP送信] → [OTP検証] → [内容確認&同意] → 締結完了
 * OTP検証の成否はサーバ側(CacheService)で保持し、署名確定前に再確認する。
 */

function doGet(e) {
  try {
    var token = (e && e.parameter && e.parameter.token) || '';
    var v = TokenService.verify(token);
    if (!v.ok) return renderError(reasonMessage(v.reason));
    return renderSigning('otp_request', token, { name: v.row.name, email: maskEmail(v.row.email) });
  } catch (err) {
    Log.error('doGet 失敗', { error: String(err) });
    return renderError('システムエラーが発生しました。担当者へお問い合わせください。');
  }
}

function doPost(e) {
  var token = (e && e.parameter && e.parameter.token) || '';
  var action = (e && e.parameter && e.parameter.action) || '';
  try {
    var v = TokenService.verify(token);
    if (!v.ok) return renderError(reasonMessage(v.reason));
    var row = v.row;

    if (action === 'requestOtp') {
      OtpService.send(row.rowIndex);
      return renderSigning('otp_input', token, { name: row.name, email: maskEmail(row.email) });
    }

    if (action === 'verifyOtp') {
      var code = e.parameter.otp || '';
      var res = OtpService.verify(row.rowIndex, code);
      if (res.ok) {
        setVerified(token);
        var text = DocumentService.getPlainText(row.docId);
        return renderSigning('consent', token, { name: row.name, contractText: text });
      }
      var msg = res.reason === 'locked' ? '試行回数の上限に達しました。担当者へ再発行を依頼してください。'
        : res.reason === 'expired' ? 'OTPの有効期限が切れました。再送してください。'
        : 'コードが一致しません。残り' + (res.remaining != null ? res.remaining : '') + '回です。';
      return renderSigning('otp_input', token, { name: row.name, email: maskEmail(row.email), error: msg });
    }

    if (action === 'sign') {
      if (!isVerified(token)) return renderError('本人確認が完了していません。最初からやり直してください。');
      if (e.parameter.agree !== 'on') {
        var text2 = DocumentService.getPlainText(row.docId);
        return renderSigning('consent', token, { name: row.name, contractText: text2, error: '「内容に同意します」にチェックしてください。' });
      }
      var meta = { ip: '-', ua: e.parameter.ua || '-' }; // GAS制約によりIPはサーバ側で取得不可
      var r = SignatureService.sign(row.rowIndex, meta);
      clearVerified(token);
      if (!r.ok) return renderError('署名処理に失敗しました: ' + r.error);
      return renderCompleted({ name: row.name, certNo: r.certNo, docHash: r.docHash });
    }

    return renderError('不正なリクエストです。');
  } catch (err) {
    Log.error('doPost 失敗', { action: action, error: String(err) });
    return renderError('システムエラーが発生しました。担当者へお問い合わせください。');
  }
}

/* ---------- 本人確認セッション(CacheService) ---------- */
function setVerified(token) {
  CacheService.getScriptCache().put('verified:' + token, '1', 900); // 15分
}
function isVerified(token) {
  return CacheService.getScriptCache().get('verified:' + token) === '1';
}
function clearVerified(token) {
  CacheService.getScriptCache().remove('verified:' + token);
}

/* ---------- 描画 ---------- */
function renderSigning(step, token, data) {
  var t = HtmlService.createTemplateFromFile('html/SigningPage');
  t.step = step;
  t.token = token;
  t.actionUrl = ScriptApp.getService().getUrl();
  t.data = data || {};
  return page(t.evaluate(), '契約書 電子署名');
}
function renderCompleted(data) {
  var t = HtmlService.createTemplateFromFile('html/Completed');
  t.data = data || {};
  return page(t.evaluate(), '締結完了');
}
function renderError(message) {
  var t = HtmlService.createTemplateFromFile('html/Error');
  t.message = message || 'エラーが発生しました。';
  return page(t.evaluate(), 'エラー');
}
function page(htmlOutput, title) {
  return htmlOutput.setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ---------- ユーティリティ ---------- */
function reasonMessage(reason) {
  switch (reason) {
    case 'invalid': return 'この署名リンクは無効です。担当者へお問い合わせください。';
    case 'expired': return 'この署名リンクは有効期限が切れています。担当者へ再発行を依頼してください。';
    case 'completed': return 'この契約はすでに締結済みです。';
    default: return 'この署名リンクは利用できません。';
  }
}
function maskEmail(email) {
  email = String(email || '');
  var at = email.indexOf('@');
  if (at <= 1) return email;
  return email[0] + '***' + email.slice(at - 1);
}

/** テンプレートからの部分読込用(必要に応じHTMLで include()）。 */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

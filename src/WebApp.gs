/**
 * WebApp.gs
 * 署名サイト(ウェブアプリ)。ご指定フロー:
 *   Googleサインイン → ドキュメントURL+氏名入力 → 電子署名 → 発行者と署名者へPDFメール送信
 *
 * デプロイ設定:
 *   実行するユーザー : 自分
 *   アクセスできるユーザー : Googleアカウントを持つ全員   ← これによりサインイン必須になる
 */

function doGet(e) {
  try {
    var email = safeActiveEmail();
    var prefillDoc = (e && e.parameter && e.parameter.doc) ? e.parameter.doc : '';
    return renderSigning({ signerEmail: email, docUrl: prefillDoc, error: '' });
  } catch (err) {
    Log.error('doGet 失敗', { error: String(err) });
    return renderError('システムエラーが発生しました。担当者へお問い合わせください。');
  }
}

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action !== 'sign') return renderError('不正なリクエストです。');

    var docUrl = String(p.docUrl || '').trim();
    var name = String(p.name || '').trim();
    var email = String(p.email || safeActiveEmail() || '').trim();

    // 入力検証
    if (!docUrl) return renderSigning(model(p, '契約書ドキュメントのURLを入力してください。'));
    if (!/[-\w]{25,}/.test(docUrl)) return renderSigning(model(p, '有効なGoogleドキュメントのURLを入力してください。'));
    if (!name) return renderSigning(model(p, 'お名前を入力してください。'));
    if (!email || email.indexOf('@') === -1) return renderSigning(model(p, 'メールアドレスを入力してください。'));
    if (p.agree !== 'on') return renderSigning(model(p, '「内容に同意します」にチェックしてください。'));

    var r = SignatureService.sign({ docUrl: docUrl, name: name, email: email });
    if (!r.ok) return renderError('署名処理に失敗しました: ' + r.error);
    return renderCompleted({ name: name, email: email, certNo: r.certNo, docHash: r.docHash });
  } catch (err) {
    Log.error('doPost 失敗', { error: String(err) });
    return renderError('システムエラーが発生しました。担当者へお問い合わせください。');
  }
}

/* ---------- helpers ---------- */
function safeActiveEmail() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}
function model(p, error) {
  return { signerEmail: String(p.email || safeActiveEmail() || ''), docUrl: String(p.docUrl || ''), name: String(p.name || ''), error: error };
}

/* ---------- render ---------- */
function renderSigning(data) {
  var t = HtmlService.createTemplateFromFile('html/SigningPage');
  t.data = data || {};
  t.actionUrl = ScriptApp.getService().getUrl();
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
function page(out, title) {
  return out.setTitle(title).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

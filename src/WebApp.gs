/**
 * WebApp.gs
 * 署名サイト(ウェブアプリ)。ご指定フロー:
 *   Googleサインイン → ドキュメントURL+氏名入力 → 契約本文を確認 → 電子署名 → 発行者と署名者へPDFメール送信
 *
 * デプロイ設定:
 *   実行するユーザー : 自分
 *   アクセスできるユーザー : Googleアカウントを持つ全員   ← これによりサインイン必須になる
 */

function doGet(e) {
  try {
    var prefillDoc = (e && e.parameter && e.parameter.doc) ? e.parameter.doc : '';
    return renderSigning({ step: 'input', signerEmail: safeActiveEmail(), docUrl: prefillDoc, name: '', contractText: '', error: '' });
  } catch (err) {
    Log.error('doGet 失敗', { error: String(err) });
    return renderError('システムエラーが発生しました。担当者へお問い合わせください。');
  }
}

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};
    var action = p.action || '';

    // 入力に戻る
    if (action === 'edit') {
      return renderSigning(model(p, 'input', ''));
    }

    // 共通の入力検証(URL/氏名/メール)
    var err = validateInputs(p);
    if (err) return renderSigning(model(p, 'input', err));

    var docId = DocumentService.extractDocId(p.docUrl);

    // 内容確認(プレビュー)
    if (action === 'preview') {
      var text = DocumentService.getPreviewText(docId, {
        name: String(p.name).trim(),
        email: String(p.email || safeActiveEmail()).trim(),
        date: Utilities.formatDate(new Date(), CONFIG.TZ, CONFIG.DATE_FMT)
      });
      var m = model(p, 'review', '');
      m.contractText = text;
      return renderSigning(m);
    }

    // 署名確定
    if (action === 'sign') {
      if (p.agree !== 'on') {
        var text2 = DocumentService.getPreviewText(docId, {
          name: String(p.name).trim(),
          email: String(p.email || safeActiveEmail()).trim(),
          date: Utilities.formatDate(new Date(), CONFIG.TZ, CONFIG.DATE_FMT)
        });
        var mm = model(p, 'review', '「内容に同意します」にチェックしてください。');
        mm.contractText = text2;
        return renderSigning(mm);
      }
      var r = SignatureService.sign({
        docUrl: String(p.docUrl).trim(),
        name: String(p.name).trim(),
        email: String(p.email || safeActiveEmail()).trim()
      });
      if (!r.ok) return renderError('署名処理に失敗しました: ' + r.error);
      return renderCompleted({ name: String(p.name).trim(), certNo: r.certNo, docHash: r.docHash });
    }

    return renderError('不正なリクエストです。');
  } catch (err) {
    Log.error('doPost 失敗', { error: String(err) });
    return renderError('システムエラーが発生しました。担当者へお問い合わせください。');
  }
}

/* ---------- 検証 ---------- */
function validateInputs(p) {
  var docUrl = String(p.docUrl || '').trim();
  var name = String(p.name || '').trim();
  var email = String(p.email || safeActiveEmail() || '').trim();
  if (!docUrl) return '契約書ドキュメントのURLを入力してください。';
  if (!/[-\w]{25,}/.test(docUrl)) return '有効なGoogleドキュメントのURLを入力してください。';
  if (!name) return 'お名前を入力してください。';
  if (!email || email.indexOf('@') === -1) return 'メールアドレスを入力してください。';
  return '';
}

/* ---------- helpers ---------- */
function safeActiveEmail() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}
function model(p, step, error) {
  return {
    step: step,
    signerEmail: String(p.email || safeActiveEmail() || ''),
    docUrl: String(p.docUrl || ''),
    name: String(p.name || ''),
    contractText: '',
    error: error || ''
  };
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

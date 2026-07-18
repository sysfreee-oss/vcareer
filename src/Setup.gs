/**
 * Setup.gs
 * 初期セットアップ・動作確認用。Apps Scriptエディタから手動実行する。
 */

/** 必須スクリプトプロパティの検証。 */
function checkProperties() {
  Props.validate();
  Log.info('必須プロパティは揃っています', { required: Props.REQUIRED });
}

/**
 * スモークテスト: 指定のドキュメントURLで署名処理を1回実行する。
 * 実行前に docUrl / name / email を自分の値に書き換えること。
 */
function smokeTest_sign() {
  var r = SignatureService.sign({
    docUrl: 'https://docs.google.com/document/d/<テスト用ドキュメントID>/edit',
    name: 'テスト太郎',
    email: Session.getActiveUser().getEmail() || 'test@example.com'
  });
  Log.info('smokeTest_sign 結果', r);
}

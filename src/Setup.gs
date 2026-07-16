/**
 * Setup.gs
 * 初期セットアップ用の関数群。Apps Scriptエディタから手動で1回ずつ実行する。
 */

/** 回答シートのヘッダ行を初期化する(既存データがある場合はヘッダのみ上書き)。 */
function setupSheetHeaders() {
  var sh = SheetService.responseSheet();
  sh.getRange(1, 1, 1, CONFIG.HEADERS.length).setValues([CONFIG.HEADERS]);
  sh.setFrozenRows(1);
  Log.info('ヘッダを初期化しました');
}

/** フォーム送信トリガー(インストーラブル)を登録する。 */
function installFormTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // 重複登録を避ける
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onFormSubmit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();
  Log.info('onFormSubmit トリガーを登録しました');
}

/** エラー行の再処理トリガー(15分毎)を登録する。 */
function installReprocessTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'reprocessFailedRows') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('reprocessFailedRows')
    .timeBased()
    .everyMinutes(15)
    .create();
  Log.info('reprocessFailedRows トリガーを登録しました');
}

/** 必須スクリプトプロパティの検証。 */
function checkProperties() {
  Props.validate();
  Log.info('必須プロパティは揃っています');
}

/**
 * スモークテスト用: 指定行の生成〜署名依頼を手動実行する。
 * 実行前に対象行(rowIndex)を書き換えること。
 */
function smokeTest_generateInviteRow2() {
  generateAndInvite(2);
}

/**
 * 一括初期化(ヘッダ→プロパティ確認→トリガー登録)。
 * 事前にスクリプトプロパティを設定しておくこと。
 */
function setupAll() {
  setupSheetHeaders();
  checkProperties();
  installFormTrigger();
  installReprocessTrigger();
  Log.info('セットアップ完了');
}

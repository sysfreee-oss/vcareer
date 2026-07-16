/**
 * RetryService.gs
 * 指数バックオフ付きリトライと、エラー行の再処理(時間主導トリガー)。
 */
var RetryService = (function () {
  /**
   * fn を最大 CONFIG.RETRY_MAX 回まで再試行する。
   * @param {Function} fn
   * @param {Object=} options {max, baseMs}
   */
  function withRetry(fn, options) {
    options = options || {};
    var max = options.max || CONFIG.RETRY_MAX;
    var base = options.baseMs || CONFIG.RETRY_BASE_MS;
    var lastErr;
    for (var i = 0; i < max; i++) {
      try {
        return fn();
      } catch (e) {
        lastErr = e;
        Log.info('リトライ ' + (i + 1) + '/' + max, { error: String(e) });
        if (i < max - 1) Utilities.sleep(base * Math.pow(2, i));
      }
    }
    throw lastErr;
  }

  /** 時間主導トリガーから実行: エラー行(上限未満)を再処理する。 */
  function reprocessFailedRows() {
    var rows = SheetService.findErrorRows();
    rows.forEach(function (row) {
      try {
        SheetService.incrementRetry(row.rowIndex);
        generateAndInvite(row.rowIndex);
      } catch (e) {
        Log.error('再処理失敗', { rowIndex: row.rowIndex, error: String(e) });
        if (row.retry + 1 >= CONFIG.REPROCESS_MAX) {
          SheetService.update(row.rowIndex, CONFIG.STATUS.NEEDS_MANUAL);
          NotificationService.notifyError(row, new Error('再処理上限に到達'));
        }
      }
    });
  }

  return { withRetry: withRetry, reprocessFailedRows: reprocessFailedRows };
})();

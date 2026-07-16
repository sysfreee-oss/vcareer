/**
 * TimestampService.gs
 * 認定タイムスタンプ(TSA)付与の差し込み口。
 * 当面はサーバ時刻を返すスタブ。将来、総務大臣認定のTSA(RFC3161)連携に差し替える。
 */
var TimestampService = (function () {
  /**
   * @param {string} docHash 対象文書のSHA-256(hex)
   * @return {{type:string, time:string, token?:string}}
   */
  function apply(docHash) {
    // --- 将来のTSA連携ポイント ---
    // var endpoint = Props.get('TSA_ENDPOINT', '');
    // if (endpoint) {
    //   var res = UrlFetchApp.fetch(endpoint, { ... RFC3161要求 ... });
    //   return { type: 'RFC3161', time: ..., token: ... };
    // }
    return {
      type: 'SERVER_TIME',
      time: Utilities.formatDate(new Date(), 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX")
    };
  }

  return { apply: apply };
})();

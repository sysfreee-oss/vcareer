/**
 * PdfService.gs
 * GoogleドキュメントをPDF化し、Driveの指定フォルダへ保存する。
 */
var PdfService = (function () {
  /**
   * @param {string} docId
   * @param {string} folderId 保存先フォルダID
   * @param {string} fileName
   * @return {{id:string, blob:Blob}}
   */
  function exportToPdf(docId, folderId, fileName) {
    // ドキュメントの変更を確実に反映させる
    Utilities.sleep(500);
    var blob = DriveApp.getFileById(docId).getAs('application/pdf');
    blob.setName(fileName + '.pdf');
    var folder = DriveApp.getFolderById(folderId);
    var file = folder.createFile(blob);
    return { id: file.getId(), blob: file.getBlob() };
  }

  return { exportToPdf: exportToPdf };
})();

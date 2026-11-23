/* قصقصه — saving the parts: share sheet on the phone, direct download / folder / ZIP on the laptop. */
'use strict';
(function () {
  function canShareFiles(files) {
    try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files })); } catch (e) { return false; }
  }
  function download(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
  }
  const canFolder = () => typeof window.showDirectoryPicker === 'function';
  /** Writes every file into a folder the user picks. Returns how many were written. */
  async function toFolder(files) {
    const dir = await window.showDirectoryPicker({ mode: 'readwrite', id: 'qasqasa' });
    let n = 0;
    for (const f of files) {
      const fh = await dir.getFileHandle(f.name, { create: true });
      const w = await fh.createWritable();
      await f.stream().pipeTo(w);
      n += 1;
    }
    return n;
  }
  async function zip(files, name, onProgress) {
    const blob = await window.QZip.makeZip(files, onProgress);
    download(new File([blob], name, { type: 'application/zip' }));
  }
  window.QSave = { canShareFiles, download, canFolder, toFolder, zip };
})();

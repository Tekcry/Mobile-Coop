/** Hand a file to the player: the share sheet on mobile (Files, Drive, Mail), else a download. */
export function shareOrDownload(blob: Blob, name: string, title: string): void {
  const file = typeof File !== 'undefined' ? new File([blob], name, { type: blob.type }) : null;
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (file && nav.canShare?.({ files: [file] })) {
    void nav.share({ files: [file], title }).catch(() => download(blob, name));
  } else {
    download(blob, name);
  }
}

export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
